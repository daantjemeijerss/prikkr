'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

export default function PrikkrLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
    <main className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* Top-left logo */}
      <div className="w-full px-6 pt-6">
        <img
          src="/images/prikkr_logo_transparent.png"
          alt="Prikkr logo"
          onClick={() => router.push('/')}
          className="h-28 w-auto cursor-pointer"
        />
      </div>

      {/* Page content */}
      <div className="flex-grow px-4 text-center">{children}</div>

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
