import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
     provider?: 'google' | 'azure-ad';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: 'google' | 'azure-ad';
    provider?: string;
  }
}

export {};
