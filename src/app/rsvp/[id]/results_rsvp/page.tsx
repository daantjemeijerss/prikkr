'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ResponseEntry {
  name: string;
  selections: Record<string, Set<string> | string[] | Record<string, boolean>>;
}

function getWeekday(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [results, setResults] = useState<ResponseEntry[]>([]);
  const [allSlots, setAllSlots] = useState<Record<string, Record<string, number>>>({});
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [extendedHours, setExtendedHours] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('prikkr-meta');
    if (cached && !range) {
      const parsed = JSON.parse(cached);
      setRange(parsed.range);
      setExtendedHours(parsed.extendedHours);
    }
  }, [range]);

  useEffect(() => {
    if (!params?.id || typeof params.id !== 'string') return;
    fetchMeta();
    fetchResponses();
  }, [params]);

  async function fetchMeta() {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;
    const res = await fetch(`/api/get-meta?id=${id}`);
    if (!res.ok) return;
    const meta = await res.json();
    setRange(meta.range);
    setExtendedHours(meta.extendedHours);
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

  const fullSlots = Array.from({ length: (extendedHours ? 23 : 17) - 9 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`);

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

  function formatDisplayDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const sortedDates = range ? getDateRange(range.from, range.to) : [];

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push("/")}
        className="absolute top-2 left-2 h-20 sm:h-24 lg:h-48 w-auto cursor-pointer z-10"
      />
      <section className="w-full bg-red-50 py-16 px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mx-auto w-full max-w-[90rem]">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">Group Availability</h1>
          <p className="text-base sm:text-lg font-medium text-gray-700 mb-4">
            {total} participant{total !== 1 ? 's' : ''}
          </p>

          {range && sortedDates.length > 0 && Object.keys(allSlots).length > 0 && sortedDates.map((date) => {
            const slotsForDay = allSlots[date] || {};
            return (
              <div key={date} className="bg-white rounded-xl shadow-md px-4 py-1 mb-2 w-full max-w-screen-xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                  <div className="text-left min-w-[10rem]">
                    <div className="text-sm text-gray-500 font-medium">{getWeekday(date)}</div>
                    <div className="text-base sm:text-lg font-semibold text-gray-900">{formatDisplayDate(date)}</div>
                  </div>
                  <div className={`w-full grid gap-x-3 gap-y-1 ${extendedHours ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-4 sm:grid-cols-8'}`}>
                    {fullSlots.map((time) => {
                      const count = slotsForDay[time] || 0;
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                      const [hourStr] = time.split(':');
                      const endHour = `${String(parseInt(hourStr, 10) + 1).padStart(2, '0')}:00`;
                      let bgColor = "bg-red-800 text-white";
                      if (percent === 100) bgColor = "bg-green-600 text-white";
                      else if (percent >= 75) bgColor = "bg-yellow-400 text-white";
                      else if (percent >= 50) bgColor = "bg-orange-500 text-white";
                      else if (percent >= 25) bgColor = "bg-red-600 text-white";
                      return (
                        <div
                          key={time}
                          className={`min-w-[87px] sm:min-w-0 px-3 py-2 text-[10px] sm:text-sm font-semibold text-center rounded-xl border border-gray-300 shadow-[0_8px_20px_rgba(0,0,0,0.25)] ${bgColor}`}
                        >
                          {time} - {endHour}<br />
                          {percent}%
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

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
