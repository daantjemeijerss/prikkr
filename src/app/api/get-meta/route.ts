// app/api/get-meta/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
console.log('💡 get-meta route reached');

export async function GET(req: NextRequest) {
  try {
    console.log('📥 Incoming GET /api/get-meta');

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    console.log('🔍 Reading from Redis URL:', process.env.UPSTASH_REDIS_REST_URL);
    console.log('🔐 Using Redis token:', process.env.UPSTASH_REDIS_REST_TOKEN?.slice(0, 20) + '...');

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    console.log('🔎 Requested ID:', id);

    if (!id) {
      console.warn('⚠️ No ID provided in query');
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const redisKey = `meta:${id}`;
    console.log('🔑 Fetching from Redis with key:', redisKey);

    let metaRaw = await redis.get(redisKey);


    if (!metaRaw || typeof metaRaw !== 'string') {
      console.warn('⚠️ No data found initially — retrying after 500ms...');
      await new Promise((r) => setTimeout(r, 500));
      metaRaw = await redis.get(redisKey);
}

if (!metaRaw || typeof metaRaw !== 'string') {
  console.warn('⚠️ Still no data found in Redis for key:', redisKey);
  return NextResponse.json({}, { status: 200 });
}

    console.log('✅ Raw data retrieved:', metaRaw);

    const meta = JSON.parse(metaRaw);
    console.log('✅ Parsed metadata:', meta);

    return NextResponse.json(meta);
  } catch (err) {
    console.error('❌ Failed to fetch metadata from Redis:', err);
    return NextResponse.json({ error: 'Failed to load metadata' }, { status: 500 });
  }
}
