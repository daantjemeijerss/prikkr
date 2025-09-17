import { NextRequest, NextResponse } from 'next/server';
import { upsertParticipant } from '@/lib/storage';

export const runtime = 'nodejs';       // avoid Edge limits during local dev
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const {
      id,
      name,
      email,
      provider,          // 'google' | 'azure-ad'
      access_token,
      refresh_token,
      expires_at,
      optIn = true,
    } = await req.json();

    if (!id || !email || !provider || !access_token) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    await upsertParticipant(id, {
      name,
      email,
      provider: provider as 'google' | 'azure-ad',
      oauth: { access_token, refresh_token, expires_at },
      optedInForAutoSync: Boolean(optIn),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('seed-participant error:', e);
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
