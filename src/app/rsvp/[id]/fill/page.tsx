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



export default function RSVPFillPage() {
  const params = useParams();
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
  const [isSending, setIsSending] = useState(false);

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


  // [...existing imports and logic as previously updated...]

// Continue component from logic setup

// UI rendering starts here
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

const grouped = (slotDuration === 'daily' || slotDuration === '1440')
  ? Object.entries(
      dates.reduce((acc: Record<string, string[]>, dateStr: string) => {
        const date = DateTime.fromISO(dateStr);
        const weekStart = date.startOf('week').toISODate()!;
        if (!acc[weekStart]) acc[weekStart] = [];
        acc[weekStart].push(dateStr);
        return acc;
      }, {})
    ).map(([weekStartStr, weekDates], weekIdx) => {
      const startDate = DateTime.fromISO(weekStartStr);
      const endDate = startDate.plus({ days: 6 });

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

            {/* Grid of 7 buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 flex-grow">
              {weekDates.map(date => {
                const isSelected = manualSelections[date]?.has('All Day');

                const dayStart = DateTime.fromISO(date + 'T00:00:00', { zone: 'Europe/Amsterdam' });
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

                const baseClass =
                  "w-full px-2 py-4 text-sm font-semibold text-center rounded-xl transition-all duration-100 shadow-[0_8px_20px_rgba(0,0,0,0.25)] border";

                if (customMode) {
                  const bg =
                    isFullyFree
                      ? "bg-green-100 hover:bg-green-200 text-gray-800"
                      : isMostlyFree
                      ? "bg-yellow-100 hover:bg-yellow-200 text-gray-800"
                      : "bg-red-100 hover:bg-red-200 text-gray-800";

                  return (
                    <button
                      key={date}
                      onClick={() => handleSlotToggle(date, 'All Day')}
                      className={`${baseClass} ${isSelected ? 'bg-green-500 text-white' : bg}`}
                    >
                      {dateLabel}
                    </button>
                  );
                } else {
                  const bg =
                    isFullyFree
                      ? "bg-green-500"
                      : isMostlyFree
                      ? "bg-yellow-400"
                      : "bg-red-500";

                  const icon = isFullyFree ? '✔' : isMostlyFree ? '~' : '✘';

                  return (
                    <div
                      key={date}
                      className={`${baseClass} ${bg} text-white`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {dateLabel}
                        <span className={`inline-block ml-1 text-base ${icon === '✘' ? '' : 'animate-bounce'}`}>
                          {icon}
                        </span>
                      </span>
                    </div>
                  );
                }
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
    })
            : dates.map(date => (
                <div
                  key={date}
                  className="bg-white rounded-xl shadow-md px-4 py-1 mb-2 w-full max-w-screen-xl mx-auto"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
                    <div className="text-left sm:min-w-[10rem]">
                      <div className="text-sm text-gray-500 font-medium">{getWeekday(date)}</div>
                      <div className="text-base sm:text-lg font-semibold text-gray-900">
                        {formatDisplayDate(date)}
                      </div>
                    </div>

<div
  className={`w-full grid auto-rows-fr gap-x-2 gap-y-2 ${
    slotType === 'hourly'
      ? extendedHours
        ? 'grid-cols-3 sm:grid-cols-6'
        : 'grid-cols-3 sm:grid-cols-4 sm:grid-cols-8'
      : slotType === 'quarter-hour'
      ? 'grid-cols-3 sm:grid-cols-6 sm:grid-cols-8'
      : slotType === 'half-hour'
      ? 'grid-cols-3 sm:grid-cols-5 sm:grid-cols-6'
      : slotType === '10-minutes'
      ? 'grid-cols-3 sm:grid-cols-4 sm:grid-cols-6'
      : slotType === 'daily'
      ? 'grid-cols-3 sm:grid-cols-7'
      : 'grid-cols-3 sm:grid-cols-4 sm:grid-cols-6'
  }`}
>
                      {fullSlots.map(time => {
                        const isSelected = manualSelections[date]?.has(time);
                        const [h, m] = time.split(':').map(Number);
                        const end = new Date(0, 0, 0, h, m + durationMinutes);
                        const endTime = end.toTimeString().slice(0, 5);

                        if (customMode) {
  const segments = getSlotBusySegments(time, date, busySlots, durationMinutes);

  const backgroundGradient = segments.length
    ? `linear-gradient(to right, ${segments
        .map(s => `${s.color}33 ${s.from * 100}% ${s.to * 100}%`) // '33' adds ~20% opacity
        .join(', ')})`
    : undefined;

 return (
  <button
  key={time}
  onClick={() => handleSlotToggle(date, time)}
  className={`px-2 sm:px-3 py-2 min-h-[2.25rem] w-full text-xs sm:text-sm font-semibold text-center rounded-xl transition-all duration-100 shadow-md border whitespace-nowrap ${
    isSelected
      ? 'bg-green-500 text-white'
      : 'text-gray-800 hover:bg-gray-100'
  }`}
  style={{
    background: isSelected ? undefined : backgroundGradient,
  }}
>
  <div className="flex items-center justify-center gap-1">
    <span>{`${time} - ${endTime}`}</span>
    {isSelected && <span className="text-white text-xs float-check">✔</span>}
  </div>
</button>
);
}


                        const segments = getSlotBusySegments(time, date, busySlots, durationMinutes);
                        const gradientStyle = segments.length
                          ? {
                              background: `linear-gradient(to right, ${segments.map(s => `${s.color} ${s.from * 100}% ${s.to * 100}%`).join(', ')})`,
                              color: '#fff',
                            }
                          : {};

                        const isFullyGreen = segments.length === 1 && segments[0].color === '#22c55e';

return (
  <button
    key={time}
    className="min-w-[87px] sm:min-w-0 px-3 py-4 text-[10px] sm:text-sm font-semibold text-center rounded-xl w-full transition-all duration-100 shadow-[0_4px_10px_rgba(0,0,0,0.25)] border"
    style={gradientStyle}
  >
    {`${time} - ${endTime}`}
    {isFullyGreen && (
      <span className="text-white text-xs ml-1 float-check animate-bounce-slow inline-block">✔</span>
    )}
  </button>
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
                        {manualSelections[date]?.size === fullSlots.length ? 'Unselect all' : 'Select all'}
                      </button>
                    </div>
                  )}
                </div>
              ));

          return <>{grouped}</>;
        })()}

        <button
          onClick={async () => {
            setIsSending(true);
            const id = params?.id;
            if (!id || !name || !email || typeof id !== 'string') return;
            localStorage.setItem(`prikkr-name-${id}`, name);
            localStorage.setItem(`prikkr-email-${id}`, email);
            const fullSlots = generateSlots();
            const dates = range ? getDateRange(range.from, range.to) : [];
            let selections: Record<string, string[]> = {};
            if (customMode) {
              for (const [date, set] of Object.entries(manualSelections)) {
                selections[date] = Array.from(set);
              }
            } else {
              for (const date of dates) {
                const available: string[] = [];
                for (const time of fullSlots) {
                  const segments = getSlotBusySegments(time, date, busySlots, durationMinutes);
                  const isFree = !segments.some(s => s.color === '#ef4444');
                  if (isFree) available.push(time);
                }
                if (available.length > 0) {
                  selections[date] = available;
                }
              }
            }
            await fetch('/api/save-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, name, email, selections }),
            });
            router.push(`/rsvp/${id}/results_rsvp`);
          }}
          disabled={isSending || !name || !email}
          className={`mt-6 px-6 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow bg-green-600 text-white hover:bg-green-700 border border-green-500 ${isSending || !name || !email ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSending ? 'Sending...' : 'Send out!'}
        </button>
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

