import { useState } from 'react';

interface PrimeSplashOverlayProps {
  userName?: string;
  onDone: () => void;
}

export interface PrimeQuote {
  text: string;
  author: string;
}

function getTimeGreeting(name?: string): string {
  const hour = new Date().getHours();
  const base =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name}` : 'Welcome to Prime';
}

export const PRIME_QUOTES: readonly PrimeQuote[] = [
  {
    text: 'No citizen has a right to be an amateur in the matter of physical training. What a disgrace it is for a man to grow old without ever seeing the beauty and strength of which his body is capable.',
    author: 'Socrates',
  },
  {
    text: 'The body is the temple of the soul, and to reach harmony of body, mind, and spirit, the body must be physically fit.',
    author: 'Swami Sivananda',
  },
  {
    text: 'To keep the body in good health is a duty... otherwise we shall not be able to keep our mind strong and clear.',
    author: 'Buddha',
  },
  {
    text: 'Physical fitness is the first requisite of happiness.',
    author: 'Joseph Pilates',
  },
  {
    text: 'Take care of your body. It’s the only place you have to live.',
    author: 'Jim Rohn',
  },
  {
    text: 'The groundwork of all happiness is good health.',
    author: 'Leigh Hunt',
  },
  {
    text: 'Lack of activity destroys the good condition of every human being, while movement and methodical physical exercise save it and preserve it.',
    author: 'Plato',
  },
  {
    text: 'Walking is man’s best medicine.',
    author: 'Hippocrates',
  },
  {
    text: 'Strength does not come from physical capacity. It comes from an indomitable will.',
    author: 'Mahatma Gandhi',
  },
  {
    text: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
  },
  {
    text: 'The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion.',
    author: 'Arnold Schwarzenegger',
  },
  {
    text: 'I hated every minute of training, but I said, "Don’t quit. Suffer now and live the rest of your life as a champion."',
    author: 'Muhammad Ali',
  },
  {
    text: 'Absorb what is useful, discard what is useless and add what is specifically your own.',
    author: 'Bruce Lee',
  },
  {
    text: 'Your body is your most priceless possession. Take care of it.',
    author: 'Jack LaLanne',
  },
  {
    text: 'To give anything less than your best is to sacrifice the gift.',
    author: 'Steve Prefontaine',
  },
  {
    text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Aristotle',
  },
  {
    text: 'A healthy body is a guest chamber for the soul; a sick body is a prison.',
    author: 'Francis Bacon',
  },
  {
    text: 'Intelligence and skill can only function at the peak of their capacity when the body is healthy and strong.',
    author: 'John F. Kennedy',
  },
  {
    text: 'The first wealth is health.',
    author: 'Ralph Waldo Emerson',
  },
  {
    text: 'A sound mind in a sound body.',
    author: 'Juvenal',
  },
  {
    text: 'Be strong to be useful.',
    author: 'Georges Hébert',
  },
  {
    text: 'The body achieves what the mind believes.',
    author: 'Napoleon Hill',
  },
  {
    text: 'It is exercise alone that supports the spirits, and keeps the mind in vigor.',
    author: 'Marcus Tullius Cicero',
  },
  {
    text: 'Energy and persistence conquer all things.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'He who has health has hope; and he who has hope has everything.',
    author: 'Thomas Carlyle',
  },
  {
    text: 'Discipline is the bridge between goals and accomplishment.',
    author: 'Jim Rohn',
  },
  {
    text: 'Knowing is not enough, we must apply. Willing is not enough, we must do.',
    author: 'Johann Wolfgang von Goethe',
  },
  {
    text: 'Physical culture is the foundation of all great human achievement.',
    author: 'Theodore Roosevelt',
  },
];

export function pickRandomPrimeQuote(randomValue = Math.random()): PrimeQuote {
  const index = Math.min(
    PRIME_QUOTES.length - 1,
    Math.max(0, Math.floor(randomValue * PRIME_QUOTES.length)),
  );
  return PRIME_QUOTES[index];
}

export function PrimeSplashOverlay({ userName, onDone }: PrimeSplashOverlayProps) {
  const [fading, setFading] = useState(false);
  const [quote] = useState<PrimeQuote>(() => pickRandomPrimeQuote());
  const greeting = getTimeGreeting(userName);

  const handleEnter = () => {
    if (fading) return;
    setFading(true);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => onDone(), prefersReduced ? 120 : 300);
  };

  return (
    <button
      type="button"
      onClick={handleEnter}
      aria-label="Tap anywhere to enter Prime"
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

      <div className="prime-fade-up mt-6 max-w-sm space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
          Prime
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
          {greeting}
        </h1>
        <blockquote className="pt-2 text-xs italic leading-relaxed text-slate-600">
          “{quote.text}”
        </blockquote>
        <div className="text-[11px] font-bold text-slate-500">— {quote.author}</div>
      </div>

      <span className="mt-10 animate-pulse rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-700">
        Tap anywhere to enter
      </span>
    </button>
  );
}
