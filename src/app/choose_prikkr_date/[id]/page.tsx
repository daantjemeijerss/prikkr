'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DateTime } from 'luxon';

interface ResponseEntry {
  name: string;
  selections: Record<string, Set<string> | string[] | Record<string, boolean>>;
}

function getWeekday(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function groupDatesByWeek(dates: string[]) {
  const weeks: Record<string, string[]> = {};
  dates.forEach((dateStr) => {
    const dt = DateTime.fromISO(dateStr);
    const weekKey = `Week ${dt.weekNumber} (${dt.startOf('week').toFormat('dd MMM')} - ${dt.endOf('week').toFormat('dd MMM')})`;
    if (!weeks[weekKey]) weeks[weekKey] = [];
    weeks[weekKey].push(dateStr);
  });
  return weeks;
}


export default function ChoosePrikkrDatePage() {
  const router = useRouter();
  const params = useParams();

  const [results, setResults] = useState<ResponseEntry[]>([]);
  const [allSlots, setAllSlots] = useState<Record<string, Record<string, number>>>({});
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [extendedHours, setExtendedHours] = useState(false);
  const [sendingTarget, setSendingTarget] = useState<string | null>(null);
  const [slotDuration, setSlotDuration] = useState<string | number>('hourly');


  useEffect(() => {
    if (!params?.id || typeof params.id !== 'string') {
      console.warn('Invalid or missing params.id:', params?.id);
      return;
    }
    console.log('✅ Loaded Prikkr ID:', params.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prikkr-latest-id', params.id);
    }
    fetchMeta();
    fetchResponses();
  }, [params]);

  async function fetchMeta() {
    const id = params?.id;
    if (!id || typeof id !== 'string') {
      console.warn('❌ fetchMeta: Invalid ID:', id);
      return;
    }
    const res = await fetch(`/api/get-meta?id=${id}`);
    if (!res.ok) return;
    const meta = await res.json();
    setRange(meta.range);
    setExtendedHours(meta.extendedHours);
    setSlotDuration(meta.slotDuration || 'hourly');
  }

  async function fetchResponses() {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;
    const res = await fetch(`/api/get-responses?id=${id}`);
    if (!res.ok) return;
    const parsed: ResponseEntry[] = await res.json();
    setResults(parsed);

    const validParticipants = parsed.filter((p) =>
      Object.values(p.selections || {}).some(
        (v) =>
          (Array.isArray(v) && v.length > 0) ||
          (v instanceof Set && v.size > 0) ||
          (typeof v === 'object' && Object.keys(v).length > 0)
      )
    );
    setTotal(validParticipants.length);

    const availability: Record<string, Record<string, number>> = {};
    parsed.forEach((entry) => {
      Object.entries(entry.selections).forEach(([date, times]) => {
        const timeArray = Array.isArray(times)
          ? times
          : times instanceof Set
          ? Array.from(times)
          : Object.keys(times);

        if (!availability[date]) availability[date] = {};
        timeArray.forEach((time) => {
          availability[date][time] = (availability[date][time] || 0) + 1;
        });
      });
    });
    setAllSlots(availability);
  }

  function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}


  function getDateRange(from: string, to: string): string[] {
    const dates = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  const fullSlots = Array.from({ length: (extendedHours ? 23 : 17) - 9 }, (_, i) =>
    `${String(9 + i).padStart(2, '0')}:00`
  );

  const sortedDates = range ? getDateRange(range.from, range.to) : [];

  function durationInMinutes(value: string | number): number {
  const map: Record<string, number> = {
    '5-minutes': 5,
    '10-minutes': 10,
    'quarter-hour': 15,
    'half-hour': 30,
    'hourly': 60,
    'daily': 1440,
  };
  if (typeof value === 'number') return value;
  if (!isNaN(Number(value))) return Number(value);
  return map[value] ?? 60;
}

function generateSlots(slotDuration: string | number, extendedHours: boolean) {
  const increment = durationInMinutes(slotDuration); // ✅ define increment here
  const slots: string[] = [];

  for (let hour = 9; hour <= (extendedHours ? 22 : 17); hour++) {
    for (let minute = 0; minute < 60; minute += increment) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }

  return slots;
}

  return (

<main className="relative flex flex-col min-h-screen bg-white text-gray-900">
  <img
    src="/images/prikkr_logo_transparent.png"
    alt="Prikkr logo"
    onClick={() => router.push("/")}
    className="absolute top-2 left-2 h-20 sm:h-24 lg:h-48 w-auto cursor-pointer z-10"
  />
  <section className="w-full bg-red-50 py-16 px-4 sm:px-6">
    <div className="flex flex-col items-center text-start mx-auto w-full max-w-[90rem]">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">Choose your own date</h1>



{range && sortedDates.length > 0 && Object.keys(allSlots).length > 0 && (
  slotDuration?.toString() === '1440' ? (
    Object.entries(groupDatesByWeek(sortedDates)).map(([weekLabel, datesInWeek]) => (
      <div key={weekLabel} className="bg-white rounded-xl shadow-xl px-3 py-2 mb-6 w-full max-w-screen-xl mx-auto">
        <h3 className="text-left font-semibold text-gray-500 mb-4 ml-1">{weekLabel}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {datesInWeek.map(date => {
            const count = Object.values(allSlots[date] || {}).reduce((acc, val) => acc + val, 0);
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            let bgColor = "bg-red-800 text-white";
            if (percent === 100) bgColor = "bg-green-600 text-white";
            else if (percent >= 75) bgColor = "bg-yellow-400 text-white";
            else if (percent >= 50) bgColor = "bg-orange-500 text-white";
            else if (percent >= 25) bgColor = "bg-red-600 text-white";

            return (
              <div key={date} className={`rounded-xl p-4 text-sm sm:text-base font-medium text-center shadow-[0_8px_20px_rgba(0,0,0,0.25)] ${bgColor}`}>
                <div className="text-xs text-gray-200 mb-1">{getWeekday(date)}</div>
                <div className="font-bold">{formatDisplayDate(date)}</div>
                <div className="text-xs mt-1">{percent}%</div>
              </div>
            );
          })}
        </div>
      </div>
    ))
  ) : (
    Object.entries(groupDatesByWeek(sortedDates)).map(([weekLabel, datesInWeek]) => (
      <div key={weekLabel} className="bg-white rounded-2xl shadow-md px-3 py-2 mb-6 w-full max-w-screen-xl mx-auto">
        <h3 className="text-left font-semibold text-gray-900 mb-4 ml-1">{weekLabel}</h3>
        <div className="space-y-2">
          {datesInWeek.map(date => {
            const slotsForDay = allSlots[date] || {};
            const mdCols = extendedHours ? 'md:grid-cols-7' : 'md:grid-cols-8';
            const lgCols = extendedHours ? 'lg:grid-cols-7' : 'lg:grid-cols-8';

            return (
              <div key={date} className="bg-white rounded-xl shadow-md px-4 py-2 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                  <div className="text-left min-w-[10rem] pt-1 self-start">
                    <div className="text-sm text-gray-500 font-medium">{getWeekday(date)}</div>
                    <div className="text-base sm:text-lg font-semibold text-gray-900">{formatDisplayDate(date)}</div>
                  </div>
                  <div className={`grid w-full grid-cols-2 sm:grid-cols-4 ${mdCols} ${lgCols} gap-x-1 gap-y-0 sm:gap-x-1 sm:gap-y-1`}>
                    {generateSlots(slotDuration, extendedHours).map((time) => {
                      const count = slotsForDay[time] || 0;
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                      const [hh, mm] = time.split(':').map(Number);
                      const start = DateTime.fromObject({ hour: hh, minute: mm });
                      const end = start.plus({ minutes: durationInMinutes(slotDuration) });
                      const label = `${start.toFormat('HH:mm')} - ${end.toFormat('HH:mm')}`;

                      let bgColor = "bg-red-800 text-white";
                      if (percent === 100) bgColor = "bg-green-600 text-white";
                      else if (percent >= 75) bgColor = "bg-yellow-400 text-white";
                      else if (percent >= 50) bgColor = "bg-orange-500 text-white";
                      else if (percent >= 25) bgColor = "bg-red-600 text-white";

                      return (
                        <div key={time} className={`min-w-0 px-2 py-4 text-[10px] sm:text-sm font-semibold 
                          rounded-xl border border-gray-300 shadow-[0_8px_20px_rgba(0,0,0,0.25)] 
                          flex items-center justify-center text-center ${bgColor}`}>
                          <div className="flex flex-col items-center leading-tight">
                            <span>{label}</span>
                            <span>{percent}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))
  )
)}




          {results.length === 0 && (
            <p className="text-center text-gray-500 mt-8">No participants yet.</p>
          )}
        </div>
      </section>
            {/* Footer */}
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
    </main>
  );
}
