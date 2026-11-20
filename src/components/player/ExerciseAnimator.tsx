import { useEffect, useState } from 'react';
import { getLocalExerciseFrames } from '../../data/svgAssets';

interface ExerciseAnimatorProps {
  slug: string;
  alt: string;
  tempo?: string; // e.g. "3-1-1-0"
  forcedFrameIdx?: number;
  className?: string;
}

function parseTempoMs(tempo: string): [number, number, number] {
  const parts = tempo.split('-').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return [900, 600, 900];
  }
  const [eccentric, bottomPause, concentric, topPause] = parts;
  const f1 = Math.max(400, (topPause + eccentric * 0.5) * 450);
  const f2 = Math.max(400, (eccentric * 0.5 + bottomPause) * 450);
  const f3 = Math.max(400, concentric * 450);
  return [f1, f2, f3];
}

export function ExerciseAnimator({
  slug,
  alt,
  tempo = '3-1-1-0',
  forcedFrameIdx,
  className = 'h-48 w-48',
}: ExerciseAnimatorProps) {
  const frames = getLocalExerciseFrames(slug);
  const [autoFrameIdx, setAutoFrameIdx] = useState(0);

  useEffect(() => {
    if (forcedFrameIdx !== undefined) return;
    setAutoFrameIdx(0);
    const durations = parseTempoMs(tempo);
    let timeoutId: number;

    const tick = (current: number) => {
      timeoutId = window.setTimeout(() => {
        const next = (current + 1) % 3;
        setAutoFrameIdx(next);
        tick(next);
      }, durations[current]);
    };

    tick(0);
    return () => window.clearTimeout(timeoutId);
  }, [slug, tempo, forcedFrameIdx]);

  const activeIdx = forcedFrameIdx !== undefined ? forcedFrameIdx % 3 : autoFrameIdx;
  const src = frames[activeIdx] || frames[0];

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 ${className}`}
      >
        No preview
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-50/80 px-2.5 pt-2 pb-4 shadow-inner ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain select-none invert hue-rotate-180 contrast-125 dark:invert-0 dark:hue-rotate-0 dark:contrast-100"
        draggable={false}
      />
      <div
        className="absolute bottom-1.5 flex items-center gap-1"
        aria-label={`Frame ${activeIdx + 1} of 3`}
      >
        {[0, 1, 2].map((idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              idx === activeIdx ? 'w-3 bg-blue-600' : 'w-1.5 bg-blue-300/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
