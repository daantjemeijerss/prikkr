// lib/storage.ts
import { kv } from '@vercel/kv';

// ---------------- Meta ----------------

type Meta = {
  range: { from: string; to: string };
  extendedHours: boolean;
  slotDuration?: number | string;
  creatorEmail: string;
  creatorName?: string;
  eventName: string;
  createdAt: number;
  // optional: store creator provider/tokens here if you want creator auto-sync
  creatorProvider?: 'google' | 'azure-ad';
};

export async function getMeta(id: string): Promise<Meta | null> {
  const raw = await kv.get<string | Record<string, unknown>>(`meta:${id}`);
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Meta; } catch { return null; }
  }
  return raw as Meta;
}

export async function setMeta(id: string, meta: Meta) {
  // NOTE: you’re currently storing as STRING here (kept for backwards-compat)
  await kv.set(`meta:${id}`, JSON.stringify(meta));
}

// Activity/status fields you can “touch” without breaking older entries
export type MetaStatus = 'collecting' | 'active' | 'finalized' | 'archived' | 'open';

export type MetaActivity = {
  status?: MetaStatus;
  lastViewedAt?: string; // ISO
  updatedAt?: string;    // ISO
  _lastTouchMs?: number; // internal throttle marker
};

// Merge (upsert) into existing meta; stores as an OBJECT (works fine in Vercel KV)
export async function upsertMeta(id: string, patch: Partial<Meta & MetaActivity>) {
  const current = await getMeta(id);
  const next = { ...(current || {}), ...patch };
  await kv.set(`meta:${id}`, next);
  return next as Meta & MetaActivity;
}

// ---------------- Responses ----------------

export type ResponseEntry = {
  name: string;
  email?: string;
  selections: Record<string, string[] | Set<string> | Record<string, boolean>>;
};

export async function getResponses(id: string): Promise<ResponseEntry[]> {
  const raw = await kv.get(`responses:${id}`);
  if (!raw) return [];

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ResponseEntry[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? (raw as ResponseEntry[]) : [];
}

export async function setResponses(id: string, entries: ResponseEntry[]) {
  await kv.set(`responses:${id}`, JSON.stringify(entries));
}

// ---------------- Participants ----------------

export type Participant = {
  name?: string;
  email: string;
  provider: 'google' | 'azure-ad';
  // Keep refresh/access for server cron; encrypt at-rest if you prefer.
  oauth: { access_token: string; refresh_token?: string; expires_at?: number };
  optedInForAutoSync: boolean;
  accountId?: string; // Outlook user id if you store it

  // Health/stats
  lastBusySyncAt?: string;                 // ISO of last successful busy fetch
  lastBusySyncStatus?: 'ok' | 'error';     // last outcome
  lastBusySyncError?: string;              // last error message (optional)
  createdAt?: string;
  updatedAt?: string;
};

export async function getParticipants(id: string): Promise<Participant[]> {
  const raw = await kv.get(`participants:${id}`);
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Participant[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? (raw as Participant[]) : [];
}

export async function setParticipants(id: string, arr: Participant[]) {
  await kv.set(`participants:${id}`, arr);
}

// NEW: merge-based upsert so we don't lose fields like lastBusySyncAt
export async function upsertParticipant(
  id: string,
  patch: Partial<Participant> & { email: string }
): Promise<Participant[]> {
  const list = await getParticipants(id);
  const emailLc = patch.email.toLowerCase();
  const nowIso = new Date().toISOString();

  const idx = list.findIndex(p => (p.email || '').toLowerCase() === emailLc);

  if (idx >= 0) {
    // merge into existing
    list[idx] = {
      ...list[idx],
      ...patch,
      oauth: { ...(list[idx].oauth || {}), ...(patch.oauth || {}) },
      updatedAt: nowIso,
    };
  } else {
    // create new
    list.push({
      name: patch.name,
      email: patch.email,
      provider: patch.provider as Participant['provider'],
      oauth: patch.oauth || { access_token: '' },
      optedInForAutoSync: patch.optedInForAutoSync ?? true,
      accountId: patch.accountId,
      lastBusySyncAt: patch.lastBusySyncAt,
      lastBusySyncStatus: patch.lastBusySyncStatus,
      lastBusySyncError: patch.lastBusySyncError,
      createdAt: nowIso,
      updatedAt: nowIso,
    } as Participant);
  }

  await setParticipants(id, list);
  return list;
}

// ---------------- Last-sync marker per Prikkr ----------------

export async function setLastSync(id: string, isoTime: string) {
  await kv.set(`lastsync:${id}`, isoTime);
}

export async function getLastSync(id: string): Promise<string | null> {
  const v = await kv.get<string>(`lastsync:${id}`);
  return (typeof v === 'string') ? v : null;
}
