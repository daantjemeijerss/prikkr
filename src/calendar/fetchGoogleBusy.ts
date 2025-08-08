// src/calendar/fetchGoogleBusy.ts

import {TimeSlot} from '@/utils/calendarHelpers';

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
