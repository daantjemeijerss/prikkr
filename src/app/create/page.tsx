'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';        // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { BaseActionButton } from '@/utils/Buttons';


export default function CreatePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [extendedHours, setExtendedHours] = useState(false);
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [eventName, setEventName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotDuration, setSlotDuration] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');

  useEffect(() => {
    if (session?.user?.email) setCreatorEmail(session.user.email);
    if (session?.user?.name) setCreatorName(session.user.name);
  }, [session]);

  useEffect(() => {
  if (slotDuration === '1440') setExtendedHours(false);
}, [slotDuration]);

function getSlotTypeLabel(duration: number): string {
  switch (duration) {
    case 1440:
      return 'daily';
    case 60:
      return 'hourly';
    case 30:
      return 'half-hour';
    case 15:
      return 'quarter-hour';
    case 10:
      return '10-minutes';
    default:
      return 'custom';
  }
}

  const handleSubmit = async () => {
   if (!eventName || !creatorName || !creatorEmail || !from || !to || !slotDuration) {
      setError('Please fill in all fields before generating the link.');
      return;
    }

    if (slotDuration === 'custom' && !customMinutes) {
  setError('Please enter a custom slot length in minutes.');
  return;
}


    setError('');
    setIsSubmitting(true);

    try {
      const id = uuidv4();

      const prikkrData = {
        id,
        range: { from, to },
        extendedHours,
        creatorEmail,
        creatorName,
        eventName,
        slotDuration: slotDuration === 'custom' ? parseInt(customMinutes) : parseInt(slotDuration),
slotType: slotDuration === 'custom'
  ? 'custom'
  : getSlotTypeLabel(parseInt(slotDuration)),
      };

      const metaRes = await fetch('/api/save-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prikkrData),
      });

      const metaResult = await metaRes.json();

      if (!metaRes.ok) {
        throw new Error('Failed to save meta: ' + (metaResult?.error || 'Unknown error'));
      }

      localStorage.setItem(`creatorEmail-${id}`, creatorEmail);

      const defaultSelections: Record<string, string[]> = {};
      const currentDate = new Date(from);
      const endDate = new Date(to);
      const duration = slotDuration === 'custom' ? parseInt(customMinutes) : parseInt(slotDuration);

while (currentDate <= endDate) {
  const dateStr = currentDate.toISOString().split('T')[0];

  if (duration === 1440) {
    // Only one slot for the whole day
    defaultSelections[dateStr] = ['All Day'];
  } else {
    const slots: string[] = [];
    const startHour = 9;
const endHour = extendedHours ? 21 : 17; // one hour later, to make h < endHour work like in /rsvp

for (let hour = startHour; hour < endHour; hour++) {
  for (let minute = 0; minute < 60; minute += duration) {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
}


    defaultSelections[dateStr] = slots;
  }

  currentDate.setDate(currentDate.getDate() + 1);
}

      await fetch('/api/save-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: creatorName,
          email: creatorEmail,
          selections: defaultSelections,
        }),
      });

      router.push(`/s/${id}`);
    } catch (err) {
      console.error('❌ Submission error:', err);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 sm:h-24 md:h-32 lg:h-48 w-auto cursor-pointer z-10"
      />

      <section className="flex-grow w-full bg-red-50 py-16 px-4 sm:px-6">
        <div className="flex flex-col items-center text-center max-w-screen-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-10 sm:mb-12">Create a Prikkr</h1>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-8 sm:gap-12 mb-12 sm:mb-16">
            <div className="flex flex-col items-start text-base sm:text-lg p-6 rounded-xl bg-white shadow-lg w-full sm:w-[24rem] justify-start">

              <label className="mb-2 text-gray-800 font-bold">Your name:</label>
              <input type="text" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="e.g. Sjoerdje" className="mb-4 border border-gray-300 px-4 py-2 rounded w-full min-h-[44px]" />

              <label className="mb-2 text-gray-800 font-bold">Your email:</label>
              <input type="email" value={creatorEmail} onChange={(e) => setCreatorEmail(e.target.value)} placeholder="e.g. your@email.com" className="mb-4 border border-gray-300 px-4 py-2 rounded w-full min-h-[44px]" disabled={!!session?.user?.email} />

              <label className="mb-2 text-gray-800 font-bold">Event name:</label>
              <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Dinner with friends" className="mb-4 border border-gray-300 px-4 py-2 rounded w-full min-h-[44px]" />
              <label className="mb-2 text-gray-800 font-bold w-full text-left">Time slot length:</label>
<select
  value={slotDuration}
  onChange={(e) => setSlotDuration(e.target.value)}
  className="mb-4 border border-gray-300 px-4 py-2 rounded w-full min-h-[44px]"
>
  <option value="" disabled>-- Select duration --</option>
  <option value="1440">Day</option>
  <option value="60">Hour</option>
  <option value="30">30 minutes</option>
  <option value="15">15 minutes</option>
  <option value="10">10 minutes</option>
  <option value="custom">Custom</option>
</select>

{['60', '30', '15', '10'].includes(slotDuration) && (
  <label className="flex items-center space-x-2 mb-4 text-sm sm:text-base text-gray-700 w-full">
    <input
      type="checkbox"
      checked={extendedHours}
      onChange={(e) => setExtendedHours(e.target.checked)}
    />
    <span>Include evening hours (after 5 PM)</span>
  </label>
)}

{slotDuration === 'custom' && (
  <div className="w-full mb-4">
    <label className="mb-2 text-gray-800 font-bold block">Custom slot length (in minutes):</label>
    <input
      type="number"
      min="1"
      max="720"
      step="1"
      value={customMinutes}
      onChange={(e) => setCustomMinutes(e.target.value)}
      placeholder="e.g. 45"
      className="border border-gray-300 px-4 py-2 rounded w-full min-h-[44px]"
    />
  </div>
)}


            </div>

            <div className="flex flex-col items-start text-base sm:text-lg p-6 rounded-xl bg-white shadow-lg w-full sm:w-[24rem] justify-start">
<label className="mb-2 text-gray-800 font-bold">Select your date range:</label>
<DateRange
  ranges={[{
    startDate: from ? new Date(from) : new Date(),
    endDate: to ? new Date(to) : new Date(),
    key: 'selection'
  }]}
  onChange={(item) => {
  const start = item?.selection?.startDate;
  const end   = item?.selection?.endDate;

  if (start instanceof Date) {
    setFrom(start.toLocaleDateString('sv-SE')); // YYYY-MM-DD
  }
  if (end instanceof Date) {
    setTo(end.toLocaleDateString('sv-SE'));
  }
}}

  moveRangeOnFirstSelection={false}
  rangeColors={['#16a34a']} // green-600
  className="rounded-xl shadow border mb-4"
/>
            </div>
          </div>

          {error && <div className="text-red-600 font-medium mb-4">{error}</div>}


<BaseActionButton
  onClick={handleSubmit}
  isLoading={isSubmitting}
  // optional: hard-disable when required fields are empty so the button matches your validation UX
  disabled={
    isSubmitting ||
    !eventName ||
    !creatorName ||
    !creatorEmail ||
    !from ||
    !to ||
    !slotDuration ||
    (slotDuration === 'custom' && !customMinutes)
  }
  className="w-full sm:w-auto"   // optional: full width on mobile
>
  Create Prikkr
</BaseActionButton>

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
        <div className="mt-4 text-xs text-gray-400">&copy; {new Date().getFullYear()} Prikkr. All rights reserved.</div>
      </footer>
    </main>
  );
}
