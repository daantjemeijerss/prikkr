import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

// (Optional) Warn if something important is missing in the env (helps on Prod)
[
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  // AZURE vars can be missing locally if you only test Google; that's fine.
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
].forEach((k) => {
  if (!process.env[k]) console.warn(`[env] Missing ${k}`);
});

// Use 'consumers' by default for personal Microsoft accounts (Outlook/Live)
const TENANT = process.env.AZURE_AD_TENANT_ID ?? 'consumers';

// Fallback: derive expiry from access token if provider didn't pass expires_in
function deriveExpiresAtFromAccessToken(at?: string) {
  try {
    if (!at) return undefined;
    const [, payload] = at.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (typeof claims.exp === 'number') return claims.exp * 1000; // ms
  } catch {
    /* noop */
  }
  return undefined;
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
      tenantId: TENANT, // <- critical for personal accounts
      authorization: {
        params: {
          scope: 'openid profile email offline_access User.Read Calendars.Read',
          // If you need to force a fresh consent once on prod:
          // prompt: 'consent',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // On sign-in: stash provider, tokens and expiry
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
        // derive on subsequent runs if still missing
        token.expiresAt = deriveExpiresAtFromAccessToken(token.accessToken);
      }

      // Debug breadcrumb (server-side; visible in Vercel function logs)
      console.log('🔁 Azure check:', { provider: token.provider, exp: token.expiresAt });

      // Refresh Azure token if expiring soon
      if (
        token.provider === 'azure-ad' &&
        typeof token.expiresAt === 'number' &&
        Date.now() > token.expiresAt - 60_000 &&
        typeof token.refreshToken === 'string' &&
        token.refreshToken.length > 0
      ) {
        console.log('🔁 Attempting Azure token refresh…');
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
            console.error('🔁 Azure refresh failed:', resp.status, await resp.text());
          }
        } catch (e) {
          console.error('🔁 Azure refresh error:', e);
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
