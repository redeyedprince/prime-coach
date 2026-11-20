import { Check } from 'lucide-react';

interface CelebrationBurstProps {
  compact?: boolean;
}

const SPARKS = [
  { angle: 0, dist: 38, color: '#0d9488' },
  { angle: 45, dist: 42, color: '#06b6d4' },
  { angle: 90, dist: 36, color: '#14b8a6' },
  { angle: 135, dist: 42, color: '#2dd4bf' },
  { angle: 180, dist: 38, color: '#0d9488' },
  { angle: 225, dist: 42, color: '#38bdf8' },
  { angle: 270, dist: 36, color: '#10b981' },
  { angle: 315, dist: 42, color: '#06b6d4' },
];

export function CelebrationBurst({ compact = false }: CelebrationBurstProps) {
  const scale = compact ? 0.65 : 1;
  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ width: 88 * scale, height: 88 * scale }}
    >
      {SPARKS.map((s) => {
        const rad = (s.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * s.dist * scale;
        const ty = Math.sin(rad) * s.dist * scale;
        return (
          <span
            key={s.angle}
            className="prime-spark absolute h-2 w-2 rounded-full"
            style={{
              backgroundColor: s.color,
              ['--tx' as string]: `${tx.toFixed(1)}px`,
              ['--ty' as string]: `${ty.toFixed(1)}px`,
            }}
          />
        );
      })}
      <div
        className="prime-logo-pop flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30"
        style={{ width: 56 * scale, height: 56 * scale }}
      >
        <Check className={compact ? 'h-5 w-5 stroke-[3]' : 'h-7 w-7 stroke-[3]'} />
      </div>
    </div>
  );
}
