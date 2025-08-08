import { DateTime } from 'luxon';

export interface TimeSlot {
  start: string;
  end: string;
}

export function getDateRange(from: string, to: string): string[] {
  const dates = [];
  const current = new Date(from);
  const endDate = new Date(to);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getWeekday(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getSlotBusySegments(
  slotTime: string,
  date: string,
  busySlots: TimeSlot[],
  slotDurationMinutes: number
): { from: number; to: number; color: string }[] {
  const [hour, minute] = slotTime.split(':').map(Number);
  const slotStart = DateTime.fromObject(
    {
      year: Number(date.split('-')[0]),
      month: Number(date.split('-')[1]),
      day: Number(date.split('-')[2]),
      hour,
      minute,
    },
    { zone: 'Europe/Amsterdam' }
  );
  const slotEnd = slotStart.plus({ minutes: slotDurationMinutes });

  const total = slotEnd.diff(slotStart, 'minutes').minutes;

  const segments: { from: number; to: number; color: string }[] = [];

  // Start with fully green
  let cursor = 0;

  // Sort overlapping busy blocks
  const overlapping = busySlots
    .map(({ start, end }) => {
      const busyStart = DateTime.fromISO(start);
      const busyEnd = DateTime.fromISO(end);
      return { busyStart, busyEnd };
    })
    .filter(({ busyStart, busyEnd }) => busyStart < slotEnd && busyEnd > slotStart)
    .map(({ busyStart, busyEnd }) => ({
      start: Math.max(0, busyStart.diff(slotStart, 'minutes').minutes),
      end: Math.min(total, busyEnd.diff(slotStart, 'minutes').minutes),
    }))
    .sort((a, b) => a.start - b.start);

  for (const { start, end } of overlapping) {
    if (start > cursor) {
      segments.push({
        from: cursor / total,
        to: start / total,
        color: '#22c55e', // green
      });
    }
    segments.push({
      from: start / total,
      to: end / total,
      color: '#ef4444', // red
    });
    cursor = end;
  }

  if (cursor < total) {
    segments.push({
      from: cursor / total,
      to: 1,
      color: '#22c55e', // green
    });
  }

  return segments;
}

export function isSlotBusy(
  slotTime: string,
  date: string,
  busySlots: TimeSlot[],
  slotDurationMinutes: number
): boolean {
  const [hour, minute] = slotTime.split(':').map(Number);

  const slotStart = DateTime.fromObject(
    {
      year: Number(date.split('-')[0]),
      month: Number(date.split('-')[1]),
      day: Number(date.split('-')[2]),
      hour,
      minute,
    },
    { zone: 'Europe/Amsterdam' }
  );

  const slotEnd = slotStart.plus({ minutes: slotDurationMinutes });

  const overlapping = busySlots.filter(({ start, end }) => {
    const busyStart = DateTime.fromISO(start);
    const busyEnd = DateTime.fromISO(end);
    return busyStart < slotEnd && busyEnd > slotStart;
  });

  if (overlapping.length > 0) {
    console.log(`❌ SLOT BUSY: ${date} ${slotTime} (${slotDurationMinutes} min)`, {
      slotStart: slotStart.toISO(),
      slotEnd: slotEnd.toISO(),
      overlapping,
    });
    return true;
  }

  return false;
}

export function getSlotTypeLabel(duration: string | number): string {
  const num = parseInt(String(duration));
  switch (num) {
    case 1440: return 'daily';
    case 60: return 'hourly';
    case 30: return 'half-hour';
    case 15: return 'quarter-hour';
    case 10: return '10-minutes';
    default: return 'custom';
  }
}
