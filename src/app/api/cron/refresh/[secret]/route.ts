import { NextRequest, NextResponse } from 'next/server';
import { getMeta, getResponses, setResponses, getParticipants } from '@/lib/storage';
import { durationInMinutes, buildSelectionsFromBusy } from '@/lib/availability';
import { fetchGoogleBusy } from '@/calendar/fetchGoogleBusy';
import { fetchOutlookBusy } from '@/calendar/fetchOutlookBusy';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ secret: string }> }
) {
  const { secret } = await ctx.params; // IMPORTANT in Next 15
  if (secret !== process.env.VERCEL_CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ ok: false, reason: 'no meta' });

  const participants = await getParticipants(id);
  if (!participants.length) {
    return NextResponse.json({ ok: true, updated: 0, note: 'no participants' });
  }

  const slotMin = durationInMinutes(meta.slotDuration ?? 60);

  // Load existing responses via helper (parses stringified arrays)
  const existing = await getResponses(id);

  // Build map preserving all existing entries (even those without email)
  const byKey = new Map<string, typeof existing[number]>();
  for (let i = 0; i < existing.length; i++) {
    const r = existing[i];
    const email = (r as any).email ? String((r as any).email).toLowerCase() : '';
    const name  = r.name ? r.name.toLowerCase() : '';
    const k = email || (name ? `${name}#${i}` : `anon#${i}`);
    byKey.set(k, r);
  }

  let updated = 0;

  for (const p of participants) {
    if (!p.optedInForAutoSync) continue;

    let busy: Array<{ start: string; end: string }> = [];
    if (p.provider === 'google') {
      busy = await fetchGoogleBusy(meta.range.from, meta.range.to, p.oauth.access_token);
    } else if (p.provider === 'azure-ad') {
      busy = await fetchOutlookBusy(meta.range.from, meta.range.to, p.oauth.access_token);
    }

    const selections = buildSelectionsFromBusy(
      busy,
      meta.range,
      slotMin,
      Boolean(meta.extendedHours),
      'Europe/Amsterdam'
    );

    // Upsert by EMAIL ONLY (don’t collide with legacy name-only entries)
    const emailKey = (p.email || '').toLowerCase();
    if (emailKey) {
      byKey.set(emailKey, {
        name: p.name || p.email || 'Participant',
        email: p.email,
        selections,
      });
    } else {
      const fallbackKey = (p.name || 'participant').toLowerCase() + '#auto';
      byKey.set(fallbackKey, {
        name: p.name || 'Participant',
        selections,
      } as any);
    }

    updated++;
  }

  const finalArr = Array.from(byKey.values());
  await setResponses(id, finalArr);
  return NextResponse.json({ ok: true, updated, finalCount: finalArr.length });
}
