import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const arr = (await kv.get(`responses:${id}`)) as any[] | null;
  if (!Array.isArray(arr)) return NextResponse.json([]);

  // Summarize to make it readable
  const summary = arr.map((r, idx) => ({
    idx,
    name: r?.name,
    email: r?.email,
    dates: r?.selections ? Object.keys(r.selections).length : 0,
    totalTimes: r?.selections
      ? Object.values(r.selections).reduce((sum: number, v: any) => sum + (Array.isArray(v) ? v.length : 0), 0)
      : 0,
  }));
  return NextResponse.json({ count: arr.length, summary });
}
