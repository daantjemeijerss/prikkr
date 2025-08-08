'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  return (
    <main className="bg-white text-gray-900">
      {/* Logo top-left */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 w-auto sm:h-24 md:h-32 lg:h-48 cursor-pointer z-10"
      />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-28 pb-14 sm:pt-36 sm:pb-20 bg-red-50">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
          Welcome, are you ready to plan?
        </h1>

        <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-10 max-w-lg sm:max-w-xl">
          Prikkr helps you find the best time for your next meeting or event.
        </p>

        {status === 'loading' ? (
          <p>Loading...</p>
        ) : session ? (
          <div className="flex flex-col items-center space-y-3">
            <p className="text-base sm:text-lg font-medium">Welcome, {session.user?.name}</p>

            <button
              onClick={() => router.push('/create')}
              className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-green-600 text-white hover:bg-green-700 border border-green-500 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
            >
              Start Planning
            </button>

            <button
              onClick={() => signOut()}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 mb-10 sm:mb-16">
  <div className="flex flex-row space-x-4">
    
    <button
  onClick={() => signIn('azure-ad')}
  className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
>
  Sync with Outlook Calendar
</button>


<button
  onClick={() => signIn('google')}
  className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-rose-600 text-white hover:bg-rose-700 border border-rose-500 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
>
  Sync with Google Calendar
</button>



  </div>

  <button
    onClick={() => {
      localStorage.setItem('skippedLogin', 'true');
      router.push('/create');
    }}
    className="px-5 py-3 text-base sm:text-lg font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-200 shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
  >
    Don't sync with calendar
  </button>
</div>

        )}
      </section>

      {/* How it works section */}
      <section className="w-full py-14 px-4 sm:px-6 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-8 sm:mb-10">How it works</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="text-3xl sm:text-4xl mb-2">📅</div>
              <h3 className="font-bold text-base sm:text-lg mb-1">1. Choose your date range</h3>
              <p className="text-sm text-gray-600">Pick the days you'd like to meet.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl sm:text-4xl mb-2">🔄</div>
              <h3 className="font-bold text-base sm:text-lg mb-1">2. Sync your calendar</h3>
              <p className="text-sm text-gray-600">Or enter availability manually.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl sm:text-4xl mb-2">✅</div>
              <h3 className="font-bold text-base sm:text-lg mb-1">3. Get the best date</h3>
              <p className="text-sm text-gray-600">We show the most popular time slot.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
<footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
  <div className="mb-1 font-semibold text-gray-800 text-base">📌Prikkr</div>
  <div className="mb-3 italic text-gray-600 text-sm">"The smart way to plan together."</div>
  <div className="mb-2">Office: Utrecht, Netherlands</div>

  <div className="space-x-4">
    <button
      onClick={() => router.push('/contact')}
      className="text-blue-600 hover:underline"
    >
      Contact
    </button>
    <button
      onClick={() => router.push('/privacy-policy')}
      className="text-blue-600 hover:underline"
    >
      Privacy Policy
    </button>
    <button
      onClick={() => router.push('/terms')}
      className="text-blue-600 hover:underline"
    >
      Terms of Service
    </button>
  </div>

  <div className="mt-4 text-xs text-gray-400">
    &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
  </div>
</footer>

    </main>
  )
}
