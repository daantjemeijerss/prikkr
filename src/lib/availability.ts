// lib/availability.ts
import { DateTime } from 'luxon';

export function durationInMinutes(value: string | number): number {
  const map: Record<string, number> = {
    '5-minutes': 5, '10-minutes': 10, 'quarter-hour': 15,
    'half-hour': 30, 'hourly': 60, 'daily': 1440,
  };
  if (typeof value === 'number') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : (map[value] ?? 60);
}

export function generateSlots(slotDuration: number, extendedHours: boolean) {
  if (slotDuration >= 1440) return ['All Day']; // if you ever model daily this way
  const out: string[] = [];
  const START_HOUR = 9;
  const END_HOUR = extendedHours ? 21 : 17; // exclusive
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += slotDuration) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

export function buildSelectionsFromBusy(
  busy: Array<{ start: string; end: string }>,
  range: { from: string; to: string },
  slotDurationMin: number,
  extendedHours: boolean,
  tz = 'Europe/Amsterdam'
) {
  const selections: Record<string, string[]> = {};
  // days in range
  let d = DateTime.fromISO(range.from, { zone: tz }).startOf('day');
  const end = DateTime.fromISO(range.to, { zone: tz }).startOf('day');
  const days: string[] = [];
  while (d <= end) { days.push(d.toISODate()!); d = d.plus({ days: 1 }); }

  const slots = generateSlots(slotDurationMin, extendedHours);

  for (const date of days) {
    const keep: string[] = [];
    for (const t of slots) {
      if (t === 'All Day') { // simple check, extend if you support daily
        const start = DateTime.fromISO(date, { zone: tz }).startOf('day');
        const fin = start.plus({ days: 1 });
        const overlaps = busy.some(b => {
          const bs = DateTime.fromISO(b.start).setZone(tz);
          const be = DateTime.fromISO(b.end).setZone(tz);
          return start < be && fin > bs;
        });
        if (!overlaps) keep.push(t);
        continue;
      }

      const [hh, mm] = t.split(':').map(Number);
      const start = DateTime.fromISO(date, { zone: tz }).set({ hour: hh, minute: mm });
      const fin = start.plus({ minutes: slotDurationMin });

      const overlaps = busy.some(b => {
        const bs = DateTime.fromISO(b.start).setZone(tz);
        const be = DateTime.fromISO(b.end).setZone(tz);
        return start < be && fin > bs;
      });
      if (!overlaps) keep.push(t);
    }
    selections[date] = keep;
  }
  return selections;
}
