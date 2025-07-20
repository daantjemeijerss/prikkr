'use client';

import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">Terms of Service</h1>

          <p className="mb-4 text-base sm:text-lg text-gray-800">
            Welcome to Prikkr! These Terms of Service govern your use of our platform. By using Prikkr,
            you agree to these terms.
          </p>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">1. Use of the Service</h2>
          <p className="mb-4 text-base sm:text-lg text-gray-800">
            Prikkr is a tool that helps groups schedule meetings and events more efficiently. You agree
            to use the service only for lawful purposes and in a way that does not violate the rights of
            others.
          </p>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">2. Accounts and Login</h2>
          <p className="mb-4 text-base sm:text-lg text-gray-800">
            You may sign in with your Google account. By doing so, you allow us to access your basic
            profile info to identify you in the app. We do <strong>not</strong> access your calendar content.
          </p>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">3. Content and Availability</h2>
          <p className="mb-4 text-base sm:text-lg text-gray-800">
            We reserve the right to modify or discontinue the service at any time without notice. We are
            not responsible for any loss or inconvenience caused by temporary unavailability.
          </p>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">4. Data and Privacy</h2>
          <p className="mb-4 text-base sm:text-lg text-gray-800">
            Your data is handled according to our{' '}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>. We do not share or sell your personal information.
          </p>

          <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">5. Contact</h2>
          <p className="text-base sm:text-lg text-gray-800">
            For any questions or concerns, please email:<br />
            <strong>Email:</strong> prikkr.groupplanner@gmail.com
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
