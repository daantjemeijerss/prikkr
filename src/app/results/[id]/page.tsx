'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ResponseEntry {
  name: string;
  selections: Record<string, Set<string> | string[] | Record<string, boolean>>;
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
    const id = params?.id;
    if (!id || typeof id !== 'string') return;

    async function fetchMeta() {
      const res = await fetch(`/api/get-meta?id=${id}`);
      if (!res.ok) return;
      const meta = await res.json();
      setRange(meta.range);
      setExtendedHours(meta.extendedHours);
    }

    async function fetchResponses() {
      const res = await fetch(`/api/get-responses?id=${id}`);
      if (!res.ok) return;

      const parsed: ResponseEntry[] = await res.json();
      setResults(parsed);

      const validParticipants = parsed.filter(p =>
        Object.values(p.selections || {}).some(
          v =>
            (Array.isArray(v) && v.length > 0) ||
            (v instanceof Set && v.size > 0) ||
            (typeof v === 'object' && Object.keys(v).length > 0)
        )
      );
      setTotal(validParticipants.length);

      const availability: Record<string, Record<string, number>> = {};
      parsed.forEach(entry => {
        Object.entries(entry.selections).forEach(([date, times]) => {
          const timeArray = Array.isArray(times)
            ? times
            : times instanceof Set
            ? Array.from(times)
            : Object.keys(times);

          if (!availability[date]) availability[date] = {};
          timeArray.forEach(time => {
            availability[date][time] = (availability[date][time] || 0) + 1;
          });
        });
      });
      setAllSlots(availability);
    }

    fetchMeta();
    fetchResponses();
  }, [params]);

  const fullSlots = Array.from({ length: (extendedHours ? 22 : 17) - 9 }, (_, i) =>
    `${String(9 + i).padStart(2, '0')}:00`
  );

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
  
  const sortedDates = range ? getDateRange(range.from, range.to) : [];


  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating logo */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-0 left-4 h-48 w-auto cursor-pointer z-10"
      />

      {/* Main section with red background */}
      <section className="w-full bg-red-50 py-12 px-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold mb-6">Group Availability</h1>
        </div>

        {sortedDates.map(date => {
          const slotsForDay = allSlots[date] || {};
          const percentages = Object.values(slotsForDay).map(count =>
            Math.round((count / total) * 100)
          );
          const maxPercentage = Math.max(...percentages, 0);

          return (
            <div key={date} className="w-full max-w-2xl mb-6 mx-auto">
              <div className="font-semibold text-lg mb-1 flex justify-between items-center">
                <span>{date}</span>
                <span className="text-sm text-gray-500">
                  {total > 0 ? `${maxPercentage}% availability` : 'No data'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {fullSlots.map(time => {
                  const count = slotsForDay[time] || 0;
                  const percent = Math.round((count / total) * 100);
                  const endHour =
                    String(Number(time.split(':')[0]) + 1).padStart(2, '0') + ':00';

                  let bgColor = 'bg-red-100 text-red-800';
                  if (percent === 100) bgColor = 'bg-green-600 text-white';
                  else if (percent >= 75) bgColor = 'bg-green-300 text-green-900';
                  else if (percent >= 50) bgColor = 'bg-yellow-200 text-yellow-900';
                  else if (percent >= 25) bgColor = 'bg-orange-200 text-orange-900';

                  return (
                    <div
                      key={time}
                      className={`px-2 py-1 text-sm border rounded ${bgColor}`}
                    >
                      {time}–{endHour} — {percent}%
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {results.length === 0 && (
          <p className="text-center text-gray-500 mt-8">No participants yet.</p>
        )}
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800">Prikkr</div>
        <div className="mb-3 italic text-gray-600">the smart way to plan together.</div>
        <div className="mb-2">Office: Utrecht, Netherlands</div>
        <button
          onClick={() => router.push('/contact')}
          className="text-blue-600 hover:underline"
        >
          Contact
        </button>
        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
