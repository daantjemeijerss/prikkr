// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

// Optional: warn if a required env is missing (helps on Vercel Prod)
['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'AZURE_AD_CLIENT_ID', 'AZURE_AD_CLIENT_SECRET', 'AZURE_AD_TENANT_ID', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
  .forEach(k => { if (!process.env[k]) console.warn(`[env] Missing ${k}`); });

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
      tenantId: process.env.AZURE_AD_TENANT_ID || 'common', // prefer real GUID in Prod
      authorization: {
        params: {
          scope: 'openid profile email offline_access User.Read Calendars.Read',
          // If you need to force a fresh consent once on Prod, uncomment next line, deploy, sign in once, then remove again:
          // prompt: 'consent',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // On first sign-in: stash provider + tokens + expiry
      if (account) {
        if (account.provider === 'google' || account.provider === 'azure-ad') {
          token.provider = account.provider;
        }
        if (typeof account.access_token === 'string') token.accessToken = account.access_token;
        if (typeof account.refresh_token === 'string') token.refreshToken = account.refresh_token;
        if (typeof account.expires_in === 'number') {
          token.expiresAt = Date.now() + account.expires_in * 1000;
        }
      }

      // Debug: see what we have at runtime on the server
      console.log('🔁 Azure check:', { provider: token.provider, exp: token.expiresAt });

      // Refresh Azure token if expiring (1 min early)
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
            refresh_token: token.refreshToken, // guaranteed string by guard above
            scope: 'openid profile email offline_access User.Read Calendars.Read',
          });

          const tenant = process.env.AZURE_AD_TENANT_ID || 'common';
          const resp = await fetch(
            `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
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
