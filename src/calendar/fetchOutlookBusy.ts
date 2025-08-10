// src/calendar/fetchOutlookBusy.ts
import { DateTime } from 'luxon';
import { TimeSlot } from '@/utils/calendarHelpers';

export async function fetchOutlookBusy(
  from: string,
  to: string,
  accessToken: string
): Promise<TimeSlot[]> {
  // Build the window as local-midnight → UTC (prevents 1–2h shifts in prod)
  const startUTC = DateTime.fromISO(from, { zone: 'Europe/Amsterdam' })
    .startOf('day')
    .toUTC()
    .toISO()!;
  const endUTC = DateTime.fromISO(to, { zone: 'Europe/Amsterdam' })
    .endOf('day')
    .toUTC()
    .toISO()!;

  const url =
    `https://graph.microsoft.com/v1.0/me/calendarView` +
    `?startDateTime=${encodeURIComponent(startUTC)}` +
    `&endDateTime=${encodeURIComponent(endUTC)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="W. Europe Standard Time"',
      },
    });

    // 🔎 Debug logs for prod
    console.log('📤 Graph calendarView → status:', res.status);
    if (!res.ok) {
      const authHdr = res.headers.get('www-authenticate');
      if (authHdr) console.error('🔐 WWW-Authenticate:', authHdr);
      const errorText = await res.text();
      console.error('❌ Graph error body:', errorText);
      return [];
    }

    const data = await res.json();

    // Parse directly in your local zone (no UTC hop)
    return (data.value || []).map((item: any) => ({
      start: DateTime.fromISO(item.start.dateTime, { zone: 'Europe/Amsterdam' }).toISO(),
      end:   DateTime.fromISO(item.end.dateTime,   { zone: 'Europe/Amsterdam' }).toISO(),
    }));
  } catch (err) {
    console.error('❌ Error fetching from Outlook:', err);
    return [];
  }
}
