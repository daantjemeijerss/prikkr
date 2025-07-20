'use client'

import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      {/* Floating logo (like homepage) */}
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 w-auto sm:h-24 md:h-32 lg:h-40 cursor-pointer z-10"
      />

      {/* Main content with lighter padding like homepage */}
      <section className="w-full pt-32 sm: pb-16 px-4 sm:px-6 bg-red-50">
        <div className="max-w-[90rem] w-full mx-auto flex flex-col lg:flex-row gap-10 sm:gap-16 bg-white shadow-xl rounded-2xl p-6 sm:p-10">
          {/* Text section */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold mb-6">About Prikkr</h1>

            <p className="mb-6 text-base sm:text-lg leading-relaxed text-gray-800">
              Hi, I’m <strong>Daantje Meijers</strong>, a Dutch Climate Physics student.
              During a festival, I met a group of amazing people I really wanted to see again.
              But planning something with a group is harder than it should be.
              Most tools make you click every time you’re available, and by the time everyone fills it in, your calendar has already changed.
            </p>

            <p className="mb-6 text-base sm:text-lg leading-relaxed text-gray-800">
              That’s why I created <strong>Prikkr</strong>: a smarter way to find a time that works.
              You can sync your calendar, and Prikkr will check your availability automatically.
              Prefer to do it manually? That works too — it’s simple either way.
            </p>

            <h2 className="text-2xl sm:text-3xl font-semibold mt-10 mb-4 pt-4 border-t border-gray-200">Contact</h2>
            <p className="text-base sm:text-lg mb-3">
              If you have any questions or feedback, feel free to get in touch:
            </p>

            <div className="text-base sm:text-lg text-gray-700">
              <p className="mb-2">
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:daantjemeijerss@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  daantjemeijerss@gmail.com
                </a>
              </p>
              <p>
                <strong>Office address:</strong><br />
                Monseigneur van de Weteringstraat 95,<br />
                Utrecht, Netherlands
              </p>
            </div>
          </div>

          {/* Image section */}
          <div className="flex-shrink-0 w-full sm:max-w-sm mx-auto lg:mx-0">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-md">
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
        <div className="mb-1 font-semibold text-gray-800">📌Prikkr</div>
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
