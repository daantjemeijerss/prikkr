import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'responses.json');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, selections } = body;

    if (!id || !name || !selections) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let data: Record<string, { name: string; selections: any }[]> = {};
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      data = JSON.parse(fileContent);
    } catch {
      // No file yet; that's okay
    }

    if (!data[id]) data[id] = [];
    data[id].push({ name, selections });

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
