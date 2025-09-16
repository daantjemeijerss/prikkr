// src/calendar/fetchGoogleBusy.ts
import { TimeSlot } from '@/utils/calendarHelpers';

// ---- Add this shared type ----
export type OAuthBundle = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // epoch ms when access_token expires
  token_type?: string;
  scope?: string;
};

// ---- NEW: refresh helper ----
export async function refreshGoogleTokenIfNeeded<T extends OAuthBundle>(oauth: T): Promise<T> {
  // If we still have >120s, don’t refresh
  const now = Date.now();
  if (oauth.expires_at && oauth.expires_at - now > 120_000) return oauth;
  if (!oauth.refresh_token) return oauth; // cannot refresh

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,        // << set in env
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,// << set in env
    grant_type: 'refresh_token',
    refresh_token: oauth.refresh_token,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('❌ Google token refresh failed:', res.status, txt);
    return oauth; // fall back (you can also throw if you prefer)
  }

  const data = await res.json() as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    refresh_token?: string; // usually absent on refresh
  };

  const refreshed: T = {
    ...oauth,
    access_token: data.access_token,
    token_type: data.token_type ?? oauth.token_type,
    scope: data.scope ?? oauth.scope,
    // Google rarely returns refresh_token on refresh; keep the old one:
    refresh_token: data.refresh_token ?? oauth.refresh_token,
    // pad by 60s to avoid edge expiry
    expires_at: now + ((data.expires_in ?? 3600) - 60) * 1000,
  };

  return refreshed;
}

// ---- your existing fetch (kept as-is) ----
export async function fetchGoogleBusy(from: string, to: string, accessToken: string): Promise<TimeSlot[]> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: `${from}T00:00:00.000Z`,
        timeMax: `${to}T23:59:59.999Z`,
        items: [{ id: 'primary' }],
      }),
    });

    const data = await res.json();
    const busy = (data.calendars?.primary?.busy || []) as TimeSlot[];
    console.log('📅 Busy slots received (Google):', busy);
    return busy;
  } catch (err) {
    console.error('❌ Google fetch error:', err);
    return [];
  }
}
