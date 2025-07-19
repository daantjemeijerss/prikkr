'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [link, setLink] = useState('');
  const [resultsLink, setResultsLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedResults, setCopiedResults] = useState(false);
  const [validUntil, setValidUntil] = useState('');

  function formatDisplayDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  useEffect(() => {
    const id = params?.id;
    if (!id || typeof id !== 'string') return;

    const shareUrl = `${window.location.origin}/rsvp/${id}/login`;
    const resultsUrl = `${window.location.origin}/results/${id}`;
    setLink(shareUrl);
    setResultsLink(resultsUrl);

    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setFullYear(createdAt.getFullYear() + 1);
    setValidUntil(expiresAt.toISOString().split('T')[0]);

    fetch(`/api/get-meta?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.eventName) setEventName(data.eventName);
      });
  }, [params]);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyResults = () => {
    navigator.clipboard.writeText(resultsLink);
    setCopiedResults(true);
    setTimeout(() => setCopiedResults(false), 2000);
  };

  const whatsappMessage = `Fill in your availability for ${eventName}:\n${link}\n— The Prikkr team`;

  return (
    <main className="relative flex flex-col min-h-screen bg-white text-gray-900">
      <img
        src="/images/prikkr_logo_transparent.png"
        alt="Prikkr logo"
        onClick={() => router.push('/')}
        className="absolute top-2 left-2 h-20 sm:h-24 lg:h-48 w-auto cursor-pointer z-10"
      />

      <section className="flex-grow w-full bg-red-50 py-16 px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mx-auto w-full max-w-[90rem]">
          <h1 className="text-3xl sm:text-5xl font-bold mb-10 sm:mb-12 w-full break-words">
            Your Prikkr is ready!
          </h1>

          <p className="text-xl sm:text-2xl font-semibold mb-2">Event: {eventName}</p>
          <p className="mb-8 text-gray-700 text-base sm:text-lg">
            This link will be valid until: <strong>{formatDisplayDate(validUntil)}</strong>
          </p>

          <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8 w-full px-2">
            <div className="flex flex-col items-center text-base sm:text-lg p-6 rounded-lg bg-white shadow-lg w-full max-w-lg">
              <p className="mb-2 text-gray-800 font-bold">Invite others with this link:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 w-full">
                <input
                  type="text"
                  value={link}
                  readOnly
                  className="border border-gray-300 px-4 py-2 rounded w-full text-base"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 text-base font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-600 text-white border border-green-500"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2 w-full">
                <a
                  href={`mailto:?subject=You're invited to: ${encodeURIComponent(
                    eventName
                  )}&body=Fill in your availability here: ${encodeURIComponent(link)}`}
                  className="px-4 py-2 text-base font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-blue-600 text-white border border-blue-500"
                >
                  📧 Email
                </a>
                <a
                href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-base font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-500 text-white border border-green-400"
                >
                  💬 WhatsApp
                </a>

              </div>
            </div>

            <div className="flex flex-col items-center text-base sm:text-lg p-6 rounded-lg bg-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] w-full max-w-lg">
              <p className="mb-2 text-gray-800 font-bold">You can find the results with this link:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full mb-4">
                <input
                  type="text"
                  value={resultsLink}
                  readOnly
                  className="border border-gray-300 px-4 py-2 rounded w-full text-base"
                />
                <button
                  onClick={handleCopyResults}
                  className="px-4 py-2 text-base font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-600 text-white border border-green-500"
                >
                  {copiedResults ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-gray-500 italic">We also sent this to your email.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto w-full bg-gray-100 py-6 px-4 text-center text-sm text-gray-600">
        <div className="mb-1 font-semibold text-gray-800">📌Prikkr</div>
        <div className="mb-3 italic text-gray-600">"The smart way to plan together."</div>
        <div className="mb-2">Office: Utrecht, Netherlands</div>
        <button onClick={() => router.push('/contact')} className="text-blue-600 hover:underline">
          Contact
        </button>
        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Prikkr. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
