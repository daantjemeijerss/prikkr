// ✅ FILE: src/app/api/save-response/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const responsesPath = path.resolve(process.cwd(), 'responses.json');
const metaPath = path.resolve(process.cwd(), 'meta.json');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, selections } = body;

    console.log('📥 Saving response:', { id, name, email, selections });

    if (!id || !name || !email || !selections || Object.keys(selections).length === 0) {
      return NextResponse.json({ error: 'Missing required fields or empty selections' }, { status: 400 });
    }

    // Read existing responses
    let data: Record<string, { name: string; email: string; selections: any }[]> = {};
    try {
      const fileContent = await fs.readFile(responsesPath, 'utf-8');
      data = JSON.parse(fileContent);
    } catch {
      // OK if file doesn't exist yet
    }

    if (!data[id]) data[id] = [];

    // Overwrite previous response if email already exists
    const existingIndex = data[id].findIndex(entry => entry.email === email);
    if (existingIndex !== -1) {
      data[id][existingIndex] = { name, email, selections };
      console.log(`🔁 Updated response for ${email}`);
    } else {
      data[id].push({ name, email, selections });
      console.log(`✅ New response saved for ${email}`);
    }

    // Write updated responses
    await fs.writeFile(responsesPath, JSON.stringify(data, null, 2));

    // Read event metadata
    let eventMeta: { eventName: string; creatorName: string; creatorEmail?: string } | undefined;
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      eventMeta = meta[id];
    } catch {
      console.warn('⚠️ No meta.json found or failed to load');
    }

    // If not the creator, send RSVP confirmation
    if (
      eventMeta?.eventName &&
      eventMeta?.creatorName &&
      eventMeta?.creatorEmail !== email
    ) {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-rsvp-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          eventName: eventMeta.eventName,
          creatorName: eventMeta.creatorName,
        }),
      });
    } else {
      console.log(`ℹ️ Skipped sending RSVP confirmation to creator (${email})`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving response:', err);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
