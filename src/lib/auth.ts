// lib/auth.ts
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

// Default to 'consumers' for personal Microsoft accounts (Outlook/Live).
const TENANT = process.env.AZURE_AD_TENANT_ID ?? 'consumers';

// Derive expiry from access token if the provider doesn't return expires_in.
function deriveExpiresAtFromAccessToken(at?: string) {
  try {
    if (!at) return;
    const [, payload] = at.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (typeof claims.exp === 'number') return claims.exp * 1000; // ms
  } catch {}
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Ask Google for offline access so you'll get a refresh_token at least once
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: TENANT,
      authorization: {
        params: {
          scope:
            'openid profile email offline_access User.Read Calendars.Read',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // On sign-in: capture provider, tokens, expiry
      if (account) {
        if (account.provider === 'google' || account.provider === 'azure-ad') {
          (token as any).provider = account.provider;
        }
        if (typeof account.access_token === 'string')
          (token as any).accessToken = account.access_token;
        if (typeof account.refresh_token === 'string')
          (token as any).refreshToken = account.refresh_token;
        if (typeof account.expires_in === 'number') {
          (token as any).expiresAt = Date.now() + account.expires_in * 1000;
        } else if (!(token as any).expiresAt && typeof account.access_token === 'string') {
          (token as any).expiresAt = deriveExpiresAtFromAccessToken(
            account.access_token
          );
        }
      } else if (!(token as any).expiresAt && typeof (token as any).accessToken === 'string') {
        (token as any).expiresAt = deriveExpiresAtFromAccessToken(
          (token as any).accessToken
        );
      }

      // Refresh Azure token ~1 minute before expiry (Google refresh handled on next login or your own flow)
      if (
        (token as any).provider === 'azure-ad' &&
        typeof (token as any).expiresAt === 'number' &&
        Date.now() > (token as any).expiresAt - 60_000 &&
        typeof (token as any).refreshToken === 'string' &&
        (token as any).refreshToken.length > 0
      ) {
        try {
          const body = new URLSearchParams({
            client_id: process.env.AZURE_AD_CLIENT_ID!,
            client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: (token as any).refreshToken,
            scope:
              'openid profile email offline_access User.Read Calendars.Read',
          });

          const resp = await fetch(
            `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body,
            }
          );

          if (resp.ok) {
            const data = await resp.json();
            if (typeof data.access_token === 'string')
              (token as any).accessToken = data.access_token;
            if (typeof data.refresh_token === 'string')
              (token as any).refreshToken = data.refresh_token;
            if (typeof data.expires_in === 'number') {
              (token as any).expiresAt = Date.now() + data.expires_in * 1000;
            } else if (!(token as any).expiresAt && typeof data.access_token === 'string') {
              (token as any).expiresAt = deriveExpiresAtFromAccessToken(
                data.access_token
              );
            }
          } else {
            // swallow on prod; NextAuth will retry on next request
          }
        } catch {
          // swallow on prod
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (typeof (token as any).accessToken === 'string') {
        (session as any).accessToken = (token as any).accessToken;
      }
      if ((token as any).provider === 'google' || (token as any).provider === 'azure-ad') {
        (session as any).provider = (token as any).provider;
      }
      return session;
    },
  },
};
