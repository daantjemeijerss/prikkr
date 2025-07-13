import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'meta.json');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, range, extendedHours } = body;

    if (!id || !range || typeof extendedHours !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let existing = {};
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      console.log('No existing meta.json file found, creating new one.');
    }

    const updated = {
      ...existing,
      [id]: { range, extendedHours },
    };

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
  }
}
