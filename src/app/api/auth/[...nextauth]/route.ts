import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

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
  tenantId: process.env.AZURE_AD_TENANT_ID!,
  authorization: {
    params: {
      scope: 'openid profile email Calendars.Read offline_access User.Read',
    },
  },
}),

  ],

callbacks: {
  async jwt({ token, account }) {
    // On initial sign-in, stash provider + tokens + expiry
    if (account) {
      if (account.provider === 'google' || account.provider === 'azure-ad') {
        token.provider = account.provider; // ✅ union-safe
      }
      if (typeof account.access_token === 'string') {
        token.accessToken = account.access_token;
      }
      if (typeof account.refresh_token === 'string') {
        token.refreshToken = account.refresh_token;
      }
      if (typeof account.expires_in === 'number') {
        token.expiresAt = Date.now() + account.expires_in * 1000;
      }
    }

    // 🔁 REFRESH BLOCK — keep this inside jwt(), after the sign-in section and before 'return token'
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
          refresh_token: token.refreshToken, // guaranteed string by the guard
          scope: 'openid profile email offline_access User.Read Calendars.Read',
        });

        const resp = await fetch(
          `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
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
          if (typeof data.expires_in === 'number') token.expiresAt = Date.now() + data.expires_in * 1000;
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
      (session as any).provider = token.provider; // ✅ union-safe
    }
    return session;
  },
},



});

export { handler as GET, handler as POST };
