import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, selections } = body;

    console.log('📥 Saving response:', { id, name, email, selections });

    if (!id || !name || !email || !selections || Object.keys(selections).length === 0) {
      return NextResponse.json({ error: 'Missing required fields or empty selections' }, { status: 400 });
    }

    const redisKey = `responses:${id}`;
    let existingData: { name: string; email: string; selections: any }[] = [];

    const stored = await kv.get(redisKey);
    if (stored && typeof stored === 'string') {
      try {
        existingData = JSON.parse(stored);
      } catch {
        console.warn('⚠️ Failed to parse existing KV responses');
      }
    }

    const existingIndex = existingData.findIndex(entry => entry.email === email);
    if (existingIndex !== -1) {
      existingData[existingIndex] = { name, email, selections };
      console.log(`🔁 Updated response for ${email}`);
    } else {
      existingData.push({ name, email, selections });
      console.log(`✅ New response saved for ${email}`);
    }

    await kv.set(redisKey, JSON.stringify(existingData));

    let eventMeta: { eventName: string; creatorName: string; creatorEmail?: string } | undefined;
    const metaRaw = await kv.get(`meta:${id}`);
    if (metaRaw && typeof metaRaw === 'string') {
      try {
        eventMeta = JSON.parse(metaRaw);
      } catch {
        console.warn('⚠️ Failed to parse event metadata');
      }
    }

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
          id,
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
