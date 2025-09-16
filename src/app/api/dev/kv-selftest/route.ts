import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const key = 'kv:selftest';
    await kv.set(key, { ok: true, at: Date.now() });
    const val = await kv.get(key);
    return NextResponse.json({ ok: true, val });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
