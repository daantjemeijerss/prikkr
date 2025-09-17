import { NextRequest, NextResponse } from 'next/server';
import { getMeta, upsertMeta } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });
    }

    const meta = await getMeta(id);
    if (!meta) {
      return NextResponse.json({ ok: false, error: 'no meta' }, { status: 404 });
    }

    // Throttle writes so we don’t hammer KV when a page re-renders
    const now = Date.now();
    const last = (meta as any)._lastTouchMs ? Number((meta as any)._lastTouchMs) : 0;
    if (now - last < 20_000) {
      return NextResponse.json({ ok: true, skipped: 'recent' });
    }

    const iso = new Date(now).toISOString();
    const next = await upsertMeta(id, {
      lastViewedAt: iso,
      updatedAt: iso,
      status: (status as any) ?? (meta as any).status ?? 'collecting',
      _lastTouchMs: now,
    });

    return NextResponse.json({ ok: true, touched: iso, status: next.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
