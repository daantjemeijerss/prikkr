// src/app/api/save-response/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs'; // avoid Edge quirks with fetch/KV

type StoredResponse = { name: string; email: string; selections: any };

function normalizeSelections(input: any): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!input || typeof input !== 'object') return out;

  for (const [date, val] of Object.entries(input)) {
    if (Array.isArray(val)) {
      out[date] = (val as any[]).map(v => (v === '~All Day' ? 'All Day' : String(v)));
    } else if (val && typeof val === 'object') {
      // Handle Set or boolean map {slot:true/false}
      const maybeSet = val as any;
      if (typeof maybeSet.size === 'number' && typeof maybeSet.forEach === 'function') {
        const arr: string[] = [];
        (maybeSet as Set<string>).forEach(v => arr.push(v === '~All Day' ? 'All Day' : String(v)));
        out[date] = arr;
      } else {
        out[date] = Object.entries(val as Record<string, boolean>)
          .filter(([, ok]) => !!ok)
          .map(([k]) => (k === '~All Day' ? 'All Day' : k));
      }
    } else {
      out[date] = [];
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email } = body as { id?: string; name?: string; email?: string };
    const selections = normalizeSelections((body as any).selections);

    console.log('📥 Saving response:', { id, name, email, selections });

    if (!id || !name || !email || Object.keys(selections).length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields or empty selections' },
        { status: 400 }
      );
    }

    const redisKey = `responses:${id}`;
    let existingData: StoredResponse[] = [];

    // Be tolerant to both array/object and legacy stringified storage
    const stored = await kv.get(redisKey);
    if (typeof stored === 'string') {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) existingData = parsed as StoredResponse[];
      } catch {
        // ignore parse errors and start fresh array
      }
    } else if (Array.isArray(stored)) {
      existingData = stored as StoredResponse[];
    }

    const idx = existingData.findIndex(entry => entry.email?.toLowerCase() === email.toLowerCase());
    const next: StoredResponse = { name, email, selections };

    if (idx !== -1) {
      existingData[idx] = next;
      console.log(`🔁 Updated response for ${email}`);
    } else {
      existingData.push(next);
      console.log(`✅ New response saved for ${email}`);
    }

    // Persist (store as array; matches your current pattern)
    await kv.set(redisKey, existingData);

    // 🔎 Retrieve meta (string or object) to optionally send creator a confirmation
    let eventMeta: { eventName?: string; creatorName?: string; creatorEmail?: string } | undefined;
    const metaRaw = await kv.get(`meta:${id}`);
    if (!metaRaw) {
      console.error('❌ Failed to retrieve metadata for ID:', id);
    } else {
      try {
        eventMeta =
          typeof metaRaw === 'string' ? (JSON.parse(metaRaw) as any) : (metaRaw as any);
      } catch (e) {
        console.error('❌ Error parsing metaRaw:', e);
      }
    }

    // Build a safe absolute origin for server-side fetches
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(req.url).origin);

    try {
      if (
        eventMeta?.eventName &&
        eventMeta?.creatorName &&
        eventMeta?.creatorEmail &&
        eventMeta.creatorEmail.toLowerCase() !== email.toLowerCase()
      ) {
        const res = await fetch(`${origin}/api/send-rsvp-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            name,
            email,
            eventName: eventMeta.eventName,
            creatorName: eventMeta.creatorName,
            id,
          }),
        });

        if (!res.ok) {
          console.warn('⚠️ RSVP confirmation send returned non-OK:', res.status);
        }
      } else {
        console.log(`ℹ️ Skipped sending RSVP confirmation to creator (${email})`);
      }
    } catch (e) {
      // Never fail the save if the email call fails
      console.warn('⚠️ RSVP confirmation send failed:', e);
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('❌ Error saving response:', err);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
