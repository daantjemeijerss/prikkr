'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function CreatePage() {
  const router = useRouter()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [extendedHours, setExtendedHours] = useState(false)

  const handleSubmit = async () => {
    const id = uuidv4()
    const prikkrData = {
      id,
      range: { from, to },
      extendedHours,
    }

    await fetch('/api/save-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prikkrData),
    })

    router.push(`/s/${id}`)
  }

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating top-left logo */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-0 left-4 h-48 w-auto cursor-pointer z-10"
      />

      {/* Section with soft pink background */}
      <section className="w-full bg-red-50 py-12 px-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold mb-8 mt-4">Create a Prikkr</h1>

          <label className="mb-2 text-lg">From:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mb-4 border border-gray-300 rounded px-4 py-2 text-base"
          />

          <label className="mb-2 text-lg">To:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mb-4 border border-gray-300 rounded px-4 py-2 text-base"
          />

          <label className="flex items-center space-x-2 mb-6">
            <input
              type="checkbox"
              checked={extendedHours}
              onChange={(e) => setExtendedHours(e.target.checked)}
            />
            <span className="text-sm">Include evening hours (after 5 PM)</span>
          </label>

          <button
            onClick={handleSubmit}
            className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 transition hover:scale-105"
          >
            Generate Link
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800">Prikkr</div>
        <div className="mb-3 italic text-gray-600">the smart way to plan together.</div>
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
