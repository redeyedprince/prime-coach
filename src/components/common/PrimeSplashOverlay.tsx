import { useEffect, useState } from 'react';

interface PrimeSplashOverlayProps {
  userName?: string;
  onDone: () => void;
}

function getTimeGreeting(name?: string): string {
  const hour = new Date().getHours();
  const base =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name}` : 'Welcome to Prime';
}

const SUBTITLES = [
  'Strong muscles, resilient joints, calm mind.',
  'Move well today — build lasting vitality.',
  'Steady progress, zero guesswork.',
];

export function PrimeSplashOverlay({ userName, onDone }: PrimeSplashOverlayProps) {
  const [fading, setFading] = useState(false);
  const greeting = getTimeGreeting(userName);
  const subtitle = SUBTITLES[new Date().getDate() % SUBTITLES.length];

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const holdMs = prefersReduced ? 350 : 1150;
    const fadeMs = prefersReduced ? 150 : 320;

    const fadeTimer = window.setTimeout(() => setFading(true), holdMs);
    const doneTimer = window.setTimeout(() => onDone(), holdMs + fadeMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label="Skip welcome screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 via-white to-slate-50 px-6 text-center transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <span className="prime-ring-pulse absolute h-28 w-28 rounded-3xl bg-blue-500/20" />
        <img
          src="/icon.svg"
          alt="Prime"
          className="prime-logo-pop relative h-20 w-20 rounded-2xl shadow-xl shadow-blue-600/25"
        />
      </div>

      <div className="prime-fade-up mt-6 space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
          Prime
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
          {greeting}
        </h1>
        <p className="text-xs font-medium text-slate-500">{subtitle}</p>
      </div>

      <span className="mt-10 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Tap anywhere to enter
      </span>
    </button>
  );
}
