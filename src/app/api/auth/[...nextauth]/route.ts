import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

// Default to 'consumers' for personal Microsoft accounts (Outlook/Live).
// Leave AZURE_AD_TENANT_ID unset in Prod unless you truly need an Entra tenant GUID.
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

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
        },
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: TENANT,
      authorization: {
        params: {
          scope: 'openid profile email offline_access User.Read Calendars.Read',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // On sign-in: capture provider, tokens, expiry
      if (account) {
        if (account.provider === 'google' || account.provider === 'azure-ad') {
          token.provider = account.provider;
        }
        if (typeof account.access_token === 'string') token.accessToken = account.access_token;
        if (typeof account.refresh_token === 'string') token.refreshToken = account.refresh_token;
        if (typeof account.expires_in === 'number') {
          token.expiresAt = Date.now() + account.expires_in * 1000;
        } else if (!token.expiresAt && typeof account.access_token === 'string') {
          token.expiresAt = deriveExpiresAtFromAccessToken(account.access_token);
        }
      } else if (!token.expiresAt && typeof token.accessToken === 'string') {
        token.expiresAt = deriveExpiresAtFromAccessToken(token.accessToken);
      }

      // Refresh Azure token a minute before expiry
      if (
        token.provider === 'azure-ad' &&
        typeof token.expiresAt === 'number' &&
        Date.now() > token.expiresAt - 60_000 &&
        typeof token.refreshToken === 'string' &&
        token.refreshToken.length > 0
      ) {
        try {
          const body = new URLSearchParams({
            client_id: process.env.AZURE_AD_CLIENT_ID!,
            client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
            scope: 'openid profile email offline_access User.Read Calendars.Read',
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
            if (typeof data.access_token === 'string') token.accessToken = data.access_token;
            if (typeof data.refresh_token === 'string') token.refreshToken = data.refresh_token;
            if (typeof data.expires_in === 'number') {
              token.expiresAt = Date.now() + data.expires_in * 1000;
            } else if (!token.expiresAt && typeof data.access_token === 'string') {
              token.expiresAt = deriveExpiresAtFromAccessToken(data.access_token);
            }
          } else {
            // optional: swallow on prod; NextAuth will try again next request
          }
        } catch {
          // optional: swallow on prod
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (typeof token.accessToken === 'string') {
        (session as any).accessToken = token.accessToken;
      }
      if (token.provider === 'google' || token.provider === 'azure-ad') {
        (session as any).provider = token.provider;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
