'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const [eventName, setEventName] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [validUntil, setValidUntil] = useState('')

  useEffect(() => {
    const id = params?.id
    if (!id || typeof id !== 'string') return

    // Compute share link
    const url = `${window.location.origin}/rsvp/${id}/login`
    setLink(url)

    // Store optional expiration (1 year)
    const createdAt = new Date()
    const expiresAt = new Date(createdAt)
    expiresAt.setFullYear(createdAt.getFullYear() + 1)
    setValidUntil(expiresAt.toISOString().split('T')[0])

    // Optional: store eventName in localStorage under the ID
    const stored = localStorage.getItem(`prikkr-${id}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      parsed.createdAt = createdAt.toISOString()
      localStorage.setItem(`prikkr-${id}`, JSON.stringify(parsed))
    }
  }, [params])

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating logo */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-0 left-4 h-48 w-auto cursor-pointer z-10"
      />

      {/* Main content section */}
      <section className="w-full bg-red-50 py-12 px-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold mb-6">Create Shareable Link</h1>

          <label className="mb-2 font-semibold text-lg">Event name:</label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. Dinner with friends"
            className="mb-6 border border-gray-300 rounded px-4 py-2 w-full max-w-md text-base"
          />

          <p className="mb-4 text-sm text-gray-600">
            This link will be valid until: <strong>{validUntil}</strong>
          </p>

          <div className="flex flex-col items-center gap-2 mb-4">
            <p className="text-gray-800 font-medium">Copy this link to send:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={link}
                readOnly
                className="border border-gray-300 px-2 py-1 rounded w-[20rem] text-sm"
              />
              <button
                onClick={handleCopy}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-4 flex-wrap justify-center">
            <a
              href={`mailto:?subject=You're invited to: ${encodeURIComponent(eventName)}&body=Fill in your availability here: ${encodeURIComponent(link)}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Email
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Fill in your availability for ' + eventName + ': ' + link)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              WhatsApp
            </a>
          </div>
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
