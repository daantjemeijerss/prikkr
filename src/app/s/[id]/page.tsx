'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface TimeSlot {
  start: string;
  end: string;
}

function getDateRange(from: string, to: string): string[] {
  const dates = [];
  const current = new Date(from);
  const endDate = new Date(to);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getWeekday(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isSlotBusy(slotTime: string, date: string, busySlots: TimeSlot[]): boolean {
  const slotStart = new Date(`${date}T${slotTime}:00`);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
  return busySlots.some(({ start, end }) => {
    const busyStart = new Date(start);
    const busyEnd = new Date(end);
    return busyStart < slotEnd && busyEnd > slotStart;
  });
}

export default function PrikkrPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [busySlots, setBusySlots] = useState<TimeSlot[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [extendedHours, setExtendedHours] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<string, Set<string>>>({});
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;

    fetch(`/api/get-meta?id=${id}`)
      .then(res => res.json())
      .then(({ range, extendedHours }) => {
        setRange(range);
        setExtendedHours(extendedHours);
      });
  }, [params]);

  useEffect(() => {
    if (!range || !session?.accessToken) return;

    fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: `${range.from}T00:00:00.000Z`,
        timeMax: `${range.to}T23:59:59.999Z`,
        items: [{ id: 'primary' }],
      }),
    })
      .then(res => res.json())
      .then(data => {
        setBusySlots(data.calendars?.primary?.busy || []);
      });
  }, [range, session]);

  const fullSlots = Array.from({ length: (extendedHours ? 23 : 17) - 9 }, (_, i) =>
    `${String(9 + i).padStart(2, '0')}:00`
  );

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
        const availableSlots = session?.accessToken
          ? fullSlots.filter(time => !isSlotBusy(time, date, busySlots))
          : fullSlots;

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
            <p className="text-base sm:text-lg text-gray-800 mb-8">
              Select your availability between{' '}
              <strong>{formatDisplayDate(range.from)}</strong> and{' '}
              <strong>{formatDisplayDate(range.to)}</strong>
            </p>
          )}

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-10">
            <label className="flex items-center gap-x-2 gap-y-1 text-base sm:text-lg">
              <input type="radio" checked={!customMode} onChange={() => setCustomMode(false)} />
              <span>Use current availability</span>
            </label>
            <label className="flex items-center gap-x-2 gap-y-1 text-base sm:text-lg">
              <input type="radio" checked={customMode} onChange={() => setCustomMode(true)} />
              <span>Manually select times</span>
            </label>
          </div>

          {dates.map(date => (
            <div
              key={date}
              className="bg-white rounded-xl shadow-md px-4 py-1 mb-2 w-full max-w-screen-xl mx-auto"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                <div className="text-left sm:min-w-[10rem]">
                  <div className="text-sm text-gray-500 font-medium">{getWeekday(date)}</div>
                  <div className="text-base sm:text-lg font-semibold text-gray-900">
                    {formatDisplayDate(date)}
                  </div>
                </div>

                <div
                className={`w-full grid gap-x-3 gap-y-1 ${
                  extendedHours
                  ? 'grid-cols-4 sm:grid-cols-7'
                  : 'grid-cols-4 sm:grid-cols-8'
                  }`}
                >

                  {fullSlots.map(time => {
                    const busy = isSlotBusy(time, date, busySlots);
                    const isSelected = manualSelections[date]?.has(time);
                    const showGreen = !customMode && !busy;
                    const showRed = !customMode && busy;
                    const endTime = `${String(Number(time.split(':')[0]) + 1).padStart(2, '0')}:00`;

                    return (
                      <button
                        key={time}
                        onClick={() => customMode && handleSlotToggle(date, time)}
                        className={`min-w-[87px] sm:min-w-0 px-3 py-3 text-[10px] sm:text-sm font-semibold text-center rounded-xl w-full transition-all duration-100 shadow-[0_4px_10px_rgba(0,0,0,0.25)] border
                          ${
                            customMode
                              ? isSelected
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-800 hover:bg-gray-100'
                              : showGreen
                              ? 'bg-green-500 text-white'
                              : showRed
                              ? 'bg-red-500 text-white'
                              : 'bg-white text-gray-800 hover:bg-gray-100'
                          }`}
                      >
                        {time} - {endTime}
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
          ))}

          <button
            onClick={handleSendOut}
            disabled={isSending}
            className={`mt-6 px-6 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-600 text-white hover:bg-green-700 border border-green-500 ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSending ? 'Sending...' : 'Send out!'}
          </button>
        </div>
      </section>

      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800">📌Prikkr</div>
        <div className="mb-3 italic text-gray-600">"The smart way to plan together."</div>
        <div className="mb-2">Office: Utrecht, Netherlands</div>
        <button onClick={() => router.push('/contact')} className="text-blue-600 hover:underline">
          Contact
        </button>
        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
