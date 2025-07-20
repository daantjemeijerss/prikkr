"use client";

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
  const [bestTimeSlots, setBestTimeSlots] = useState<{ date: string; time: string; percent: number }[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isPrikkrSending, setIsPrikkrSending] = useState(false);
  const [routingTarget, setRoutingTarget] = useState<string | null>(null);


  useEffect(() => {
    const cached = localStorage.getItem('prikkr-meta');
    if (cached && !range) {
      const parsed = JSON.parse(cached);
      setRange(parsed.range);
      setExtendedHours(parsed.extendedHours);
    }
  }, [range]);

  useEffect(() => {
    if (!params?.id || typeof params.id !== "string") return;
    if (typeof window !== "undefined") {
      localStorage.setItem("prikkr-latest-id", params.id);
    }
    fetchMeta();
    fetchResponses();
  }, [params]);

  useEffect(() => {
    if (showPopup) {
      fetchMeta();
      fetchResponses();
    }
  }, [showPopup]);

  async function fetchMeta() {
    const id = params?.id;
    if (!id || typeof id !== "string") return;
    const res = await fetch(`/api/get-meta?id=${id}`);
    if (!res.ok) return;
    const meta = await res.json();
    setRange(meta.range);
    setExtendedHours(meta.extendedHours);
  }

  async function fetchResponses() {
    const id = params?.id;
    if (!id || typeof id !== "string") return;
    const res = await fetch(`/api/get-responses?id=${id}`);
    if (!res.ok) return;
    const parsed: ResponseEntry[] = await res.json();
    setResults(parsed);
    const validParticipants = parsed.filter((p) =>
      Object.values(p.selections || {}).some(
        (v) =>
          (Array.isArray(v) && v.length > 0) ||
          (v instanceof Set && v.size > 0) ||
          (typeof v === "object" && Object.keys(v).length > 0)
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
    const flat: { date: string; time: string; percent: number }[] = [];
    for (const [date, times] of Object.entries(availability)) {
      for (const [time, count] of Object.entries(times)) {
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        flat.push({ date, time, percent });
      }
    }
    const top = flat.sort((a, b) => b.percent - a.percent).slice(0, 50);
    setBestTimeSlots(top);
  }

  const fullSlots = Array.from({ length: (extendedHours ? 23 : 17) - 9 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);

  function getDateRange(from: string, to: string): string[] {
    const dates = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
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
  const groupedTopSlots = bestTimeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, { time: string; percent: number }[]>);

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
          <button
  onClick={() => {
    setIsPrikkrSending(true);
    setTimeout(() => {
      setShowPopup(true);
      setIsPrikkrSending(false);
    }, 200); // Optional small delay to show spinner if needed
  }}
  disabled={isPrikkrSending}
  className={`mb-6 px-6 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform text-gray-800 border border-yellow-300 shadow-[0_8px_20px_rgba(0,0,0,0.25)] ${
    isPrikkrSending ? 'bg-gray-400 cursor-not-allowed' : 'hover:scale-105 bg-yellow-400 hover:bg-yellow-400'
  }`}
>
  {isPrikkrSending ? 'Opening...' : '📌 Prikkr your date!'}
</button>


          {showPopup && (
            <div className="fixed inset-0 backdrop-blur-sm bg-transparent flex items-center justify-center z-50" onClick={() => setShowPopup(false)}>
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-2xl w-full text-center overflow-y-auto max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl sm:text-2xl font-bold mb-4">Send out your meeting or event</h2>
                <p className="text-gray-600 mb-6">Based on highest availability</p>

                {Object.entries(groupedTopSlots)
                  .sort(([, a], [, b]) => Math.max(...b.map(s => s.percent)) - Math.max(...a.map(s => s.percent)))
                  .slice(0, 3)
                  .map(([date, slots]) => {
                    const maxPercent = Math.max(...slots.map(s => s.percent));
                    const bestOnly = slots.filter(s => s.percent === maxPercent);
                    return (
                      <div key={date} className="mb-6">
                        <h3 className="text-sm sm:text-lg font-semibold mb-2">{formatDisplayDate(date)}</h3>
                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                          {bestOnly.map(({ time, percent }) => {
  const hour = parseInt(time.split(':')[0]);
  const end = `${String(hour + 1).padStart(2, '0')}:00`;
  const slotKey = `${date}-${time}`;
  let bgColor = "bg-red-800 text-white";
  if (percent === 100) bgColor = "bg-green-600 text-white";
  else if (percent >= 75) bgColor = "bg-yellow-400 text-white";
  else if (percent >= 50) bgColor = "bg-orange-500 text-white";
  else if (percent >= 25) bgColor = "bg-red-600 text-white";

  const isThisButtonRouting = routingTarget === slotKey;

  return (
    <button
      key={slotKey}
      onClick={() => {
        if (routingTarget) return;
        setRoutingTarget(slotKey);
        router.push(`/share_prikkr/${date}?time=${time}&id=${params.id}`);
      }}
      disabled={!!routingTarget}
      className={`px-4 py-2 text-[10px] sm:text-sm font-semibold rounded-xl transition-all duration-150 transform shadow-[0_8px_20px_rgba(0,0,0,0.25)] ${
        isThisButtonRouting
          ? 'bg-gray-400 cursor-not-allowed'
          : bgColor + ' hover:scale-105'
      }`}
    >
      {isThisButtonRouting ? 'Sending...' : `${time} - ${end} · ${percent}%`}
    </button>
  );
})}


                        </div>
                      </div>
                    );
                  })}

                <p className="text-gray-500 italic mb-4">Don't like these options?</p>
                <button
                  onClick={() => {
                    setShowPopup(false);
                    router.push(`/choose_prikkr_date/${params.id}`);
                  }}
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Choose your own date
                </button>
              </div>
            </div>
          )}

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
