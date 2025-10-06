'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useTouchMeta } from '@/hooks/useTouchMeta';  
import AppleSyncNotice from '@/calendar/AppleSyncNotice';

export default function RSVPLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [showManual, setShowManual] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
    const idStr = params?.id as string;                 // ← add
  useTouchMeta(idStr, 'active'); 

  // When signed in via OAuth, copy name/email to localStorage and go to fill
  useEffect(() => {
    if (status === 'authenticated' && session?.user && id) {
      const name = session.user.name || 'Guest';
      // Some Azure AD profiles put email under preferred_username; adjust to your provider mapping if needed
      const rawEmail =
        (session.user.email as string | undefined) ||
        (session.user as any).preferred_username ||
        '';
      const cleanEmail = rawEmail.trim().toLowerCase();

      if (cleanEmail) {
        localStorage.setItem(`prikkr-name-${id}`, name);
        localStorage.setItem(`prikkr-email-${id}`, cleanEmail);
        localStorage.removeItem(`skippedLogin-${id}`);
        router.replace(`/rsvp/${id}/fill`);
      }
    }
  }, [session, status, id, router]);

  const handleManualContinue = () => {
    if (!name || !email || !id) return;
    localStorage.setItem(`prikkr-name-${id}`, name.trim());
    localStorage.setItem(`prikkr-email-${id}`, email.trim().toLowerCase());
    localStorage.setItem(`skippedLogin-${id}`, 'true');
    router.replace(`/rsvp/${id}/fill`);
  };

  const handleGoogleLogin = () => {
    const cb = `${window.location.origin}/rsvp/${id}/login`;
    signIn('google', { callbackUrl: cb });
  };

  const handleOutlookLogin = () => {
    const cb = `${window.location.origin}/rsvp/${id}/login`;
    signIn('azure-ad', { callbackUrl: cb });
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

        <div className="flex flex-col items-center space-y-4 mb-10 sm:mb-16">
          {/* Sign-in buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={handleOutlookLogin}
              className="w-full sm:w-[320px] whitespace-nowrap px-5 py-3 text-base md:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-[0_8px_20px_rgba(0,0,0,0.25)] text-center"
            >
              Sync with Outlook Calendar
            </button>

            <button
              onClick={handleGoogleLogin}
              className="w-full sm:w-[320px] whitespace-nowrap px-5 py-3 text-base md:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-rose-600 text-white hover:bg-rose-700 border border-rose-500 shadow-[0_8px_20px_rgba(0,0,0,0.25)] text-center"
            >
              Sync with Google Calendar
            </button>
          </div>

          {/* Skip button — same width, goes to RSVP fill for this id */}
          <button
            onClick={() => {
              localStorage.setItem(`skippedLogin-${id}`, 'true');
              router.replace(`/rsvp/${id}/fill`);
            }}
            className="w-full sm:w-[320px] whitespace-nowrap px-5 py-3 text-base md:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-200 shadow-[0_8px_20px_rgba(0,0,0,0.25)] text-center"
          >
            Don't sync with calendar
          </button>
        </div>

        {/* Apple users help link */}
        <AppleSyncNotice className="mt-2" />


        {showManual && (
          <div className="w-full max-w-md flex flex-col items-center">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mb-4 px-4 py-2 border border-gray-300 rounded w-full text-base"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800 text-base">📌Prikkr</div>
        <div className="mb-3 italic text-gray-600 text-sm">"The smart way to plan together."</div>
        <div className="mb-2">Office: Utrecht, Netherlands</div>

        <div className="flex justify-center gap-4 text-blue-600 text-sm mt-2">
          <button onClick={() => router.push('/contact')} className="hover:underline">
            Contact
          </button>
          <button onClick={() => router.push('/privacy-policy')} className="hover:underline">
            Privacy Policy
          </button>
          <button onClick={() => router.push('/terms')} className="hover:underline">
            Terms of Service
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
