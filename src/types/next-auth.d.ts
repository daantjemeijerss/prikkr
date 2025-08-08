// src/types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken: string;
    provider: 'google' | 'azure-ad';
  }

  interface User {
    accessToken: string;
    provider: 'google' | 'azure-ad';
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    provider: 'google' | 'azure-ad';
  }
}
