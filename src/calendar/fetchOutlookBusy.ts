// src/calendar/fetchOutlookBusy.ts
import 'server-only'; // ensure this module is never bundled to the client

import { DateTime } from 'luxon';
import { TimeSlot } from '@/utils/calendarHelpers';

// ---- Shared type ----
export type OAuthBundle = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // epoch ms
  token_type?: string;
  scope?: string;
};

// ---- Refresh helper (unchanged logic) ----
export async function refreshOutlookTokenIfNeeded<T extends OAuthBundle>(oauth: T): Promise<T> {
  const now = Date.now();
  // If we still have >2 min on the token, keep using it
  if (oauth.expires_at && oauth.expires_at - now > 120_000) return oauth;
  if (!oauth.refresh_token) return oauth;

  const tenant = process.env.AZURE_AD_TENANT_ID || 'common';

  const params = new URLSearchParams({
    client_id: process.env.AZURE_AD_CLIENT_ID!,          // set in env
    client_secret: process.env.AZURE_AD_CLIENT_SECRET!,  // set in env
    grant_type: 'refresh_token',
    refresh_token: oauth.refresh_token,
    // If your app requires redirect_uri on refresh, uncomment:
    // redirect_uri: process.env.AZURE_AD_REDIRECT_URI!,
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    // never cache token responses
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('❌ Outlook token refresh failed:', res.status, txt);
    return oauth;
  }

  const data = await res.json() as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    refresh_token?: string; // Microsoft may rotate this!
  };

  const refreshed: T = {
    ...oauth,
    access_token: data.access_token,
    token_type: data.token_type ?? oauth.token_type,
    scope: data.scope ?? oauth.scope,
    refresh_token: data.refresh_token ?? oauth.refresh_token, // keep/rotate
    expires_at: now + ((data.expires_in ?? 3600) - 60) * 1000,
  };

  return refreshed;
}

// ---- Core fetch (kept), now with $top and $select to avoid pagination surprises ----
export async function fetchOutlookBusy(
  from: string,
  to: string,
  accessToken: string
): Promise<TimeSlot[]> {
  const startUTC = DateTime.fromISO(from, { zone: 'Europe/Amsterdam' }).startOf('day').toUTC().toISO()!;
  const endUTC   = DateTime.fromISO(to,   { zone: 'Europe/Amsterdam' }).endOf('day').toUTC().toISO()!;

  const url =
    `https://graph.microsoft.com/v1.0/me/calendarView` +
    `?startDateTime=${encodeURIComponent(startUTC)}` +
    `&endDateTime=${encodeURIComponent(endUTC)}` +
    `&$select=start,end` +     // reduce payload, we only need these
    `&$top=999`;               // avoid missing events if there are many

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="W. Europe Standard Time"',
        // prevent any intermediates from caching
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    });

    console.log('📤 Graph calendarView → status:', res.status);
    if (!res.ok) {
      const authHdr = res.headers.get('www-authenticate');
      if (authHdr) console.error('🔐 WWW-Authenticate:', authHdr);
      const errorText = await res.text();
      console.error('❌ Graph error body:', errorText);
      return [];
    }

    const data = await res.json();

    return (data.value || []).map((item: any) => ({
      start: DateTime.fromISO(item.start.dateTime, { zone: 'Europe/Amsterdam' }).toISO(),
      end:   DateTime.fromISO(item.end.dateTime,   { zone: 'Europe/Amsterdam' }).toISO(),
    }));
  } catch (err) {
    console.error('❌ Error fetching from Outlook:', err);
    return [];
  }
}

// ---- New: one-call wrapper that refreshes then fetches ----
export async function fetchOutlookBusyWithRefresh(
  from: string,
  to: string,
  oauth: OAuthBundle
): Promise<{ busy: TimeSlot[]; oauth: OAuthBundle }> {
  const refreshed = await refreshOutlookTokenIfNeeded(oauth);
  const busy = await fetchOutlookBusy(from, to, refreshed.access_token);
  return { busy, oauth: refreshed };
}
