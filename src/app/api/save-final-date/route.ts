import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  const { id, date, time } = await req.json();

  if (!id || !date || !time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const raw = await kv.get(`meta:${id}`);

    if (!raw) {
      return NextResponse.json({ error: 'Event ID not found' }, { status: 404 });
    }

    const meta = raw as Record<string, any>;
    meta.finalSelection = { date, time };

    await kv.set(`meta:${id}`, meta);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving final selection to KV:', err);
    return NextResponse.json({ error: 'Failed to save final selection' }, { status: 500 });
  }
}
