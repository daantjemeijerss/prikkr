'use client';
import { useEffect, useMemo, useState } from 'react';
import type { TimeSlot } from '@/utils/calendarHelpers';
import { fetchGoogleBusy } from '@/calendar/fetchGoogleBusy';

async function fetchOutlookBusyViaApi(from: string, to: string): Promise<TimeSlot[]> {
  const res = await fetch(`/api/busy/outlook?from=${from}&to=${to}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: { 'x-prikkr': 'refresh' },
  });
  if (!res.ok) return [];
  const { busy } = await res.json();
  return busy as TimeSlot[];
}

export function useBusySegments(opts: {
  range: { from: string; to: string } | null;
  session: any;
  // optional: if false, you can disable overlays entirely in Custom mode on a page-by-page basis
  fetchInCustom?: boolean;
  customMode?: boolean;
}) {
  const { range, session, fetchInCustom = true, customMode = false } = opts;

  const provider: string | null = (session as any)?.provider ?? null;
  const accessToken: string | null = (session as any)?.accessToken ?? null;

  // We fetch whenever a provider exists and we have a range.
  // Custom mode does NOT block fetching — overlays stay visible.
  const shouldFetch = !!provider && !!range && (fetchInCustom || !customMode);

  const [busySegments, setBusySegments] = useState<TimeSlot[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!shouldFetch) { setBusySegments([]); return; }

    (async () => {
      let busy: TimeSlot[] = [];
      if (provider === 'google') {
        if (typeof accessToken !== 'string') { setBusySegments([]); return; }
        busy = await fetchGoogleBusy(range!.from, range!.to, accessToken);
      } else if (provider === 'azure-ad') {
        busy = await fetchOutlookBusyViaApi(range!.from, range!.to);
      }
      if (!cancelled) setBusySegments(busy);
    })();

    return () => { cancelled = true; };
  }, [shouldFetch, range?.from, range?.to, provider, accessToken]);

  return { busySegments, provider };
}
