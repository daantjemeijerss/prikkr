// app/api/get-meta/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

console.log('💡 get-meta route reached');

export async function GET(req: NextRequest) {
  try {
    console.log('📥 Incoming GET /api/get-meta');

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    console.log('🔎 Requested ID:', id);

    if (!id) {
      console.warn('⚠️ No ID provided in query');
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const redisKey = `meta:${id}`;
    console.log('🔑 Fetching from Redis with key:', redisKey);

    // Retry logic
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const maxRetries = 3;
    let metaRaw: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      metaRaw = await kv.get(redisKey);
      if (metaRaw) {
        console.log(`✅ Data retrieved on attempt ${attempt}`);
        break;
      }
      console.warn(`⏳ Attempt ${attempt}: No data found, retrying in 1000ms...`);
      await delay(1000);
    }

    if (!metaRaw) {
      console.error('❌ Failed to retrieve metadata after retries');
      return NextResponse.json({}, { status: 200 });
    }

    console.log('✅ Parsed metadata:', metaRaw);
    return NextResponse.json(metaRaw);
  } catch (err) {
    console.error('❌ Failed to fetch metadata from Redis:', err);
    return NextResponse.json({ error: 'Failed to load metadata' }, { status: 500 });
  }
}
