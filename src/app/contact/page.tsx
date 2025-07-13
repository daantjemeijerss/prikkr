'use client'

import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating logo */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-0 left-4 h-48 w-auto cursor-pointer z-10"
      />

      {/* Main content */}
      <section className="w-full bg-red-50 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start gap-10">
          {/* Text content */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-6">About Prikkr</h1>

            <p className="mb-6 text-lg leading-relaxed">
              Hi, I’m <strong>Daantje Meijers</strong>, a Dutch Climate Physics student.
              During a festival, I met a group of amazing people with whom I really wanted to meet up again.
              But I quickly realized how frustrating it can be to find a time that works for everyone.
              Most online tools require you to manually click every available time, and by the time the poll is complete,
              your calendar might already be full.
            </p>

            <p className="mb-6 text-lg leading-relaxed">
              That’s why I created <strong>Prikkr</strong> — a smarter way to plan together.
              It lets you sync your calendar and automatically checks when you’re free, saving time and avoiding double bookings.
              Don’t want to sync? Manual entry is still available — simple and accessible for everyone.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Contact</h2>
            <p className="text-lg mb-2">
              If you have any questions or feedback, feel free to get in touch:
            </p>

            <div className="text-base">
              <p className="mb-1">
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:daantjemeijerss@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  daantjemeijerss@gmail.com
                </a>
              </p>
              <p>
                <strong>Office address:</strong> Monseigneur van de Weteringstraat 95,
                <br />
                Utrecht, Netherlands
              </p>
            </div>
          </div>

          {/* Profile image */}
          <div className="flex-shrink-0 w-full max-w-xs mx-auto lg:mx-0">
            <img
              src="/images/Foto.png"
              alt="Photo of Daantje"
              className="rounded-lg shadow-lg w-full object-cover max-h-[500px]"
            />
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
