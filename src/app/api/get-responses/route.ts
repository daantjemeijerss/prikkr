import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const raw = await kv.get(`responses:${id}`);

    if (!raw) {
      console.warn(`⚠️ No responses found for id: ${id}`);
      return NextResponse.json([], { status: 200 });
    }

    if (!Array.isArray(raw)) {
      console.warn('⚠️ Responses from KV were not an array');
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(raw);
  } catch (err) {
    console.error('❌ Error reading responses from KV:', err);
    return NextResponse.json({ error: 'Failed to read responses' }, { status: 500 });
  }
}
