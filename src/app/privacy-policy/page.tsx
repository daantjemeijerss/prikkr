'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating logo */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 w-auto sm:h-24 md:h-32 lg:h-40 cursor-pointer z-10"
      />

      {/* Main content */}
      <section className="w-full pt-32 sm:pb-16 px-4 sm:px-6 bg-red-50">
        <div className="max-w-[90rem] w-full mx-auto bg-white shadow-xl rounded-2xl p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">Privacy Policy</h1>

          <p className="mb-4 text-base sm:text-lg text-gray-800 leading-relaxed">
            At Prikkr, we value your privacy and only collect essential information to help you
            plan more easily with others.
          </p>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">
            What We Collect
          </h2>

          <p className="mb-4 text-base sm:text-lg text-gray-800">
            We collect different types of information depending on how you use Prikkr:
          </p>

          <ul className="list-disc list-inside ml-4 mb-6 text-gray-800 text-base sm:text-lg">
            <li className="mb-2">
              <strong>If you sync your calendar</strong>, we collect:
              <ul className="list-disc list-inside ml-6 mt-2">
                <li><strong>Email and name</strong> (from your Google account)</li>
                <li><strong>Free/busy availability data</strong> — whether a time slot is busy or free</li>
                <li>We do <strong>not</strong> collect any event titles, descriptions, or attendees</li>
              </ul>
            </li>

            <li className="mt-4">
              <strong>If you do not sync your calendar</strong>, we only collect:
              <ul className="list-disc list-inside ml-6 mt-2">
                <li><strong>Email and name</strong> that you provide manually</li>
                <li>Your selected time slots (if you fill in availability manually)</li>
              </ul>
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">
            How We Use Your Data
          </h2>

          <ul className="list-disc list-inside ml-4 text-gray-800 text-base sm:text-lg">
            <li>To identify you in the group availability view</li>
            <li>To send confirmation emails when a date is chosen (if you've provided your email)</li>
            <li>To help determine the most suitable meeting time based on your input or synced availability</li>
          </ul>

          <p className="mt-6 text-base sm:text-lg text-gray-800">
            We never sell your data or share it with third parties, and we only store what's necessary to support group scheduling.
          </p>
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
