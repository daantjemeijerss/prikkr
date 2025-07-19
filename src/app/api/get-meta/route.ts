import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET() {
  try {
    const metaRaw = await redis.get('meta');

    if (!metaRaw || typeof metaRaw !== 'string') {
      return NextResponse.json({}, { status: 200 });
    }

    const meta = JSON.parse(metaRaw);
    return NextResponse.json(meta);
  } catch (err) {
    console.error('❌ Failed to fetch metadata from Redis:', err);
    return NextResponse.json({ error: 'Failed to load metadata' }, { status: 500 });
  }
}
