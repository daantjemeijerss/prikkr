import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'responses.json');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data: Record<string, any[]> = JSON.parse(fileContent);

    const responses = data[id] || [];
    return NextResponse.json(responses);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read responses' }, { status: 500 });
  }
}
