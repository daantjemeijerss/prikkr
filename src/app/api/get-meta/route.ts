import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'meta.json');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const meta = data[id];

    if (!meta) {
      return NextResponse.json({ error: 'No metadata found for this ID' }, { status: 404 });
    }

    return NextResponse.json(meta);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read metadata' }, { status: 500 });
  }
}
