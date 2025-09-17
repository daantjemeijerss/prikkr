'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr?.split('-')?.map(Number) || [];
  if (!year || !month || !day) return 'Invalid Date';

  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function SharePrikkrDatePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const chosenDateRaw = id?.toString() || '';
  const chosenTime = searchParams.get('time') || '00:00';
  const eventId = searchParams.get('id') || id?.toString() || '';
  const chosenDateFormatted = formatDisplayDate(chosenDateRaw);

  
  useEffect(() => {
    // Save the final date on mount
    if (!eventId || !chosenDateRaw || !chosenTime) return;

    fetch('/api/save-final-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: eventId,
        date: chosenDateRaw,
        time: chosenTime,
      }),
    });

    // Fetch meta for WhatsApp message
    const fetchMeta = async () => {
      try {
        const metaRes = await fetch(`/api/get-meta?id=${eventId}`);
        const meta = await metaRes.json();

        const creatorName = meta.creatorName || 'Someone';
        const eventName = meta.eventName || 'your event';

        const formattedMessage = `Hi!\n${creatorName} has Prikkred your date.\n${eventName} will take place on *${chosenDateFormatted} at ${chosenTime}*.\n\nHope to see you there!\n- The Prikkr team`;
        setMessage(formattedMessage);
      } catch (error) {
        console.error('❌ Failed to fetch meta:', error);
      }
    };

    fetchMeta();
  }, [eventId, chosenDateRaw, chosenTime]);

  const sendEmails = async () => {
    if (!eventId) {
      console.error('❌ eventId is missing!');
      return;
    }

    setSending(true);

    try {
      const responseRes = await fetch(`/api/get-responses?id=${eventId}`);
      const responses = await responseRes.json();
      console.log('📦 responses from API:', responses);

      if (!Array.isArray(responses)) {
        console.error('❌ API did not return an array of responses:', responses);
        return;
      }

      const emails: string[] = [];
      const participantNames: Record<string, string> = {};

      responses.forEach((entry: any) => {
        if (entry.email) {
          emails.push(entry.email);
          participantNames[entry.email] = entry.name || '';
        }
      });

      const metaRes = await fetch(`/api/get-meta?id=${eventId}`);
      const meta = await metaRes.json();

      const creatorEmail = meta.creatorEmail;
      const creatorName = meta.creatorName || 'there';
      const eventName = meta.eventName || 'your event';

      if (!creatorEmail || emails.length === 0) {
        console.warn('⚠️ Missing creator email or no valid participants.');
        return;
      }

      const res = await fetch('/api/send-final-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          emails,
          date: chosenDateRaw,
          time: chosenTime,
          creatorEmail,
          creatorName,
          eventName,
          participantNames,
        }),
      });

      const result = await res.json();
      if (result.success) setEmailSent(true);
    } catch (err) {
      console.error('❌ Failed to send emails:', err);
    } finally {
      setSending(false);
    }
  };



  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 bg-white text-gray-900">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 sm:h-24 lg:h-48 w-auto cursor-pointer z-10"
      />

      <h1 className="text-2xl sm:text-4xl font-bold mt-20 mb-6 text-center">
        You're ready to send out your date!
      </h1>

      <div className="relative w-64 sm:w-80 aspect-square mb-8">
        <img
          src="/images/postit.png"
          alt="Celebration"
          className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"
        />
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-center whitespace-pre-line text-black font-bold text-xl sm:text-3xl drop-shadow-md">
            {chosenDateFormatted}
            {'\n'}
            {chosenTime}
          </span>
        </div>
      </div>

      <p className="text-base sm:text-lg font-semibold text-gray-800 mb-4 text-center">
        Let your members know:
      </p>

      <div className="flex gap-4 flex-wrap justify-center mb-12">
        <button
          disabled={emailSent || sending}
          onClick={sendEmails}
          className={`px-3 sm:px-4 py-2 text-sm sm:text-lg font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] ${
            emailSent ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          } text-white border border-gray-400`}
        >
          {emailSent
            ? '✅ Emails are sent!'
            : sending
            ? '📨 Sending emails...'
            : '📧 Send out emails!'}
        </button>

        {message && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 sm:px-4 py-2 text-sm sm:text-lg font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-500 text-white hover:bg-green-600 border border-green-400"
          >
            💬 Share via WhatsApp
          </a>
        )}
      </div>

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
