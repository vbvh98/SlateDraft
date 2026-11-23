import { NavarasaTag } from '../types/screenplay';

export const NAVARASA_META: Record<
  NavarasaTag,
  { name: string; hindi: string; meaning: string; colorClass: string; badgeBg: string }
> = {
  shringara: {
    name: 'Shringara',
    hindi: 'श्रृंगार',
    meaning: 'Romance & Beauty',
    colorClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  hasya: {
    name: 'Hasya',
    hindi: 'हास्य',
    meaning: 'Comedy & Warmth',
    colorClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  karuna: {
    name: 'Karuna',
    hindi: 'करुण',
    meaning: 'Pathos & Grief',
    colorClass: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  raudra: {
    name: 'Raudra',
    hindi: 'रौद्र',
    meaning: 'Fury & Conflict',
    colorClass: 'text-red-400',
    badgeBg: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
  veera: {
    name: 'Veera',
    hindi: 'वीर',
    meaning: 'Heroism & Resolve',
    colorClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  bhayanaka: {
    name: 'Bhayanaka',
    hindi: 'भयानक',
    meaning: 'Suspense & Dread',
    colorClass: 'text-purple-400',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  bibhatsa: {
    name: 'Bibhatsa',
    hindi: 'बीभत्स',
    meaning: 'Gritty / Shock',
    colorClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  adbhuta: {
    name: 'Adbhuta',
    hindi: 'अद्भुत',
    meaning: 'Wonder & Twist',
    colorClass: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  shanta: {
    name: 'Shanta',
    hindi: 'शांत',
    meaning: 'Peace & Catharsis',
    colorClass: 'text-teal-400',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
};

export function formatPageEighths(eighths: number): string {
  const safe = Math.max(1, Math.round(eighths));
  const whole = Math.floor(safe / 8);
  const rem = safe % 8;
  if (whole === 0) return `${rem}/8 pgs`;
  if (rem === 0) return `${whole} pgs`;
  return `${whole} ${rem}/8 pgs`;
}
