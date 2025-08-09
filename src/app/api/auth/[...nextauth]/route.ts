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
    if (typeof account?.access_token === 'string') {
      token.accessToken = account.access_token;
    }
    const p = account?.provider;
    if (p === 'google' || p === 'azure-ad') {
      token.provider = p;
    }
    return token;
  },
  async session({ session, token }) {
    if (typeof token.accessToken === 'string') {
      session.accessToken = token.accessToken;
    }
    const p = token.provider;
    if (p === 'google' || p === 'azure-ad') {
      session.provider = p;
    }
    return session;
  },
}


});

export { handler as GET, handler as POST };
