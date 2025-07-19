import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const raw = await redis.get(`responses:${id}`);

    if (!raw || typeof raw !== 'string') {
      return NextResponse.json([], { status: 200 });
    }

    const responses = JSON.parse(raw);
    return NextResponse.json(responses);
  } catch (err) {
    console.error('❌ Error reading responses from Redis:', err);
    return NextResponse.json({ error: 'Failed to read responses' }, { status: 500 });
  }
}
