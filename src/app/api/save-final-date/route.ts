import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const filePath = path.resolve(process.cwd(), 'meta.json');

export async function POST(req: NextRequest) {
  const { id, date, time } = await req.json();

  if (!id || !date || !time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let data: Record<string, any> = {};
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch {
    console.log('No meta.json found, creating a new one');
  }

  if (!data[id]) {
    return NextResponse.json({ error: 'Event ID not found' }, { status: 404 });
  }

  data[id].finalSelection = { date, time };

  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true });
}
