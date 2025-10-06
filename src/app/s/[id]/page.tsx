'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import { DateTime } from 'luxon';
import { useBusySegments } from '@/utils/busySync';
import {
  getDateRange,
  getWeekday,
  formatDisplayDate,
  getSlotBusySegments,
  isSlotBusy,
  getSlotTypeLabel,
  TimeSlot
} from '@/utils/calendarHelpers';
import {
  SubmitAndRedirectButton,
  TimeSlotButton,
  DayAvailabilityButton,
  slotSymmetricGridClass,
  dailySymmetricGridClass,
  dailyWeekPadStart,
  dailyColStartMdClass,   // ← new
  fixedCols,              // (ok to keep if you use elsewhere, otherwise remove)
  type BusySegment,
} from '@/utils/Buttons';
import { useTouchMeta } from '@/hooks/useTouchMeta';


export default function PrikkrPage() {
  const params = useParams();
  const idStr = typeof params?.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { data: session } = useSession();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [extendedHours, setExtendedHours] = useState(false);
  const [slotDuration, setSlotDuration] = useState<string>('60'); // meta will overwrite
  const [customMode, setCustomMode] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<string, Set<string>>>({});

  // new state to hold fallbacks when not logged in
const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);
const [fallbackName, setFallbackName] = useState<string | null>(null);
const { busySegments } = useBusySegments({
  customMode,
  range,
  session,
});

useEffect(() => {
  if (!idStr) return;

  // require a logged-in provider so the route can read tokens from the session cookie
  const provider = (session as any)?.provider;
  const accessToken = (session as any)?.accessToken;
  if (!provider || !accessToken) return;

  // register/refresh this participant so cron can sync them later
  (async () => {
    try {
      const res = await fetch('/api/participants/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',                // IMPORTANT: send session cookie
        body: JSON.stringify({ id: idStr, optIn: true }),
      });
      const j = await res.json();
      console.log('participants/upsert ->', res.status, j);
    } catch (e) {
      console.warn('participants/upsert failed', e);
    }
  })();
}, [idStr, session]);


useTouchMeta(idStr, 'active');

useEffect(() => {
  if (!idStr) return;
  try {
    setFallbackEmail(localStorage.getItem(`creatorEmail-${idStr}`));
    setFallbackName(localStorage.getItem(`creatorName-${idStr}`));
  } catch {}
}, [idStr]);


  useEffect(() => {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;

    fetch(`/api/get-meta?id=${id}`)
      .then(res => res.json())
      .then(meta => {
        console.log('📦 Loaded meta:', meta);
        setRange(meta.range);
        setExtendedHours(meta.extendedHours);

        const duration = String(meta.slotDuration || '60');
        setSlotDuration(duration);
              console.log('⏱️ meta.slotDuration:', meta.slotDuration);
      console.log('🆔 meta.slotType:', meta.slotType);
      });
  }, [params]);

  const slotType = useMemo(() => getSlotTypeLabel(slotDuration), [slotDuration]);
  const durationMinutes = parseInt(slotDuration === 'custom' ? '60' : slotDuration);

  // Always load Outlook busy via server (auto refresh + no cache)
async function loadOutlookBusy(from: string, to: string) {
  const res = await fetch(`/api/busy/outlook?from=${from}&to=${to}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: { 'x-prikkr': 'refresh' }, // harmless cache-buster
  });
  if (!res.ok) {
    console.error('Failed to load Outlook busy:', await res.text());
    return [];
  }
  const { busy } = await res.json();
  return busy as TimeSlot[];
}


  const generateSlots = () => {
    if (slotDuration === 'daily' || slotDuration === '1440') return ['All Day'];


    const step = parseInt(String(slotDuration)); // always use actual numeric value

    const slots: string[] = [];
    const startHour = 9;
    const endHour = extendedHours ? 21 : 17;

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += step) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const fullSlots = generateSlots();
  const dates = range ? getDateRange(range.from, range.to) : [];

  const handleSlotToggle = (date: string, time: string) => {
    setManualSelections(prev => {
      const newSet = new Set(prev[date] || []);
      newSet.has(time) ? newSet.delete(time) : newSet.add(time);
      return { ...prev, [date]: newSet };
    });
  };

  const handleDayToggle = (date: string) => {
    setManualSelections(prev => {
      const allSelected = fullSlots.every(t => prev[date]?.has(t));
      return {
        ...prev,
        [date]: new Set(allSelected ? [] : fullSlots),
      };
    });
  };

const buildPayload = () => {
  const id = idStr;
  const name =
    session?.user?.name ||
    fallbackName ||
    session?.user?.email ||
    'Anonymous';

  // IMPORTANT: email must exist for the API
  const email = session?.user?.email || fallbackEmail || '';

  // compute selections (your existing code) ...
  let serialized: Record<string, string[]> = {};

  if (customMode) {
    const out: Record<string, string[]> = {};
    for (const [date, times] of Object.entries(manualSelections)) {
      out[date] = Array.from(times).map(t => (t === '~All Day' ? 'All Day' : t));
    }
    serialized = out;
  } else {
    const computed: Record<string, string[]> = {};
    for (const date of dates) {
      const availableSlots: string[] = [];

      for (const time of fullSlots) {
        if (time === 'All Day') {
  // Compute the fraction of the day that is free
  const dayStart = DateTime.fromISO(`${date}T00:00:00`, { zone: 'Europe/Amsterdam' });
  const dayEnd   = dayStart.plus({ days: 1 });
  const totalMin = dayEnd.diff(dayStart, 'minutes').minutes;

  const busyMin = busySegments
    .map(({ start, end }) => {
      const bStart = DateTime.fromISO(start);
      const bEnd   = DateTime.fromISO(end);
      const s = Math.max(0, bStart.diff(dayStart, 'minutes').minutes);
      const e = Math.min(totalMin, bEnd.diff(dayStart, 'minutes').minutes);
      return Math.max(0, e - s); // clamp negatives
    })
    .reduce((acc, m) => acc + m, 0);

  const freeRatio = 1 - busyMin / totalMin;

  if (freeRatio >= 1) availableSlots.push('All Day');
  else if (freeRatio >= 0.8) availableSlots.push('All Day'); // treat "~All Day" as "All Day" in payload
}
else {
          const busy = isSlotBusy(time, date, busySegments, durationMinutes);
          if (!busy) availableSlots.push(time);
        }
      }
      if (availableSlots.length) computed[date] = availableSlots;
    }
    serialized = computed;
  }

  // FINAL safeguard – match API expectations
  if (!id || !email || !Object.keys(serialized).length) {
    console.error('Payload missing fields', { id, name, email, serialized });
  }

  return { id, name, email, selections: serialized, isCreator: true, mode: customMode ? 'custom' : 'sync', };
};


    return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 sm:h-24 lg:h-48 w-auto cursor-pointer z-10"
      />

      <section className="w-full bg-red-50 py-16 px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mx-auto w-full max-w-[90rem]">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 sm:mb-12">
            Your Calendar Availability
          </h1>

          {range && (
            <p className="text-center text-sm sm:text-base font-medium text-gray-800">
  Select your availability between
  <span className="inline sm:hidden"><br /></span>
  <strong> 05 Aug 2025 </strong> and <strong> 26 Aug 2025 </strong>
</p>

          )}

<div className="mt-2 flex flex-row flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-10">
  <label className="flex items-center gap-x-2 text-md sm:text-lg">
    <input type="radio" checked={!customMode} onChange={() => setCustomMode(false)} />
    <span>Use current availability</span>
  </label>
  <label className="flex items-center gap-x-2 text-md sm:text-lg">
    <input type="radio" checked={customMode} onChange={() => setCustomMode(true)} />
    <span>Manually select times</span>
  </label>
</div>

{(slotDuration === 'daily' || slotDuration === '1440') ? (
  (() => {
    // Group by Monday (ISO weekday 1)
    const weeksByMonday = dates.reduce((acc: Record<string, string[]>, iso: string) => {
      const d = DateTime.fromISO(iso, { zone: 'UTC' });
      const mondayISO = d.set({ weekday: 1 }).toISODate()!; // always the Monday of that ISO week
      (acc[mondayISO] ??= []).push(iso);
      return acc;
    }, {});

    return Object.entries(weeksByMonday)
      .sort((a, b) => a[0].localeCompare(b[0])) // keep weeks in order
      .map(([mondayISO, weekDates], weekIdx) => {
        weekDates.sort(); // ensure Mon→Sun order within the week

        const startDate = DateTime.fromISO(mondayISO);
        const endDate = startDate.plus({ days: 6 });

        const offset = dailyWeekPadStart(weekDates[0]);     // 0..6 from Monday
        const firstColStart = dailyColStartMdClass(offset); // md:col-start-1..7

        return (
          <div
            key={`week-${weekIdx}`}
            className="bg-white rounded-xl shadow-md px-2 py-1 mb-2 w-full max-w-screen-xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 w-full">
              {/* Week label */}
              <div className="sm:w-[10rem] text-md text-left">
                <div className="font-bold text-gray-800">Week {startDate.weekNumber}</div>
                <div className="text-gray-600">
                  {startDate.toFormat('dd LLL')} – {endDate.toFormat('dd LLL')}
                </div>
              </div>

              <div className={dailySymmetricGridClass()}>
                {weekDates.map((date, i) => {
                  const isSelected = manualSelections[date]?.has('All Day');

                  const dayStart = DateTime.fromISO(`${date}T00:00:00`, { zone: 'Europe/Amsterdam' });
                  const dayEnd = dayStart.plus({ days: 1 });
                  const totalMinutes = dayEnd.diff(dayStart, 'minutes').minutes;

                  const overlappingBusy = busySegments
                    .map(({ start, end }) => {
                      const busyStart = DateTime.fromISO(start);
                      const busyEnd = DateTime.fromISO(end);
                      return {
                        start: Math.max(0, busyStart.diff(dayStart, 'minutes').minutes),
                        end: Math.min(totalMinutes, busyEnd.diff(dayStart, 'minutes').minutes),
                      };
                    })
                    .filter(({ start, end }) => start < end);

                  const busyDuration = overlappingBusy.reduce((sum, b) => sum + (b.end - b.start), 0);
                  const freeRatio = 1 - busyDuration / totalMinutes;

                  const isFullyFree = freeRatio === 1;
                  const isMostlyFree = freeRatio >= 0.8;
                  const dateLabel = DateTime.fromISO(date).toFormat('ccc dd LLL');

                  return (
                    <DayAvailabilityButton
                      key={date}
                      dateLabel={dateLabel}
                      isSelected={isSelected}
                      isFullyFree={isFullyFree}
                      isMostlyFree={isMostlyFree}
                      customMode={customMode}
                      onClick={customMode ? () => handleSlotToggle(date, 'All Day') : undefined}
                      className={i === 0 ? firstColStart : ''}   // offset first visible day
                    />
                  );
                })}
              </div>
            </div>

            {customMode && (
              <div className="mt-2 flex justify-center w-full">
                <button
                  onClick={() => {
                    const allSelected = weekDates.every(date => manualSelections[date]?.has('All Day'));
                    setManualSelections(prev => {
                      const updated = { ...prev };
                      for (const date of weekDates) {
                        updated[date] = new Set(allSelected ? [] : ['All Day']);
                      }
                      return updated;
                    });
                  }}
                  className="text-blue-600 text-sm underline"
                >
                  {weekDates.every(date => manualSelections[date]?.has('All Day'))
                    ? 'Unselect all'
                    : 'Select all'}
                </button>
              </div>
            )}
          </div>
        );
      });
  })()
) : (


  dates.map(date => (
    <div
      key={date}
      className="bg-white rounded-xl shadow-md px-4 py-1 mb-2 w-full max-w-screen-xl mx-auto"
    >
       <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
        <div className="text-left sm:min-w-[10rem] pt-1 self-start">
          <div className="text-sm text-gray-500 font-medium">{getWeekday(date)}</div>
          <div className="text-base sm:text-lg font-semibold text-gray-900">
            {formatDisplayDate(date)}
          </div>
        </div>

<div className={slotSymmetricGridClass(extendedHours)}>
  {fullSlots.map((time) => {
    const isSelected = manualSelections[date]?.has(time);

    const [startH, startM] = time.split(':').map(Number);
    const end = new Date(0, 0, 0, startH, startM + durationMinutes);
    const endTime = end.toTimeString().slice(0, 5);

    const segments = getSlotBusySegments(
  time,
  date,
  busySegments,
  durationMinutes
);

    return (
      <TimeSlotButton
        key={time}
        label={`${time} - ${endTime}`}
        segments={segments}
        selected={isSelected}
        customMode={customMode}
        onClick={customMode ? () => handleSlotToggle(date, time) : undefined}
      />
    );
  })}


</div>



      </div>

      {customMode && (
        <div className="mt-2 flex justify-center w-full">
          <button
            onClick={() => handleDayToggle(date)}
            className="text-blue-600 text-sm underline"
          >
            {manualSelections[date]?.size === fullSlots.length
              ? 'Unselect all'
              : 'Select all'}
          </button>
        </div>
      )}
    </div>
  ))
)}


<SubmitAndRedirectButton
  id={idStr}
  text="Send out!"
  apiEndpoint="/api/save-response"
  payload={buildPayload}
  successHref={(theId) => `/share/${theId}`}
  guard={() => !!idStr && (!!session?.user?.email || !!fallbackEmail)}
/>


        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800 text-base">📌Prikkr</div>
        <div className="mb-3 italic text-gray-600 text-sm">"The smart way to plan together."</div>
        <div className="mb-2">Office: Utrecht, Netherlands</div>

        <div className="flex justify-center gap-4 text-blue-600 text-sm mt-2">
          <button onClick={() => router.push('/contact')} className="hover:underline">
            Contact
          </button>
          <button onClick={() => router.push('/privacy-policy')} className="hover:underline">
            Privacy Policy
          </button>
          <button onClick={() => router.push('/terms')} className="hover:underline">
            Terms of Service
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
        </div>
      </footer>

      <style jsx>{`
  .float-check {
    animation: floatCheck 1.5s ease-in-out infinite;
    display: inline-block;
  }

  @keyframes floatCheck {
    0% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }
    100% {
      transform: translateY(0);
    }
  }
`}</style>

    </main>
  );
}
