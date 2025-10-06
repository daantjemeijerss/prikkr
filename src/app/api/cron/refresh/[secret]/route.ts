import { NextRequest, NextResponse } from 'next/server';
import { getMeta, getResponses, setResponses, getParticipants, setParticipants, setLastSync } from '@/lib/storage';
import { durationInMinutes, buildSelectionsFromBusy } from '@/lib/availability';
import { fetchGoogleBusy, refreshGoogleTokenIfNeeded } from '@/calendar/fetchGoogleBusy';
import { fetchOutlookBusy, refreshOutlookTokenIfNeeded } from '@/calendar/fetchOutlookBusy';
import { getKV, setKV } from '@/lib/kv'; // or remove if not using KV

type Mode = 'custom' | 'sync';

type StoredResponse = {
  name: string;
  email?: string;
  selections: Record<string, string[]>;
  mode: Mode;
  updatedAt: string;
};

type Ctx = { params: Promise<{ secret: string }> }; // Next 15 requires awaiting

export async function GET(req: NextRequest, ctx: Ctx) {
  const { secret } = await ctx.params; // ✅ Next 15
  if (secret !== process.env.VERCEL_CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const debug = url.searchParams.get('DEBUG') === '1';
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  // simple rate-limit to 10 minutes (optional)
  const rateKey = `cron:lock:${id}`;
  const last = (await getKV<number>(rateKey)) || 0;
  if (!debug && Date.now() - last < 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: 'recently-synced' });
  }
  await setKV(rateKey, Date.now());

  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ ok: false, reason: 'no meta' });

  const participants = await getParticipants(id);
  if (!participants?.length) {
    return NextResponse.json({ ok: true, updated: 0, note: 'no participants' });
  }

  const slotMin = durationInMinutes(meta.slotDuration ?? 60);

  const rawExisting = await getResponses(id);

// Backfill legacy rows without mode/updatedAt
const existing: StoredResponse[] = (Array.isArray(rawExisting) ? rawExisting : []).map((r: any, i: number) => ({
  name: r.name ?? (r.email ?? `Participant#${i}`),
  email: r.email,
  selections: r.selections ?? {},
  mode: r.mode === 'custom' ? 'custom' : 'sync',
  updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(0).toISOString(),
}));

const byKey = new Map<string, StoredResponse>();
for (let i = 0; i < existing.length; i++) {
  const r = existing[i];
  const email = r.email ? String(r.email).toLowerCase() : '';
  const name  = r.name ? r.name.toLowerCase() : '';
  const k = email || (name ? `${name}#${i}` : `anon#${i}`);
  byKey.set(k, r);
}

  let updated = 0;
  const debugLog: any[] = [];

  const now = Date.now();
const STALE_MS = 2 * 60 * 60 * 1000; // 2h, tune as needed

// Make a mutable copy so we can update participant timestamps
const participantsArr = await getParticipants(id);

for (let idx = 0; idx < participantsArr.length; idx++) {
  const p = participantsArr[idx];

  if (!p.optedInForAutoSync) {
    if (debug) debugLog.push({ skip: p.email || p.name, reason: 'opt-out' });
    continue;
  }

  // ---- NEW: do not recompute for manual users ----
  const emailKey = (p.email || '').toLowerCase();
  const prevRec = emailKey ? byKey.get(emailKey) : undefined;
  if (prevRec?.mode === 'custom') {
    if (debug) debugLog.push({ skip: emailKey || p.name, reason: 'manual-mode' });
    continue;
  }
  

  // --- NEW: stale-only guard ---
  const lastAt = p.lastBusySyncAt ? Date.parse(p.lastBusySyncAt) : 0;
  if (!debug && lastAt && now - lastAt < STALE_MS) {
    if (debug) debugLog.push({ skip: p.email, reason: 'fresh', lastBusySyncAt: p.lastBusySyncAt });
    continue;
  }

  let busy: Array<{ start: string; end: string }> = [];
  try {
    if (p.provider === 'google') {
      p.oauth = await refreshGoogleTokenIfNeeded(p.oauth);
      busy = await fetchGoogleBusy(meta.range.from, meta.range.to, p.oauth.access_token);
    } else if (p.provider === 'azure-ad') {
      p.oauth = await refreshOutlookTokenIfNeeded(p.oauth);
      busy = await fetchOutlookBusy(meta.range.from, meta.range.to, p.oauth.access_token);
    } else {
      if (debug) debugLog.push({ warn: 'unknown provider', p });
      continue;
    }
  } catch (e: any) {
    // record the failure (optional)
    participantsArr[idx] = {
      ...p,
      lastBusySyncStatus: 'error',
      lastBusySyncError: e?.message || 'busy-fetch-failed',
      updatedAt: new Date().toISOString(),
    };
    if (debug) debugLog.push({ error: 'busy-fetch-failed', who: p.email || p.name, msg: e?.message });
    continue; // don’t upsert on failure
  }

  const selections = buildSelectionsFromBusy(
    busy,
    meta.range,
    slotMin,
    Boolean(meta.extendedHours),
    'Europe/Amsterdam'
  );

  // upsert into byKey (typed + mark as sync)
  if (emailKey) {
    const prev = byKey.get(emailKey);
    const next: StoredResponse = {
      name: (p.name || prev?.name || p.email || 'Participant'),
      email: p.email,
      selections,
      mode: 'sync',                          // recomputed from provider
      updatedAt: new Date().toISOString(),
    };
    byKey.set(emailKey, next);
  } else {
    const fallbackKey = (p.name || 'participant').toLowerCase() + '#auto';
    const prev = byKey.get(fallbackKey);
    const next: StoredResponse = {
      name: (p.name || prev?.name || 'Participant'),
      selections,
      mode: 'sync',
      updatedAt: new Date().toISOString(),
    } as StoredResponse;
    byKey.set(fallbackKey, next);
  }


  updated++;
  if (debug) debugLog.push({ who: p.email || p.name, provider: p.provider, busyCount: busy.length });

  // --- NEW: mark success & persist latest tokens (in case they were refreshed) ---
  participantsArr[idx] = {
    ...p,
    oauth: p.oauth, // keep refreshed token
    lastBusySyncAt: new Date().toISOString(),
    lastBusySyncStatus: 'ok',
    lastBusySyncError: undefined,
    updatedAt: new Date().toISOString(),
  };
}


  const finalArr = Array.from(byKey.values());
  await setResponses(id, finalArr);
  // persist participant timestamps + refreshed tokens
await setParticipants(id, participantsArr);
  await setLastSync(id, new Date().toISOString());

  return NextResponse.json({
    ok: true,
    updated,
    finalCount: finalArr.length,
    ...(debug ? { debug: debugLog.slice(0, 200) } : {}),
  });
}
