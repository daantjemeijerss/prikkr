import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

function toUtcISO(date: string, time: string) {
  // date: "YYYY-MM-DD", time: "HH:mm" → ISO in UTC at that wall time
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0)).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { id, date, time } = await req.json();

    if (!id || !date || !time) {
      return NextResponse.json({ ok: false, error: 'Missing id/date/time' }, { status: 400 });
    }

    const raw = await kv.get(`meta:${id}`);
    if (!raw) {
      return NextResponse.json({ ok: false, error: 'Event ID not found' }, { status: 404 });
    }

    // Normalize meta to an object (your KV may contain stringified JSON or an object)
    let meta: Record<string, any>;
    if (typeof raw === 'string') {
      try {
        meta = JSON.parse(raw) as Record<string, any>;
      } catch {
        meta = {};
      }
    } else {
      meta = raw as Record<string, any>;
    }

    const nowIso = new Date().toISOString();

    meta.finalSelection = {
      date,            // "YYYY-MM-DD"
      time,            // "HH:mm"
      utcISO: toUtcISO(date, time), // convenience for ICS/invites
      createdAt: nowIso,
    };

    // Mark as finalized + update activity timestamps
    meta.status = 'finalized';
    meta.finalizedAt = nowIso;
    meta.updatedAt = nowIso;
    meta.lastViewedAt = nowIso;

    // Store back as an OBJECT (keeps things tidy with Vercel KV)
    await kv.set(`meta:${id}`, meta);

    return NextResponse.json({
      ok: true,
      status: meta.status,
      finalSelection: meta.finalSelection,
      finalizedAt: meta.finalizedAt,
    });
  } catch (err) {
    console.error('❌ save-final-date error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to save final selection' }, { status: 500 });
  }
}
