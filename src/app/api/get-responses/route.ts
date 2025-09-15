// app/api/get-responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getResponses } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    const responses = await getResponses(id);
    return NextResponse.json(responses, { status: 200 });
  } catch (err) {
    console.error('❌ Error reading responses:', err);
    return NextResponse.json({ error: 'Failed to read responses' }, { status: 500 });
  }
}
