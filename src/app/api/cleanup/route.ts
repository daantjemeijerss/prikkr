import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const keys = await kv.keys('meta:*');

    if (!keys || keys.length === 0) {
      return NextResponse.json({ message: 'No meta keys found.' });
    }

    let deletedCount = 0;

    for (const metaKey of keys) {
      const id = metaKey.split(':')[1]; // from meta:abc123 → abc123
      const metaRaw = await kv.get(metaKey);

      if (!metaRaw) continue;

      let meta: any;
      try {
        meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
      } catch (err) {
        console.warn(`⚠️ Skipped malformed meta for ID ${id}`);
        continue;
      }

      const createdAt = meta?.finalSelection?.createdAt || meta?.createdAt;

      if (!createdAt || typeof createdAt !== 'number') continue;

      const age = Date.now() - createdAt;
      if (age > ONE_YEAR_MS) {
        await kv.del(`meta:${id}`);
        await kv.del(`responses:${id}`);
        deletedCount++;
        console.log(`🧹 Deleted expired event: ${id}`);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
    });
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    return NextResponse.json({ error: 'Failed cleanup' }, { status: 500 });
  }
}
