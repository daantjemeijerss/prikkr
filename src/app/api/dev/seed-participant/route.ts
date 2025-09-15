import { NextRequest, NextResponse } from 'next/server';
import { getParticipants, setParticipants } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const { id, name, email, provider, access_token } = await req.json();

  if (!id || !email || !provider || !access_token) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const current = await getParticipants(id);
  const next = current.filter(
    p => (p.email || '').toLowerCase() !== (email as string).toLowerCase()
  );
  next.push({
    name,
    email,
    provider, // 'google' | 'azure-ad'
    oauth: { access_token },
    optedInForAutoSync: true,
  });
  await setParticipants(id, next);

  return NextResponse.json({ ok: true, count: next.length });
}
