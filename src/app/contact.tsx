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

      {/* Main content with card layout */}
      <section className="w-full py-12 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-xl p-10 flex flex-col lg:flex-row gap-12">
          {/* Text section */}
          <div className="flex-1 max-w-3xl">
            <h1 className="text-4xl font-bold mb-6">About Prikkr</h1>

            <p className="mb-6 text-lg leading-relaxed">
              Hi, I’m <strong>Daantje Meijers</strong>, a Dutch Climate Physics student.
              During a festival, I met a group of amazing people I really wanted to see again.
              But planning something with a group is harder than it should be.
              Most tools make you click every time you’re available, and by the time everyone fills it in, your calendar has already changed.
            </p>

            <p className="mb-6 text-lg leading-relaxed">
              That’s why I created <strong>Prikkr</strong>: a smarter way to find a time that works.
              You can sync your calendar, and Prikkr will check your availability automatically.
              Prefer to do it manually? That works too — it’s simple either way.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4 border-t pt-6 border-gray-200">Contact</h2>
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

          {/* Photo with card styling */}
          <div className="flex-shrink-0 w-full max-w-xs mx-auto lg:mx-0">
            <div className="bg-white border border-gray-300 rounded-2xl p-3 shadow-xl">
              <img
                src="/images/Foto.png"
                alt="Photo of Daantje"
                className="rounded-2xl object-cover w-full max-h-[500px]"
              />
            </div>
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
