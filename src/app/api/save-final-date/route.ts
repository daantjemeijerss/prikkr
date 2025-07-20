import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  const { id, date, time } = await req.json();

  if (!id || !date || !time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const raw = await kv.get(`meta:${id}`);

    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Event ID not found or invalid format' }, { status: 404 });
    }

    const meta = JSON.parse(raw);
    meta.finalSelection = { date, time };

    await kv.set(`meta:${id}`, JSON.stringify(meta));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving final selection to KV:', err);
    return NextResponse.json({ error: 'Failed to save final selection' }, { status: 500 });
  }
}
