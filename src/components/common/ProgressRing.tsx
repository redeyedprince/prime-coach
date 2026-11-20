interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  fillColor?: string;
  label?: string;
}

export function ProgressRing({
  value,
  max,
  size = 44,
  strokeWidth = 4.5,
  trackColor = 'stroke-slate-200',
  fillColor = 'stroke-blue-600',
  label,
}: ProgressRingProps) {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={`${fillColor} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className="tabular-nums absolute text-[11px] font-extrabold text-slate-900">
        {label ?? `${value}/${max}`}
      </span>
    </div>
  );
}
