'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'

export default function RSVPLoginPage() {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const id = params?.id
    if (!id || typeof id !== 'string') return

    // If already signed in AND name entered, go to fill page
    if (session?.accessToken && name) {
      localStorage.setItem(`prikkr-name-${id}`, name)
      router.push(`/rsvp/${id}/fill`)
    }
  }, [session, name, params, router])

  const handleManualContinue = () => {
    const id = params?.id
    if (!id || typeof id !== 'string' || !name) return
    localStorage.setItem(`prikkr-name-${id}`, name)
    localStorage.setItem(`skippedLogin-${id}`, 'true')
    router.push(`/rsvp/${id}/fill`)
  }

  return (
    <main className="bg-white text-gray-900">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-2 py-16 bg-red-50">
        <img
          src="/images/prikkr_logo_transparent.png"
          alt="Prikkr logo"
          className="h-80 w-auto mb-2"
        />

        <p className="text-2xl text-gray-700 mb-3 max-w-5xl font-medium">
          <strong>Join this Prikkr and add your availability</strong>
        </p>

        <p className="text-md text-gray-600 font-light mb-8 max-w-xl">
          Sync with Google Calendar to auto-fill your availability, or continue manually.
        </p>

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-6 px-4 py-2 border border-gray-300 rounded w-full max-w-md text-base"
        />

        <div className="flex flex-col items-center space-y-4 mb-16">
          <button
            onClick={() => signIn('google')}
            disabled={!name}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow transition hover:scale-105 disabled:opacity-50"
          >
            Continue with Google
          </button>
          <button
            onClick={handleManualContinue}
            disabled={!name}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg shadow transition hover:scale-105 disabled:opacity-50"
          >
            Choose Dates Manually
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800">Prikkr</div>
        <div className="mb-3 italic text-gray-600">"The smart way to plan together."</div>
        <div className="mb-2">Office: Utrecht, Netherlands</div>
        <button
          onClick={() => router.push('/contact')}
          className="text-blue-600 hover:underline"
        >
          Contact
        </button>
        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
