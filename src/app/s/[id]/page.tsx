'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface TimeSlot {
  start: string;
  end: string;
}

function generateTimeSlots(start = 9, end = 17): string[] {
  const slots: string[] = [];
  for (let hour = start; hour < end; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
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

  useEffect(() => {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;

    const fetchMeta = async () => {
      const res = await fetch(`/api/get-meta?id=${id}`);
      if (!res.ok) return;

      const { range, extendedHours } = await res.json();
      setRange(range);
      setExtendedHours(extendedHours);
    };

    fetchMeta();
  }, [params]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!range || !session?.accessToken) return;

      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
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
      });

      const data = await res.json();
      const busy = data.calendars?.primary?.busy || [];
      setBusySlots(busy);
    };

    fetchAvailability();
  }, [range, session]);

  const fullSlots = extendedHours ? generateTimeSlots(9, 22) : generateTimeSlots(9, 17);
  const dates = range ? getDateRange(range.from, range.to) : [];

  const handleSlotToggle = (date: string, time: string) => {
    setManualSelections((prev) => {
      const newSet = new Set(prev[date] || []);
      newSet.has(time) ? newSet.delete(time) : newSet.add(time);
      return { ...prev, [date]: newSet };
    });
  };

  const handleDayToggle = (date: string) => {
    setManualSelections((prev) => {
      const allSelected = fullSlots.every((t) => prev[date]?.has(t));
      return {
        ...prev,
        [date]: new Set(allSelected ? [] : fullSlots),
      };
    });
  };

  const handleSendOut = async () => {
    const id = params?.id;
    if (!id || typeof id !== 'string' || !session?.user?.name) return;

    const serialized: Record<string, string[]> = {};
    for (const [date, times] of Object.entries(manualSelections)) {
      serialized[date] = Array.from(times);
    }

    await fetch('/api/save-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name: session.user.name,
        selections: serialized,
        isCreator: true, // Optional flag (in case you want to show who created it)
        }),
      });


    router.push(`/share/${id}`);
  };

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating logo */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-0 left-4 h-48 w-auto cursor-pointer z-10"
      />

      {/* Main section with soft pink background */}
      <section className="w-full bg-red-50 py-12 px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Your Calendar Availability</h1>

          {range && (
            <div className="text-center mb-4 text-lg">
              <p>From: {range.from}</p>
              <p>To: {range.to}</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!customMode} onChange={() => setCustomMode(false)} />
                <span>Keep dates</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={customMode} onChange={() => setCustomMode(true)} />
                <span>Custom dates</span>
              </label>
            </div>
          </div>
        </div>

        {dates.map((date) => (
          <div key={date} className="w-full max-w-2xl mb-4 mx-auto">
            <div className="font-semibold mb-1 flex justify-between items-center">
              <span>{date}</span>
              {customMode && (
                <button
                  onClick={() => handleDayToggle(date)}
                  className="text-blue-600 text-sm underline"
                >
                  {manualSelections[date]?.size === fullSlots.length ? 'Unselect all' : 'Select all'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {fullSlots.map((time) => {
                const busy = isSlotBusy(time, date, busySlots);
                const isSelected = manualSelections[date]?.has(time);
                const showGreen = !customMode && !busy;
                const showRed = !customMode && busy;

                return (
                  <button
                    key={time}
                    onClick={() => customMode && handleSlotToggle(date, time)}
                    className={`px-2 py-1 text-sm border rounded ${
                      customMode
                        ? isSelected
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100'
                        : showGreen
                        ? 'bg-green-500 text-white'
                        : showRed
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="text-center mt-8">
          <button
            onClick={handleSendOut}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded shadow transition hover:scale-105"
          >
            Send out!
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800">Prikkr</div>
        <div className="mb-3 italic text-gray-600">the smart way to plan together.</div>
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
