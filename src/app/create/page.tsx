'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';

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

  useEffect(() => {
    if (session?.user?.email) {
      setCreatorEmail(session.user.email);
    }
    if (session?.user?.name) {
      setCreatorName(session.user.name);
    }
  }, [session]);

const handleSubmit = async () => {
  if (!eventName || !creatorName || !creatorEmail || !from || !to) {
    setError('Please fill in all fields before generating the link.');
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
    };

    console.log('🚀 Sending to /api/save-meta:', prikkrData);

    const metaRes = await fetch('/api/save-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prikkrData),
    });

    const metaResult = await metaRes.json();
    console.log('📬 Response from /api/save-meta:', metaResult);

    if (!metaRes.ok) {
      throw new Error('Failed to save meta: ' + (metaResult?.error || 'Unknown error'));
    }

    localStorage.setItem(`creatorEmail-${id}`, creatorEmail);

    const defaultSelections: Record<string, string[]> = {};
    const currentDate = new Date(from);
    const endDate = new Date(to);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const slots = extendedHours
        ? ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
        : ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
      defaultSelections[dateStr] = slots;
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
            {/* LEFT BLOCK */}
            <div className="flex flex-col items-center text-base sm:text-lg p-6 rounded-xl bg-white shadow-lg w-full sm:w-[24rem] min-h-[22rem] justify-start">
              <label className="mb-2 text-gray-800 font-bold">Event name:</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Dinner with friends"
                className="mb-4 border border-gray-300 px-4 py-2 rounded w-full"
              />

              <label className="mb-2 text-gray-800 font-bold">Your name:</label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Sjoerdje"
                className="mb-4 border border-gray-300 px-4 py-2 rounded w-full"
              />

              <label className="mb-2 text-gray-800 font-bold">Your email:</label>
              <input
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="e.g. your@email.com"
                className="mb-4 border border-gray-300 px-4 py-2 rounded w-full"
                disabled={!!session?.user?.email}
              />
            </div>

            {/* RIGHT BLOCK */}
            <div className="flex flex-col items-center text-base sm:text-lg p-6 rounded-xl bg-white shadow-lg w-full sm:w-[24rem] min-h-[22rem] justify-start">
              <label className="mb-2 text-gray-800 font-bold">From:</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mb-6 border border-gray-300 px-4 py-2 rounded w-full"
              />

              <label className="mb-2 text-gray-800 font-bold">To:</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mb-6 border border-gray-300 px-4 py-2 rounded w-full"
              />

              <label className="flex items-center space-x-2 text-sm sm:text-base text-gray-700">
                <input
                  type="checkbox"
                  checked={extendedHours}
                  onChange={(e) => setExtendedHours(e.target.checked)}
                />
                <span>Include evening hours (after 5 PM)</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="text-red-600 font-medium mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'hover:scale-105 bg-green-600 hover:bg-green-700'
            } text-white border border-green-500 shadow-[0_8px_20px_rgba(0,0,0,0.25)]`}
          >
            {isSubmitting ? 'Creating...' : 'Create Prikkr'}
          </button>
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
