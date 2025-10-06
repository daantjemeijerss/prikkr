'use client';

import Link from 'next/link';

type Props = {
  className?: string;
  text?: string; // optional override, defaults to "Using Apple Calendar?"
};

export default function AppleSyncNotice({ className, text }: Props) {
  return (
    <p className={`text-sm text-gray-500 mt-2 select-none ${className ?? ''}`}>
      {text ?? 'Using Apple Calendar?'}{' '}
      <Link
        href="/help/apple-sync"
        className="underline underline-offset-2 decoration-gray-400 hover:text-gray-700 hover:decoration-gray-600"
      >
        Click here
      </Link>
      .
    </p>
  );
}
