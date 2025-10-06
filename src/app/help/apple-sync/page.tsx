import Link from 'next/link';

export const metadata = {
  title: 'Use Apple Calendar with Prikkr (via Google sync)',
  description:
    'How to connect Apple Calendar through Google so Prikkr can read your free/busy availability.',
};

export default function AppleSyncHelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Use Apple Calendar with Prikkr
      </h1>

      <p className="mt-3 text-gray-700 dark:text-gray-200">
        Prikkr syncs with Google and Outlook. Do you use Apple Calendar? Connect your iPhone or Mac
        to your Google account <strong>once</strong>. Your calendars remain visible in Apple Calendar,
        and Prikkr reads only your free/busy times via Google.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">iPhone / iPad</h2>
        <ol className="mt-3 list-decimal pl-5 space-y-2 text-gray-700 dark:text-gray-200">
          <li>Open <em>Settings</em> → <em>Calendar</em> → <em>Accounts</em>.</li>
          <li>Tap <em>Add Account</em> → <em>Google</em> and sign in.</li>
          <li>Turn on <em>Calendars</em> (Mail/Contacts are optional).</li>
          <li>Open the <em>Calendar</em> app and check that your Google calendars are visible.</li>
          <li>In Prikkr, choose <em>Sync with Google</em> and grant access. Done ✅</li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Mac (macOS)</h2>
        <ol className="mt-3 list-decimal pl-5 space-y-2 text-gray-700 dark:text-gray-200">
          <li>Open <em>System Settings</em> → <em>Internet Accounts</em>.</li>
          <li>Select <em>Google</em>, sign in, and allow access.</li>
          <li>Enable <em>Calendars</em> (Mail/Contacts optional) and close the window.</li>
          <li>Open the <em>Calendar</em> app and confirm your Google calendars appear.</li>
          <li>Sign in to Prikkr with <em>Google</em> and allow calendar access. Done ✅</li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">FAQ</h2>
        <div className="mt-3 space-y-4 text-gray-700 dark:text-gray-200">
          <div>
            <p className="font-medium">Does Prikkr see my event details?</p>
            <p className="mt-1">
              No. Prikkr uses free/busy time only to find the best meeting slot — not your emails or
              event contents.
            </p>
          </div>
          <div>
            <p className="font-medium">Can I turn this off later?</p>
            <p className="mt-1">
              Yes. Remove the Google account in <em>Settings → Accounts</em> (iOS) or
              <em> Internet Accounts</em> (macOS). You can also sign out of Prikkr anytime.
            </p>
          </div>
          <div>
            <p className="font-medium">Can I do this without Google?</p>
            <p className="mt-1">
              For live sync with Apple Calendar, Google or Outlook is required. Without a connection,
              a future <em>.ics upload</em> option will be available (planned feature).
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <Link
          href="/"
          className="text-sm underline underline-offset-2 decoration-gray-400 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:decoration-gray-600"
        >
          ← Back to Prikkr
        </Link>
      </div>
    </main>
  );
}
