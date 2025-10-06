import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { upsertParticipant } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, optIn = true } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  const email = (token as any).email ?? (token as any).sub ?? '';
  const name = ((token as any).name as string | undefined) ?? email;
  const provider = (token as any).provider as 'google' | 'azure-ad' | undefined;
  const access_token = (token as any).accessToken as string | undefined;
  const refresh_token = (token as any).refreshToken as string | undefined;
  const expires_at = (token as any).expiresAt as number | undefined;

  if (!email || !provider || !access_token) {
    return NextResponse.json({ error: 'missing session fields' }, { status: 400 });
  }

  await upsertParticipant(id, {
    name,
    email,
    provider,
    oauth: { access_token, refresh_token, expires_at },
    optedInForAutoSync: Boolean(optIn),
  });

  return NextResponse.json({ ok: true });
}
