'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import {fetchOutlookBusy} from '@/calendar/fetchOutlookBusy';
import {fetchGoogleBusy} from '@/calendar/fetchGoogleBusy';
import { DateTime } from 'luxon';
import {
  getDateRange,
  getWeekday,
  formatDisplayDate,
  getSlotBusySegments,
  isSlotBusy,
  getSlotTypeLabel,
  TimeSlot
} from '@/utils/calendarHelpers';



export default function PrikkrPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [busySlots, setBusySlots] = useState<TimeSlot[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [extendedHours, setExtendedHours] = useState(false);
  const [slotDuration, setSlotDuration] = useState<string>('hourly');
  const [customMode, setCustomMode] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<string, Set<string>>>({});
  const [isSending, setIsSending] = useState(false);


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


useEffect(() => {
  if (!range || !session?.accessToken || !session.provider) return;

  const loadBusySlots = async () => {
    const accessToken = session.accessToken;

    const busy = session.provider === 'google'
      ? await fetchGoogleBusy(range.from, range.to, accessToken)
      : await fetchOutlookBusy(range.from, range.to, accessToken);

    setBusySlots(busy);
  };

  loadBusySlots();
}, [range, session]);

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

  const handleSendOut = async () => {
    setIsSending(true);
    const id = params?.id;
    const userName = session?.user?.name || session?.user?.email || 'Anonymous';
    if (!id || typeof id !== 'string') return;

    let serialized: Record<string, string[]> = {};

    if (customMode) {
      for (const [date, times] of Object.entries(manualSelections)) {
        serialized[date] = Array.from(times);
      }
    } else {
      const computed: Record<string, string[]> = {};
      for (const date of dates) {
        const availableSlots: string[] = [];

for (const time of fullSlots) {
  if (time === 'All Day') {
    const dayStart = DateTime.fromISO(date + 'T00:00:00', { zone: 'Europe/Amsterdam' });
    const dayEnd = dayStart.plus({ days: 1 });
    const totalMinutes = dayEnd.diff(dayStart, 'minutes').minutes;

    const busyDur = busySlots
      .map(({ start, end }) => {
        const busyStart = DateTime.fromISO(start);
        const busyEnd = DateTime.fromISO(end);
        return {
          start: Math.max(0, busyStart.diff(dayStart, 'minutes').minutes),
          end: Math.min(totalMinutes, busyEnd.diff(dayStart, 'minutes').minutes),
        };
      })
      .filter(({ start, end }) => start < end)
      .reduce((sum, b) => sum + (b.end - b.start), 0);

    const freeRatio = 1 - busyDur / totalMinutes;

    if (freeRatio >= 1) {
      availableSlots.push('All Day');
    } else if (freeRatio >= 0.8) {
      availableSlots.push('~All Day'); // special maybe marker
    }
  } else {
    const isBusy = isSlotBusy(time, date, busySlots, durationMinutes);
    if (!isBusy) {
      availableSlots.push(time);
    }
  }
}

        if (availableSlots.length > 0) {
          computed[date] = availableSlots;
        }
      }
      serialized = computed;
    }

    try {
      await fetch('/api/save-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: userName,
          email: session?.user?.email,
          selections: serialized,
          isCreator: true,
        }),
      });

      router.push(`/share/${id}`);
    } catch (error) {
      console.error('❌ Failed to save response:', error);
    } finally {
      setIsSending(false);
    }
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
  Object.entries(
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
) : (

  // everything else remains untouched for other slot durations
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

        <div
className={`w-full grid gap-x-2 gap-y-2 auto-rows-fr ${
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
    : 'grid-cols-3 sm:grid-cols-4 sm:grid-cols-6'
}`}
>
          {fullSlots.map(time => {
            const isSelected = manualSelections[date]?.has(time);
            const [startH, startM] = time.split(':').map(Number);
            const step = parseInt(String(slotDuration)); // Always correct, even for 5, 7, etc.
            const end = new Date(0, 0, 0, startH, startM + step);
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
    className={`px-3 py-2 h-[44px] text-[10px] sm:text-sm font-semibold text-center rounded-xl transition-all duration-100 shadow-[0_4px_10px_rgba(0,0,0,0.25)] border ${
  isSelected
    ? 'bg-green-500 text-white'
    : 'text-gray-800 hover:bg-gray-100'
}`}
    style={{
      background: isSelected ? undefined : backgroundGradient,
    }}
  >
    <div className="flex items-center justify-center gap-1">
      <span
  className={`whitespace-nowrap ${
    durationMinutes <= 10 ? 'text-[11px] sm:text-sm' : 'text-sm sm:text-base'
  }`}
>
  {`${time} - ${endTime}`}
</span>
      {isSelected && (
        <span className="text-white text-xs float-check">✔</span>
      )}
    </div>
  </button>
);
}


            const segments = getSlotBusySegments(time, date, busySlots, durationMinutes);
            const gradientStyle = segments.length
              ? {
                  background: `linear-gradient(to right, ${segments
                    .map(s => `${s.color} ${s.from * 100}% ${s.to * 100}%`)
                    .join(', ')})`,
                  color: '#fff',
                }
              : {};

              const isFullyGreen =
  segments.length === 1 &&
  segments[0].color === '#22c55e' &&
  segments[0].from === 0 &&
  segments[0].to === 1;

  const hasRed = segments.some(s => s.color === '#ef4444');
return (
  <button
    key={time}
    className="min-w-[87px] sm:min-w-0 px-3 py-4 text-[10px] sm:text-sm font-semibold text-center rounded-xl w-full transition-all duration-100 shadow-[0_4px_10px_rgba(0,0,0,0.25)] border"
    style={gradientStyle}
  >
    <div className="flex items-center justify-center gap-1">
      <span>{`${time} - ${endTime}`}</span>
      {isFullyGreen ? (
        <span className="text-white text-xs float-check">✔</span>
      ) : hasRed ? (
        <span className="text-white text-xs">✘</span>
      ) : null}
    </div>
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
            {manualSelections[date]?.size === fullSlots.length
              ? 'Unselect all'
              : 'Select all'}
          </button>
        </div>
      )}
    </div>
  ))
)}


          <button
            onClick={handleSendOut}
            disabled={isSending}
            className={`mt-6 px-6 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-600 text-white hover:bg-green-700 border border-green-500 ${
              isSending ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSending ? 'Sending...' : 'Send out!'}
          </button>
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
