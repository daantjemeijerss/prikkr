'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ResponseEntry {
  name: string;
  selections: Record<string, Set<string> | string[] | Record<string, boolean>>;
}

function getWeekday(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
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

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-0 left-4 h-48 w-auto cursor-pointer z-10"
      />

      <section className="w-full bg-red-50 py-20 px-6">
        <div className="flex flex-col items-center text-center mx-auto w-full max-w-[90rem] px-6">
          <h1 className="text-5xl font-bold mb-6">Choose your own date</h1>

          {range && sortedDates.length > 0 && Object.keys(allSlots).length > 0 &&
            sortedDates.map((date) => {
              const slotsForDay = allSlots[date] || {};
              return (
                <div
                  key={date}
                  className="bg-white rounded-xl shadow-md px-4 py-1 mb-2 w-full max-w-screen-xl mx-auto"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                    <div className="text-left min-w-[10rem]">
                      <div className="text-md text-gray-500 font-medium">{getWeekday(date)}</div>
                      <div className="text-lg font-semibold text-gray-900">{date}</div>
                    </div>
                    <div className={`w-full grid gap-3 ${extendedHours ? 'grid-cols-7' : 'grid-cols-8'}`}>
                      {fullSlots.map((time) => {
                        const count = slotsForDay[time] || 0;
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        const [hourStr] = time.split(':');
                        const endHour = `${String(parseInt(hourStr, 10) + 1).padStart(2, '0')}:00`;
                        const slotKey = `${date}-${time}`;
                        const isSending = sendingTarget === slotKey;

                        let bgColor = 'bg-red-800 text-white';
                        if (percent === 100) bgColor = 'bg-green-600 text-white';
                        else if (percent >= 75) bgColor = 'bg-yellow-400 text-white';
                        else if (percent >= 50) bgColor = 'bg-orange-500 text-white';
                        else if (percent >= 25) bgColor = 'bg-red-600 text-white';

                        return (
                          <div
                            key={slotKey}
                            onClick={() => {
                              if (sendingTarget) return;
                              if (!params?.id || typeof params.id !== 'string') {
                                console.warn('❌ Invalid params.id on click:', params?.id);
                                return;
                              }
                              setSendingTarget(slotKey);
                              const url = `/share_prikkr/${date}?time=${time}&id=${params.id}`;
                              router.push(url);
                            }}
                            className={`relative group transition-transform transform hover:scale-105 w-full px-3 py-2 text-sm font-semibold text-center rounded-xl border border-gray-300 shadow-[0_8px_20px_rgba(0,0,0,0.25)] ${bgColor} ${isSending ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className="transition-all duration-200 group-hover:blur-sm group-hover:opacity-30">
                              {isSending ? 'Sending...' : (
                                <>
                                  {time}–{endHour}
                                  <br />
                                  {percent}%
                                </>
                              )}
                            </div>
                            {!isSending && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-semibold text-sm">Choose this date!</span>
                              </div>
                            )}
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
    </main>
  );
}
