// app/api/participants/upsert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getParticipants, setParticipants } from '@/lib/storage';

export async function POST(req: NextRequest) {
  // Read the signed NextAuth JWT from cookies (server-side)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, optIn = true } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  const email =
    (token as any).email ??
    (token as any).sub ??
    '';
  const name = ((token as any).name as string | undefined) ?? email;
  const provider = (token as any).provider as 'google' | 'azure-ad' | undefined;
  const access_token = (token as any).accessToken as string | undefined;
  const refresh_token = (token as any).refreshToken as string | undefined;
  const expires_at = (token as any).expiresAt as number | undefined;

  if (!email || !provider || !access_token) {
    return NextResponse.json({ error: 'missing session fields' }, { status: 400 });
  }

  // Upsert this user into participants:{id}
  const current = await getParticipants(id);
  const next = current.filter(
    p => (p.email || '').toLowerCase() !== email.toLowerCase()
  );

  next.push({
    name,
    email,
    provider, // 'google' | 'azure-ad'
    oauth: { access_token, refresh_token, expires_at },
    optedInForAutoSync: Boolean(optIn),
  });

  await setParticipants(id, next);
  return NextResponse.json({ ok: true, count: next.length });
}
