// lib/storage.ts
import { kv } from '@vercel/kv';

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
  // choose ONE format; objects are nice with Vercel KV too:
  await kv.set(`meta:${id}`, JSON.stringify(meta));
}

export type ResponseEntry = {
  name: string;
  email?: string; // ← NEW (many entries already include this from save-response)
  selections: Record<string, string[] | Set<string> | Record<string, boolean>>;
};

// Parse BOTH object and string KV values safely
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

// Participants you’ll sync for:
export type Participant = {
  name?: string;
  email: string;
  provider: 'google' | 'azure-ad';
  // Keep refresh/access for server cron; encrypt at-rest if you prefer.
  oauth: { access_token: string; refresh_token?: string; expires_at?: number };
  optedInForAutoSync: boolean;
  accountId?: string; // Outlook user id if you store it
};

export async function getParticipants(id: string): Promise<Participant[]> {
  const raw = await kv.get(`participants:${id}`);
  return Array.isArray(raw) ? (raw as Participant[]) : [];
}

export async function setParticipants(id: string, arr: Participant[]) {
  await kv.set(`participants:${id}`, arr);
}
