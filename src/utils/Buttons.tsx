'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type PayloadInput =
  | Record<string, any>
  | (() => Record<string, any> | Promise<Record<string, any>>);

export function BaseActionButton({
  children,
  onClick,
  disabled,
  isLoading,
  className = '',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    'px-8 py-4 text-base sm:text-lg font-semibold rounded-xl transition-all duration-150 transform hover:scale-105 ' +
    'shadow-[0_8px_20px_rgba(0,0,0,0.25)] bg-green-600 text-white hover:bg-green-700 border border-green-500';

  const disabledClass = disabled || isLoading ? ' opacity-70 cursor-not-allowed' : '';

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`mt-6 ${base}${disabledClass} ${className}`}
    >
      {isLoading ? 'Sending...' : children}
    </button>
  );
}

export function SubmitAndRedirectButton({
  id,
  text = 'Send out!',
  disabled,
  apiEndpoint,
  payload,
  successHref,
  guard,
  className = '',
  onError,
  onSuccess,
}: {
  id?: string;
  text?: string;
  disabled?: boolean;
  apiEndpoint: string;
  payload: Record<string, any> | (() => Record<string, any> | Promise<Record<string, any>>);
  successHref: string | ((id: string) => string);
  guard?: () => boolean;
  className?: string;
  onError?: (err: unknown) => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading) return;
    if (guard && !guard()) return;

    setIsLoading(true);
    try {
      const body = typeof payload === 'function' ? await payload() : payload;

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`save failed: ${res.status} ${msg}`);
      }

      const resolvedId = (body && typeof body === 'object' && (body as any).id) || id || '';
      const href = typeof successHref === 'function' ? successHref(resolvedId) : successHref;

      if (href) router.push(href);
      onSuccess?.();
    } catch (err) {
      console.error('❌ Submit failed:', err);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <BaseActionButton onClick={handleClick} isLoading={isLoading} disabled={disabled} className={className}>
      {text}
    </BaseActionButton>
  );
}

/* =========================
   Shared date/time helpers
   ========================= */

export type BusySegment = { color: string; from: number; to: number };

/* Legacy auto-fit helpers (you can keep or remove if unused) */
export function calcSlotGridCols(slotType: string, _extendedHours: boolean) {
  const base = 'w-full grid auto-rows-fr gap-x-2 gap-y-2 ';
  switch (slotType) {
    case '10-minutes':
    case 'quarter-hour':
      return base + 'grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]';
    case 'half-hour':
      return base + 'grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]';
    default:
      return base + 'grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]';
  }
}
export function calcDailyGridCols() {
  return 'grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2 flex-grow';
}

/* --- Symmetric grid helpers (use these) --- */

// 8 cols when NOT extended, 6 cols when extended (at md+)
export function fixedCols(extendedHours: boolean) {
  return extendedHours ? 6 : 8;
}

// Force the slot grid at md+ to 6 or 8 columns; fewer on small screens so text fits
export function slotSymmetricGridClass(extendedHours: boolean) {
  return [
    'w-full grid auto-rows-fr gap-2',
    'grid-cols-2 sm:grid-cols-3',
    extendedHours ? 'md:grid-cols-6' : 'md:grid-cols-8',
  ].join(' ');
}

/** Daily grids: always 7 columns at md+ (Mon–Sun) */
export function dailySymmetricGridClass() {
  return 'grid gap-2 grid-cols-2 sm:grid-cols-4 md:grid-cols-7 flex-grow';
}

/** Monday-based offset (0..6) for the *first* date in a week group */
export function dailyWeekPadStart(isoDate: string) {
  // Force UTC to avoid local timezone shifting the weekday
  const d = new Date(isoDate + 'T00:00:00Z');
  // JS: Sun=0..Sat=6  ->  Mon=0..Sun=6
  return (d.getUTCDay() + 6) % 7;
}


/** Convert offset (0..6) to a Tailwind md:col-start-* class (safe/static for JIT) */
export function dailyColStartMdClass(offset0to6: number) {
  const map = [
    'md:col-start-1',
    'md:col-start-2',
    'md:col-start-3',
    'md:col-start-4',
    'md:col-start-5',
    'md:col-start-6',
    'md:col-start-7',
  ];
  const idx = Math.max(0, Math.min(6, offset0to6));
  return map[idx];
}

/* =========================
   Visual helpers
   ========================= */

function withAlpha(hex: string, a = '33') {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return `${hex}${a}`;
  return hex;
}

function gradientStyle(segments: BusySegment[], { alpha }: { alpha: boolean }): React.CSSProperties {
  if (!segments?.length) return {};
  const stops = segments.map((s) => `${alpha ? withAlpha(s.color) : s.color} ${s.from * 100}% ${s.to * 100}%`).join(', ');
  const style: React.CSSProperties = { background: `linear-gradient(to right, ${stops})` };
  if (!alpha) style.color = '#fff';
  return style;
}

function isFullyGreen(segments: BusySegment[]) {
  return segments.length === 1 && segments[0].color === '#22c55e' && segments[0].from === 0 && segments[0].to === 1;
}
function hasRed(segments: BusySegment[]) {
  return segments.some((s) => s.color === '#ef4444');
}

/* =========================
   Tiles
   ========================= */

/**
 * TimeSlotButton
 * - Use this for ALL non-daily slot tiles (10/15/30/60/custom).
 */
export function TimeSlotButton({
  label,
  segments,
  selected = false,
  customMode,
  onClick,
  className = '',
}: {
  label: string; // e.g. "09:00 - 09:15"
  segments: BusySegment[]; // from getSlotBusySegments(...)
  selected?: boolean; // only matters in customMode
  customMode: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    'px-3 py-2 min-h-[44px] w-full text-[10px] sm:text-sm font-semibold text-center ' +
    'rounded-xl transition-all duration-100 shadow-md border whitespace-nowrap';

  if (customMode) {
    return (
      <button
        onClick={onClick}
        className={`${base} ${selected ? 'bg-green-500 text-white' : 'text-gray-800 hover:bg-gray-100'} ${className}`}
        style={selected ? undefined : gradientStyle(segments, { alpha: true })}
      >
        <div className="flex items-center justify-center gap-1">
          <span>{label}</span>
          {selected && <span className="text-white text-xs">✔</span>}
        </div>
      </button>
    );
  }

  const fullyGreen = isFullyGreen(segments);
  const red = hasRed(segments);

  return (
    <button className={`${base} ${className}`} style={gradientStyle(segments, { alpha: false })}>
      <div className="flex items-center justify-center gap-1">
        <span>{label}</span>
        {fullyGreen ? <span className="text-white text-xs">✔</span> : red ? <span className="text-white text-xs">✘</span> : null}
      </div>
    </button>
  );
}

/**
 * DayAvailabilityButton (for "daily" option tiles)
 * - customMode: selectable; shows green/yellow/red hint background
 * - view mode: solid green/yellow/red tile with icon
 */
export function DayAvailabilityButton({
  dateLabel,
  isSelected = false,
  isFullyFree,
  isMostlyFree,
  customMode,
  onClick,
  className = '',
}: {
  dateLabel: string; // e.g. "Mon 11 Aug"
  isSelected?: boolean; // customMode only
  isFullyFree: boolean;
  isMostlyFree: boolean;
  customMode: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    'w-full px-2 py-4 text-sm font-semibold text-center rounded-xl transition-all duration-100 ' +
    'shadow-[0_8px_20px_rgba(0,0,0,0.25)] border';

  if (customMode) {
    const bg = isFullyFree
      ? 'bg-green-100 hover:bg-green-200 text-gray-800'
      : isMostlyFree
      ? 'bg-yellow-100 hover:bg-yellow-200 text-gray-800'
      : 'bg-red-100 hover:bg-red-200 text-gray-800';

    return (
      <button onClick={onClick} className={`${base} ${isSelected ? 'bg-green-500 text-white' : bg} ${className}`}>
        {dateLabel}
      </button>
    );
  }

  const bg = isFullyFree ? 'bg-green-500' : isMostlyFree ? 'bg-yellow-400' : 'bg-red-500';
  const icon = isFullyFree ? '✔' : isMostlyFree ? '~' : '✘';

  return (
    <div className={`${base} ${bg} text-white ${className}`}>
      <span className="flex items-center justify-center gap-1">
        {dateLabel}
        <span className={`inline-block ml-1 text-base ${icon === '✘' ? '' : 'animate-bounce'}`}>{icon}</span>
      </span>
    </div>
  );
}
