'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {fetchOutlookBusy} from '@/calendar/fetchOutlookBusy';
import {fetchGoogleBusy} from '@/calendar/fetchGoogleBusy';
import { DateTime } from 'luxon';
import {
  getDateRange,
  getWeekday,
  formatDisplayDate,
  getSlotTypeLabel,
  getSlotBusySegments,
  TimeSlot
} from '@/utils/calendarHelpers';
import {
  SubmitAndRedirectButton,
  TimeSlotButton,
  DayAvailabilityButton,
  slotSymmetricGridClass,
  dailySymmetricGridClass,
  dailyWeekPadStart,
  dailyColStartMdClass,
  type BusySegment,
} from '@/utils/Buttons';


export default function RSVPFillPage() {
  const params = useParams();
  const idStr = typeof params?.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { data: session } = useSession();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [extendedHours, setExtendedHours] = useState(false);
  const [slotDuration, setSlotDuration] = useState<string>('60');
  const [busySlots, setBusySlots] = useState<TimeSlot[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<string, Set<string>>>({});

  const slotType = getSlotTypeLabel(slotDuration);
  const durationMinutes = parseInt(String(slotDuration)); 

  useEffect(() => {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;

    const storedName = localStorage.getItem(`prikkr-name-${id}`);
    const storedEmail = localStorage.getItem(`prikkr-email-${id}`);
    if (storedName) setName(storedName);
    if (storedEmail) setEmail(storedEmail);

    fetch(`/api/get-meta?id=${id}`)
      .then(res => res.json())
      .then(({ range, extendedHours, slotDuration }) => {
        setRange(range);
        setExtendedHours(extendedHours);
        setSlotDuration(String(slotDuration || '60'));
      });
  }, [params]);

useEffect(() => {
  if (!range) return;

  const token = session?.accessToken;
  const provider = session?.provider;

  if (typeof token !== 'string') return;
  if (provider !== 'google' && provider !== 'azure-ad') return;

  (async () => {
    if (provider === 'google') {
      const slots = await fetchGoogleBusy(range.from, range.to, token);
      setBusySlots(slots);
    } else {
      const slots = await fetchOutlookBusy(range.from, range.to, token);
      setBusySlots(slots);
    }
  })();
}, [range, session?.accessToken, session?.provider]);



  const generateSlots = () => {
  if (slotDuration === 'daily' || slotDuration === '1440') return ['All Day'];

  const step = parseInt(String(slotDuration)); // works for custom durations like 5, 7, etc.

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

const buildPayload = async () => {
  const id = idStr;
  if (!id) {
    console.error('❌ Missing or invalid RSVP id');
    return { id: '', name, email, selections: {} };
  }

  // Persist name/email like before
  localStorage.setItem(`prikkr-name-${id}`, name);
  localStorage.setItem(`prikkr-email-${id}`, email);

  // Use your existing logic to compute selections
  const fullSlots = generateSlots();
  const dates = range ? getDateRange(range.from, range.to) : [];

  let selections: Record<string, string[]> = {};

  if (customMode) {
    for (const [date, set] of Object.entries(manualSelections)) {
      selections[date] = Array.from(set);
    }
  } else {
    const computed: Record<string, string[]> = {};
    for (const date of dates) {
      const available: string[] = [];
      for (const time of fullSlots) {
        const segments = getSlotBusySegments(time, date, busySlots, durationMinutes);
        const isFree = !segments.some(s => s.color === '#ef4444');
        if (isFree) available.push(time);
      }
      if (available.length > 0) {
        computed[date] = available;
      }
    }
    selections = computed;
  }

  return { id, name, email, selections, isCreator: false };
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
          <p className="text-base sm:text-lg text-gray-800 mb-8">
            Select your availability between{' '}
            <strong>{formatDisplayDate(range.from)}</strong> and{' '}
            <strong>{formatDisplayDate(range.to)}</strong>
          </p>
        )}

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2 mb-4 w-full max-w-md text-base"
        />

        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2 mb-8 w-full max-w-md text-base"
        />

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-10">
          <label className="flex items-center gap-x-2 text-base sm:text-lg">
            <input type="radio" checked={!customMode} onChange={() => setCustomMode(false)} />
            <span>Use current availability</span>
          </label>
          <label className="flex items-center gap-x-2 text-base sm:text-lg">
            <input type="radio" checked={customMode} onChange={() => setCustomMode(true)} />
            <span>Manually select times</span>
          </label>
        </div>

        {(() => {
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

          const isDayBusy = (date: string) => {
            const dayStart = DateTime.fromISO(date + 'T00:00:00', { zone: 'Europe/Amsterdam' });
            const dayEnd = dayStart.plus({ days: 1 });
            return busySlots.some(({ start, end }) => {
              const busyStart = DateTime.fromISO(start);
              const busyEnd = DateTime.fromISO(end);
              return busyStart < dayEnd && busyEnd > dayStart;
            });
          };


const grouped =
  (slotDuration === 'daily' || slotDuration === '1440')
    ? (() => {
        // Group by Monday (ISO weekday 1)
        const weeksByMonday = dates.reduce((acc: Record<string, string[]>, iso: string) => {
          const d = DateTime.fromISO(iso, { zone: 'UTC' });
          const mondayISO = d.set({ weekday: 1 }).toISODate()!;
          (acc[mondayISO] ??= []).push(iso);
          return acc;
        }, {});

        return Object.entries(weeksByMonday)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([mondayISO, weekDates], weekIdx) => {
            weekDates.sort(); // Mon→Sun

            const startDate = DateTime.fromISO(mondayISO);
            const endDate = startDate.plus({ days: 6 });

            const offset = dailyWeekPadStart(weekDates[0]);     // 0..6 (Mon=0)
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

                      const overlappingBusy = busySlots
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
                          onClick={customMode ? () => {
                            setManualSelections(prev => {
                              const next = new Set(prev[date] || []);
                              next.has('All Day') ? next.delete('All Day') : next.add('All Day');
                              return { ...prev, [date]: next };
                            });
                          } : undefined}
                          className={i === 0 ? firstColStart : ''} // align first day to Monday column
                        />
                      );
                    })}
                  </div>
                </div>

                {customMode && (
                  <div className="mt-2 flex justify-center w-full">
                    <button
                      onClick={() => {
                        const allSelected = weekDates.every(d => manualSelections[d]?.has('All Day'));
                        setManualSelections(prev => {
                          const updated = { ...prev };
                          for (const d of weekDates) {
                            updated[d] = new Set(allSelected ? [] : ['All Day']);
                          }
                          return updated;
                        });
                      }}
                      className="text-blue-600 text-sm underline"
                    >
                      {weekDates.every(d => manualSelections[d]?.has('All Day')) ? 'Unselect all' : 'Select all'}
                    </button>
                  </div>
                )}
              </div>
            );
          });
      })()
    : dates.map(date => (
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

                const [h, m] = time.split(':').map(Number);
                const end = new Date(0, 0, 0, h, m + durationMinutes);
                const endTime = end.toTimeString().slice(0, 5);

                const segments = getSlotBusySegments(
                  time,
                  date,
                  busySlots,
                  durationMinutes
                ) as BusySegment[];

                return (
                  <TimeSlotButton
                    key={time}
                    label={`${time} - ${endTime}`}
                    segments={segments}
                    selected={isSelected}
                    customMode={customMode}
                    onClick={customMode ? () => {
                      setManualSelections(prev => {
                        const next = new Set(prev[date] || []);
                        next.has(time) ? next.delete(time) : next.add(time);
                        return { ...prev, [date]: next };
                      });
                    } : undefined}
                  />
                );
              })}
            </div>
          </div>

          {customMode && (
            <div className="mt-2 flex justify-center w-full">
              <button
                onClick={() => {
                  const allSelected = fullSlots.every(t => manualSelections[date]?.has(t));
                  setManualSelections(prev => ({
                    ...prev,
                    [date]: new Set(allSelected ? [] : fullSlots),
                  }));
                }}
                className="text-blue-600 text-sm underline"
              >
                {manualSelections[date]?.size === fullSlots.length ? 'Unselect all' : 'Select all'}
              </button>
            </div>
          )}
        </div>
      ));

return <>{grouped}</>;
        })()}

<SubmitAndRedirectButton
  id={idStr}
  text="Send out!"
  apiEndpoint="/api/save-response"
  payload={buildPayload}
  successHref={(theId) => `/rsvp/${theId}/results_rsvp`}
  guard={() => !!idStr && !!name && !!email}
  disabled={!name || !email}
/>

      </div>
    </section>

    <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
      <div className="mb-1 font-semibold text-gray-800 text-base">📌Prikkr</div>
      <div className="mb-3 italic text-gray-600 text-sm">"The smart way to plan together."</div>
      <div className="mb-2">Office: Utrecht, Netherlands</div>
      <div className="flex justify-center gap-4 text-blue-600 text-sm mt-2">
        <button onClick={() => router.push('/contact')} className="hover:underline">Contact</button>
        <button onClick={() => router.push('/privacy-policy')} className="hover:underline">Privacy Policy</button>
        <button onClick={() => router.push('/terms')} className="hover:underline">Terms of Service</button>
      </div>
      <div className="mt-4 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
      </div>
    </footer>

    <style jsx global>{`
  @keyframes bounce-slow {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }
  }

  .animate-bounce-slow {
    animation: bounce-slow 1.5s ease-in-out infinite;
  }
`}</style>

  </main>
);

}

