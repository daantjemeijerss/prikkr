// src/app/api/save-response/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs'; // avoid Edge quirks with fetch/KV

type Mode = 'custom' | 'sync';

type StoredResponse = {
  name: string;
  email: string;
  selections: Record<string, string[]>;
  mode: Mode;          // new
  updatedAt: string;   // new
};


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
    const incomingMode: Mode = body.mode === 'custom' ? 'custom' : 'sync';
    const now = new Date().toISOString();


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

    // Backfill defaults for legacy rows (no mode/updatedAt)
existingData = (existingData as any[]).map((r) => ({
  name: r.name,
  email: r.email,
  selections: r.selections ?? {},
  mode: (r.mode === 'custom' ? 'custom' : 'sync') as Mode,
  updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(0).toISOString(),
})) as StoredResponse[];


const normEmail = email.toLowerCase();
const idx = existingData.findIndex(entry => entry.email?.toLowerCase() === normEmail);

if (idx >= 0) {
  const prev = existingData[idx];

  // If they were manual, keep them manual unless the incoming explicitly says 'sync'
  const nextMode: Mode =
    prev.mode === 'custom' && incomingMode !== 'sync'
      ? 'custom'
      : incomingMode;

  existingData[idx] = {
    ...prev,
    name: name ?? prev.name,
    email: prev.email,        // keep canonical stored email
    selections,               // always trust the latest client payload
    mode: nextMode,
    updatedAt: now,
  };
  console.log(`🔁 Updated response for ${email} (mode=${nextMode})`);
} else {
  existingData.push({
    name: name ?? email,
    email,
    selections,
    mode: incomingMode,
    updatedAt: now,
  });
  console.log(`✅ New response saved for ${email} (mode=${incomingMode})`);
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
