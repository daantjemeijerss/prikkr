'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';

export default function RSVPLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [showManual, setShowManual] = useState(false);

  // ⏩ REDIRECT IMMEDIATELY if already signed in via Google
  useEffect(() => {
    if (status === 'authenticated' && session?.user && id) {
      const name = session.user.name || 'Guest';
      const email = session.user.email || '';

      if (email) {
        localStorage.setItem(`prikkr-name-${id}`, name);
        localStorage.setItem(`prikkr-email-${id}`, email);
        localStorage.removeItem(`skippedLogin-${id}`);
        router.push(`/rsvp/${id}/fill`);
      }
    }
  }, [session, status, id, router]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleManualContinue = () => {
    if (!name || !email || !id) return;
    localStorage.setItem(`prikkr-name-${id}`, name);
    localStorage.setItem(`prikkr-email-${id}`, email);
    localStorage.setItem(`skippedLogin-${id}`, 'true');
    router.push(`/rsvp/${id}/fill`);
  };

  const handleGoogleLogin = () => {
    signIn('google');
  };

  return (
    <main className="bg-white text-gray-900 min-h-screen flex flex-col">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 w-auto sm:h-24 md:h-32 lg:h-48 cursor-pointer z-10"
      />

      <section className="flex flex-col items-center justify-center text-center px-4 pt-28 pb-14 sm:pt-36 sm:pb-20 bg-red-50 flex-grow">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 max-w-xl">
          Join this Prikkr and add your availability
        </h1>

        <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-10 max-w-lg sm:max-w-xl">
          Prikkr helps you fill in your availability quickly by syncing your calendar.
        </p>

        <div className="flex flex-col items-center space-y-4 mb-10 sm:mb-16 w-full max-w-md">
          <button
            onClick={handleGoogleLogin}
            className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-green-600 text-white hover:bg-green-700 border border-green-500 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
          >
            Sync with Google Calendar
          </button>

          <button
            onClick={() => setShowManual(true)}
            className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-200 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
          >
            Don’t sync with calendar
          </button>
        </div>

        {showManual && (
          <div className="w-full max-w-md flex flex-col items-center">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 px-4 py-2 border border-gray-300 rounded w-full text-base"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-6 px-4 py-2 border border-gray-300 rounded w-full text-base"
            />
            <button
              onClick={handleManualContinue}
              disabled={!name || !email}
              className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-yellow-400 text-gray-800 hover:bg-yellow-500 border border-yellow-400 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
            >
              Join Prikkr
            </button>
          </div>
        )}
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
