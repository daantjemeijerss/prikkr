// src/calendar/fetchOutlookBusy.ts
import { DateTime } from 'luxon';
import {TimeSlot} from '@/utils/calendarHelpers';

export async function fetchOutlookBusy(
  from: string,
  to: string,
  accessToken: string
): Promise<TimeSlot[]> {
  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${from}T00:00:00Z&endDateTime=${to}T23:59:59Z`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="W. Europe Standard Time"',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Outlook API error:', res.status, errorText);
      return [];
    }

    const data = await res.json();

    return (data.value || []).map((item: any) => ({
      start: DateTime.fromISO(item.start.dateTime, { zone: 'utc' })
        .setZone('Europe/Amsterdam')
        .toISO(),
      end: DateTime.fromISO(item.end.dateTime, { zone: 'utc' })
        .setZone('Europe/Amsterdam')
        .toISO(),
    }));
  } catch (err) {
    console.error('❌ Error fetching from Outlook:', err);
    return [];
  }
}
