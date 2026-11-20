import { ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import {
  getTapeZoneGuide,
  type TapeZoneId,
} from '../../engine/bodyMetrics';
import type { BiologicalSex } from '../../types/schemas';

interface BodyMeasurementGuideSvgProps {
  sex: BiologicalSex;
  activeZone: TapeZoneId;
  onSelectZone: (zone: TapeZoneId) => void;
}

const ZONE_ORDER: TapeZoneId[] = [
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hips',
  'arm',
  'thigh',
];

function getZoneChecklist(zone: TapeZoneId, sex: BiologicalSex): [string, string, string] {
  const isFemale = sex === 'female';
  switch (zone) {
    case 'neck':
      return [
        isFemale ? 'Just below larynx' : 'Just below Adam’s apple',
        'Tape horizontal all around',
        'Look straight, neck relaxed',
      ];
    case 'shoulders':
      return ['Widest outer deltoid bulge', 'Arms relaxed at your sides', 'Tape flat across chest & back'];
    case 'chest':
      return isFemale
        ? ['Thin unpadded bra or bare', 'Across fullest bust line', 'Level straight across back']
        : ['High under armpits', 'Mid-pectoral / nipple line', 'Measure after gentle exhale'];
    case 'waist':
      return isFemale
        ? ['Narrowest natural waist', 'Just ABOVE your navel', 'Relaxed exhale — don’t suck in']
        : ['Flat directly over navel', 'Level front-to-back', 'Relaxed exhale — don’t suck in'];
    case 'hips':
      return ['Stand with feet together', 'Widest glute protrusion', 'Tape parallel to the floor'];
    case 'arm':
      return ['Exact 50% shoulder-to-elbow', 'Tape snug, no skin pinch', 'Log Left & Right separately'];
    case 'thigh':
      return ['Stand tall, weight even', 'Widest upper-mid thigh', 'Log Left & Right separately'];
  }
}

/**
 * Reusable realistic emerald measuring-tape band with centimeter tick marks
 * and a dashed rear-wrap arc so users see exact horizontal placement.
 */
function MeasuringTapeBand({
  x1,
  x2,
  y,
  curve = 8,
  backCurve = -7,
  bandHeight = 9,
  ticks = 9,
}: {
  x1: number;
  x2: number;
  y: number;
  curve?: number;
  backCurve?: number;
  bandHeight?: number;
  ticks?: number;
}) {
  const midX = (x1 + x2) / 2;
  const topY = y - bandHeight / 2;
  const botY = y + bandHeight / 2;

  const tickNodes = Array.from({ length: ticks }, (_, i) => {
    const t = (i + 1) / (ticks + 1);
    const tx = x1 + (x2 - x1) * t;
    const curveOffset = 2 * (1 - t) * t * curve;
    const tyTop = topY + curveOffset;
    const isMajor = i % 2 === 1;
    return (
      <line
        key={i}
        x1={tx}
        y1={tyTop + 1}
        x2={tx}
        y2={tyTop + (isMajor ? bandHeight * 0.62 : bandHeight * 0.38)}
        stroke="#ecfdf5"
        strokeWidth={isMajor ? 1.2 : 0.9}
        strokeLinecap="round"
        opacity={0.95}
      />
    );
  });

  return (
    <g>
      <path
        d={`M ${x1} ${y} Q ${midX} ${y + backCurve} ${x2} ${y}`}
        fill="none"
        stroke="#0f766e"
        strokeWidth={2}
        strokeDasharray="4 3"
        opacity={0.55}
      />
      <path
        d={`M ${x1} ${topY} Q ${midX} ${topY + curve} ${x2} ${topY} L ${x2} ${botY} Q ${midX} ${botY + curve} ${x1} ${botY} Z`}
        fill="#0d9488"
        stroke="#042f2e"
        strokeWidth={1}
      />
      <path
        d={`M ${x1 + 1} ${topY + 1} Q ${midX} ${topY + curve + 1} ${x2 - 1} ${topY + 1}`}
        fill="none"
        stroke="#5eead4"
        strokeWidth={0.9}
        opacity={0.75}
      />
      {tickNodes}
      <path
        d={`M ${x2 - 2} ${topY + 1} L ${x2 + 12} ${topY + 4} L ${x2 + 10} ${botY + 3} L ${x2 - 2} ${botY - 1} Z`}
        fill="#14b8a6"
        stroke="#042f2e"
        strokeWidth={0.9}
      />
    </g>
  );
}

function Callout({
  dotX,
  dotY,
  labelX,
  labelY,
  text,
  subtext,
  align = 'start',
  accent = false,
}: {
  dotX: number;
  dotY: number;
  labelX: number;
  labelY: number;
  text: string;
  subtext?: string;
  align?: 'start' | 'end';
  accent?: boolean;
}) {
  const elbowX = align === 'start' ? labelX - 6 : labelX + 6;
  return (
    <g>
      <polyline
        points={`${dotX},${dotY} ${elbowX},${labelY} ${align === 'start' ? labelX - 2 : labelX + 2},${labelY}`}
        fill="none"
        stroke={accent ? '#0d9488' : '#64748b'}
        strokeWidth={accent ? 1.6 : 1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={dotX}
        cy={dotY}
        r={accent ? 3.5 : 2.6}
        fill={accent ? '#0d9488' : '#475569'}
        stroke="#ffffff"
        strokeWidth={1.2}
      />
      <text
        x={labelX}
        y={labelY + 3}
        textAnchor={align}
        fontSize={10}
        fontWeight={700}
        fill={accent ? '#0f766e' : '#334155'}
      >
        {text}
      </text>
      {subtext && (
        <text
          x={labelX}
          y={labelY + 14}
          textAnchor={align}
          fontSize={8.5}
          fontWeight={500}
          fill="#64748b"
        >
          {subtext}
        </text>
      )}
    </g>
  );
}

function CloseUpIllustration({
  zone,
  sex,
}: {
  zone: TapeZoneId;
  sex: BiologicalSex;
}) {
  const isFemale = sex === 'female';

  switch (zone) {
    case 'neck': {
      const neckHalf = isFemale ? 24 : 30;
      const cx = 148;
      return (
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label={`Detailed ${sex} neck tape placement guide`}>
          <line x1="16" y1="115" x2="304" y2="115" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          {/* Upper chest & shoulders (slender sloped female vs broader male traps) */}
          <path
            d={
              isFemale
                ? `M 64 186 C 74 160, 98 148, ${cx - neckHalf} 142 L ${cx - neckHalf + 2} 100 L ${cx + neckHalf - 2} 100 L ${cx + neckHalf} 142 C 198 148, 222 160, 232 186 Z`
                : `M 48 186 C 60 154, 86 144, ${cx - neckHalf} 138 L ${cx - neckHalf + 2} 100 L ${cx + neckHalf - 2} 100 L ${cx + neckHalf} 138 C 210 144, 236 154, 248 186 Z`
            }
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d={`M ${cx - 56} 158 Q ${cx - 22} 150 ${cx - 4} 158`} fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
          <path d={`M ${cx + 56} 158 Q ${cx + 22} 150 ${cx + 4} 158`} fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx={cx} cy="158" r="2.2" fill="#94a3b8" />

          {/* Lower head / jaw */}
          <path
            d={
              isFemale
                ? `M ${cx - 38} 20 C ${cx - 38} 56, ${cx - 26} 86, ${cx} 92 C ${cx + 26} 86, ${cx + 38} 56, ${cx + 38} 20`
                : `M ${cx - 44} 20 C ${cx - 46} 58, ${cx - 35} 88, ${cx} 94 C ${cx + 35} 88, ${cx + 46} 58, ${cx + 44} 20`
            }
            fill="#f8fafc"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d={`M ${cx - 26} 74 Q ${cx} 89 ${cx + 26} 74`} fill="none" stroke="#cbd5e1" strokeWidth="1.4" />
          <path d={`M ${cx - 5} 104 Q ${cx} 108 ${cx + 5} 104`} fill="none" stroke="#475569" strokeWidth="1.7" strokeLinecap="round" />

          <MeasuringTapeBand x1={cx - neckHalf} x2={cx + neckHalf} y={115} curve={7} backCurve={-6} bandHeight={9} ticks={7} />

          <Callout
            dotX={cx}
            dotY={104}
            labelX={208}
            labelY={64}
            text={isFemale ? 'Larynx (mid-neck)' : "Larynx (Adam's apple)"}
            subtext="Landmark above tape"
          />
          <Callout dotX={cx + neckHalf + 6} dotY={115} labelX={208} labelY={115} text="Tape sits just below" subtext="Horizontal · not tight" accent />
          <Callout dotX={cx - 40} dotY={155} labelX={82} labelY={126} align="end" text="Collarbone" subtext="Shoulders down" />
        </svg>
      );
    }

    case 'shoulders': {
      const centerX = 158;
      const halfSpan = isFemale ? 56 : 68;
      const outerX = centerX - halfSpan;
      const rightOuterX = centerX + halfSpan;
      const waistHalf = isFemale ? 30 : 39;
      return (
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label={`Detailed ${sex} shoulder tape placement guide`}>
          <line x1="16" y1="92" x2="304" y2="92" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          <ellipse cx={centerX} cy="28" rx={isFemale ? 16 : 18} ry="20" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
          <path
            d={`M ${centerX - (isFemale ? 11 : 13)} 44 L ${centerX - (isFemale ? 12 : 14)} 60 C ${centerX - (isFemale ? 28 : 34)} 64, ${outerX + 10} 69, ${outerX + 2} 85 L ${outerX - 3} 178 L ${outerX + (isFemale ? 18 : 22)} 178 L ${outerX + (isFemale ? 22 : 27)} 118 L ${centerX - waistHalf} 178 L ${centerX + waistHalf} 178 L ${rightOuterX - (isFemale ? 22 : 27)} 118 L ${rightOuterX - (isFemale ? 18 : 22)} 178 L ${rightOuterX + 3} 178 L ${rightOuterX - 2} 85 C ${rightOuterX - 10} 69, ${centerX + (isFemale ? 28 : 34)} 64, ${centerX + (isFemale ? 12 : 14)} 60 L ${centerX + (isFemale ? 11 : 13)} 44`}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d={`M ${centerX - 30} 76 Q ${centerX - 12} 71 ${centerX} 75 Q ${centerX + 12} 71 ${centerX + 30} 76`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />

          <MeasuringTapeBand x1={outerX - 2} x2={rightOuterX + 2} y={92} curve={9} backCurve={-8} bandHeight={9} ticks={11} />

          <Callout dotX={outerX} dotY={92} labelX={76} labelY={56} align="end" text="Outer deltoid" subtext="Widest cap" accent />
          <Callout dotX={rightOuterX} dotY={92} labelX={242} labelY={56} text="Arms inside" subtext="Relaxed at sides" accent />
          <Callout dotX={rightOuterX - 7} dotY={146} labelX={242} labelY={146} text="Arms straight" subtext="Stand tall" />
        </svg>
      );
    }

    case 'chest':
      return isFemale ? (
        // DISTINCT FEMALE BUST / CHEST ILLUSTRATION (clear bust contour + unpadded bra cue)
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label="Detailed female bust and chest tape placement guide">
          <line x1="16" y1="100" x2="304" y2="100" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          {/* Slender female upper torso with raised arms & hourglass taper to waist */}
          <path
            d="M 140 16 L 140 34 C 122 39, 102 47, 86 62 L 54 84 L 64 102 L 100 84 L 108 94 C 102 110, 104 126, 114 142 C 118 156, 118 170, 114 182 L 204 182 C 200 170, 200 156, 204 142 C 214 126, 216 110, 210 94 L 218 84 L 254 102 L 264 84 L 232 62 C 216 47, 196 39, 178 34 L 178 16"
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Collarbone */}
          <path d="M 124 47 Q 159 55 194 47" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Clear natural female bust contours (left & right cups + underbust fold) */}
          <path
            d="M 112 88 C 106 108, 116 126, 136 126 C 148 126, 155 117, 157 104"
            fill="#e2e8f0"
            fillOpacity="0.45"
            stroke="#64748b"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 206 88 C 212 108, 202 126, 182 126 C 170 126, 163 117, 161 104"
            fill="#e2e8f0"
            fillOpacity="0.45"
            stroke="#64748b"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Underarm crease markers */}
          <circle cx="106" cy="90" r="2.2" fill="#64748b" />
          <circle cx="212" cy="90" r="2.2" fill="#64748b" />

          {/* Horizontal tape strictly across FULLEST BUST APEX (y=102) */}
          <MeasuringTapeBand x1={106} x2={212} y={102} curve={9} backCurve={-8} bandHeight={9} ticks={9} />

          {/* Callouts */}
          <Callout dotX={106} dotY={90} labelX={86} labelY={144} align="end" text="Level across back" subtext="Straight under arms" />
          <Callout dotX={184} dotY={104} labelX={230} labelY={34} text="Fullest bust line" subtext="Unpadded bra or bare" accent />
          <Callout dotX={211} dotY={102} labelX={230} labelY={144} text="Snug, not tight" subtext="After gentle exhale" />
        </svg>
      ) : (
        // DISTINCT MALE CHEST ILLUSTRATION (broad athletic pectorals)
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label="Detailed male chest tape placement guide">
          <line x1="16" y1="96" x2="304" y2="96" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          <path
            d="M 134 18 L 134 36 C 112 40, 90 48, 72 64 L 40 88 L 52 108 L 92 86 L 102 96 L 108 182 L 210 182 L 216 96 L 226 86 L 266 108 L 278 88 L 246 64 C 228 48, 206 40, 184 36 L 184 18"
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M 120 48 Q 159 56 198 48" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Male pectoral chest lines */}
          <path d="M 111 104 Q 135 112 157 102 M 161 102 Q 183 112 207 104" fill="none" stroke="#64748b" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="100" cy="90" r="2.2" fill="#64748b" />
          <circle cx="218" cy="90" r="2.2" fill="#64748b" />

          <MeasuringTapeBand x1={103} x2={215} y={96} curve={8} backCurve={-7} bandHeight={9} ticks={9} />

          <Callout dotX={100} dotY={90} labelX={86} labelY={144} align="end" text="Under armpits" subtext="Level across back" />
          <Callout dotX={184} dotY={98} labelX={230} labelY={34} text="Mid-pectoral line" subtext="Across fullest chest" accent />
          <Callout dotX={214} dotY={96} labelX={230} labelY={144} text="Gentle exhale" subtext="Don't puff chest" />
        </svg>
      );

    case 'waist': {
      const cx = 158;
      if (isFemale) {
        // DISTINCT FEMALE NATURAL WAIST (Hourglass contour, tape ABOVE navel at narrowest point!)
        return (
          <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label="Detailed female natural waist tape placement guide">
            <line x1="16" y1="90" x2="304" y2="90" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

            {/* Hourglass female torso: lower ribs -> narrow natural waist (y=90) -> fuller hips */}
            <path
              d={`M ${cx - 50} 14 C ${cx - 48} 46, ${cx - 38} 70, ${cx - 38} 90 C ${cx - 38} 112, ${cx - 64} 144, ${cx - 70} 182 L ${cx + 70} 182 C ${cx + 64} 144, ${cx + 38} 112, ${cx + 38} 90 C ${cx + 38} 70, ${cx + 48} 46, ${cx + 50} 14`}
              fill="#f1f5f9"
              stroke="#64748b"
              strokeWidth="2.2"
            />
            {/* Lower ribcage arches */}
            <path d={`M ${cx - 38} 50 Q ${cx - 16} 40 ${cx} 50 Q ${cx + 16} 40 ${cx + 38} 50`} fill="none" stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="3 2" />

            {/* Navel clearly BELOW the natural waist tape (y=120) */}
            <ellipse cx={cx} cy={120} rx="4" ry="5" fill="#94a3b8" opacity="0.5" />
            <circle cx={cx} cy={120} r="2.2" fill="#475569" />

            {/* Measuring tape at NARROWEST NATURAL WAIST (y=90, ABOVE navel!) */}
            <MeasuringTapeBand x1={cx - 39} x2={cx + 39} y={90} curve={7} backCurve={-6} bandHeight={9} ticks={9} />

            {/* Landmarks */}
            <Callout dotX={cx - 28} dotY={46} labelX={88} labelY={40} align="end" text="Lower ribcage" subtext="Above waist" />
            <Callout dotX={cx + 38} dotY={90} labelX={226} labelY={78} text="Narrowest waist" subtext="Just above navel" accent />
            <Callout dotX={cx} dotY={120} labelX={226} labelY={132} text="Navel (belly button)" subtext="Sits below tape" />
          </svg>
        );
      }

      // DISTINCT MALE WAIST (Straighter athletic torso, tape DIRECTLY OVER navel!)
      const waistHalf = 50;
      return (
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label="Detailed male waist tape placement guide">
          <line x1="16" y1="100" x2="304" y2="100" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          <path
            d={`M ${cx - 56} 14 C ${cx - 54} 48, ${cx - waistHalf} 74, ${cx - waistHalf} 100 C ${cx - waistHalf} 126, ${cx - 58} 150, ${cx - 60} 182 L ${cx + 60} 182 C ${cx + 58} 150, ${cx + waistHalf} 126, ${cx + waistHalf} 100 C ${cx + waistHalf} 74, ${cx + 54} 48, ${cx + 56} 14`}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
          />
          <path d={`M ${cx - 42} 54 Q ${cx - 18} 44 ${cx} 54 Q ${cx + 18} 44 ${cx + 42} 54`} fill="none" stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="3 2" />
          <path d={`M ${cx - 50} 138 Q ${cx - 32} 148 ${cx - 22} 158`} fill="none" stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="3 2" />
          <path d={`M ${cx + 50} 138 Q ${cx + 32} 148 ${cx + 22} 158`} fill="none" stroke="#cbd5e1" strokeWidth="1.6" strokeDasharray="3 2" />

          <ellipse cx={cx} cy={103} rx="4.5" ry="5.5" fill="#94a3b8" opacity="0.55" />
          <circle cx={cx} cy={103} r="2.2" fill="#475569" />

          <MeasuringTapeBand x1={cx - waistHalf - 1} x2={cx + waistHalf + 1} y={100} curve={8} backCurve={-7} bandHeight={9} ticks={9} />

          <Callout dotX={cx - 32} dotY={48} labelX={86} labelY={40} align="end" text="Lower ribcage" subtext="Above waist" />
          <Callout dotX={cx} dotY={104} labelX={226} labelY={86} text="Over navel" subtext="Relaxed exhale" accent />
          <Callout dotX={cx + 46} dotY={144} labelX={226} labelY={144} text="Hip crest" subtext="Just below tape" />
        </svg>
      );
    }

    case 'hips': {
      const peakX = isFemale ? 94 : 109;
      return (
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label={`Detailed ${sex} hips and glutes tape placement guide`}>
          <line x1="16" y1="98" x2="304" y2="98" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          {/* Side-3/4 profile close-up tailored to female fuller pelvic/glute curve vs leaner male profile */}
          <path
            d={
              isFemale
                ? `M 142 14 C 142 40, 134 54, 102 82 C 89 99, 97 123, 120 140 L 128 182 L 190 182 L 194 132 C 202 108, 200 84, 192 60 C 186 42, 184 28, 184 14`
                : `M 138 14 C 138 40, 134 54, 114 84 C 106 102, 112 122, 124 138 L 130 182 L 192 182 L 194 132 C 198 108, 198 86, 194 62 C 190 42, 188 28, 188 14`
            }
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
          />
          <path d="M 122 136 Q 144 134 154 128" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="160" y1="142" x2="162" y2="182" stroke="#cbd5e1" strokeWidth="1.6" />

          <line x1={peakX} y1={74} x2={peakX} y2={124} stroke="#0d9488" strokeWidth="1.2" strokeDasharray="2 2" />
          <MeasuringTapeBand x1={peakX} x2={198} y={98} curve={7} backCurve={-6} bandHeight={9} ticks={9} />

          <Callout dotX={peakX + 1} dotY={98} labelX={82} labelY={56} align="end" text="Widest glute" subtext="Max rear curve" accent />
          <Callout dotX={196} dotY={98} labelX={216} labelY={86} text="Level wrap" subtext="Parallel to floor" accent />
          <Callout dotX={162} dotY={164} labelX={216} labelY={152} text="Feet together" subtext="Stand relaxed" />
        </svg>
      );
    }

    case 'arm':
      return (
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label="Detailed upper arm bicep tape placement guide">
          <line x1="20" y1="104" x2="296" y2="104" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          <path
            d="M 102 18 C 122 18, 148 26, 156 54 C 164 82, 166 116, 158 148 C 156 160, 158 172, 162 184 L 116 184 C 114 166, 114 152, 110 138 C 102 114, 102 82, 104 58 L 96 42"
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M 110 66 Q 134 74 154 62" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M 155 82 Q 168 104 156 128" fill="none" stroke="#94a3b8" strokeWidth="1.6" />

          <line x1="76" y1="42" x2="76" y2="166" stroke="#0f766e" strokeWidth="1.5" />
          <line x1="70" y1="42" x2="122" y2="42" stroke="#64748b" strokeWidth="1.1" strokeDasharray="3 2" />
          <line x1="70" y1="166" x2="132" y2="166" stroke="#64748b" strokeWidth="1.1" strokeDasharray="3 2" />
          <circle cx="122" cy="42" r="3" fill="#475569" />
          <circle cx="132" cy="166" r="3" fill="#475569" />
          <rect x="44" y="94" width="54" height="19" rx="5" fill="#ccfbf1" stroke="#0d9488" strokeWidth="1" />
          <text x="71" y="107" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#0f766e">
            50% MID
          </text>

          <MeasuringTapeBand x1={103} x2={164} y={104} curve={7} backCurve={-6} bandHeight={9} ticks={7} />

          <Callout dotX={122} dotY={42} labelX={192} labelY={40} text="Shoulder tip" subtext="Top bony edge (acromion)" />
          <Callout dotX={165} dotY={104} labelX={192} labelY={102} text="50% midpoint" subtext="Wrap perpendicular · L & R" accent />
          <Callout dotX={132} dotY={166} labelX={192} labelY={160} text="Elbow crease / tip" subtext="Relaxed or flexed (be consistent)" />
        </svg>
      );

    case 'thigh':
      return (
        <svg viewBox="0 0 320 190" className="h-44 w-full select-none" role="img" aria-label="Detailed upper thigh tape placement guide">
          <line x1="18" y1="88" x2="304" y2="88" stroke="#99f6e4" strokeWidth="1" strokeDasharray="3 3" />

          <path
            d="M 88 14 C 84 42, 84 74, 92 110 C 98 138, 102 158, 104 184 L 160 184 C 162 158, 166 138, 174 110 C 180 76, 182 44, 176 14"
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="2.2"
          />
          <path d="M 90 38 Q 132 48 176 38" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeDasharray="3 2" />
          <ellipse cx="132" cy="168" rx="15" ry="11" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

          <line x1="68" y1="42" x2="68" y2="88" stroke="#0f766e" strokeWidth="1.5" />
          <line x1="62" y1="42" x2="88" y2="42" stroke="#64748b" strokeWidth="1.1" strokeDasharray="3 2" />
          <line x1="62" y1="88" x2="86" y2="88" stroke="#0d9488" strokeWidth="1.2" />
          <rect x="20" y="55" width="44" height="19" rx="5" fill="#ccfbf1" stroke="#0d9488" strokeWidth="1" />
          <text x="42" y="68" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0f766e">
            ~12 cm
          </text>

          <MeasuringTapeBand x1={86} x2={179} y={88} curve={8} backCurve={-7} bandHeight={9} ticks={9} />

          <Callout dotX={174} dotY={40} labelX={198} labelY={40} text="Hip / gluteal fold" subtext="Upper reference line" />
          <Callout dotX={179} dotY={88} labelX={198} labelY={92} text="Widest upper thigh" subtext="Level · Measure L & R" accent />
          <Callout dotX={148} dotY={168} labelX={198} labelY={160} text="Kneecap (patella)" subtext="Stand with even weight" />
        </svg>
      );
  }
}

export function BodyMeasurementGuideSvg({
  sex,
  activeZone,
  onSelectZone,
}: BodyMeasurementGuideSvgProps) {
  const guide = getTapeZoneGuide(activeZone, sex);
  const checklist = getZoneChecklist(activeZone, sex);
  const activeIdx = ZONE_ORDER.indexOf(activeZone);

  const cycleZone = (delta: number) => {
    const nextIdx = (activeIdx + delta + ZONE_ORDER.length) % ZONE_ORDER.length;
    onSelectZone(ZONE_ORDER[nextIdx]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
          <Ruler className="h-3.5 w-3.5" />
          <span>Exact Tape Placement (cm)</span>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 capitalize">
          {sex} Guide · {activeIdx + 1}/7
        </span>
      </div>

      {/* Zone Selector Pills */}
      <div className="flex flex-wrap gap-1">
        {ZONE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectZone(id)}
            className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition ${
              activeZone === id
                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {getTapeZoneGuide(id, sex).shortLabel}
          </button>
        ))}
      </div>

      {/* Zoomed-In Close-Up Anatomical Diagram */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-2.5 py-1.5">
          <button
            type="button"
            aria-label="Previous body zone"
            onClick={() => cycleZone(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-extrabold text-slate-800">{guide.label}</span>
          <button
            type="button"
            aria-label="Next body zone"
            onClick={() => cycleZone(1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-2 py-1.5">
          <CloseUpIllustration zone={activeZone} sex={sex} />
        </div>

        {/* 3 Crisp Sex-Tailored Landmark Cues */}
        <div className="grid grid-cols-3 gap-1 border-t border-slate-100 bg-slate-50/70 px-2 py-1.5 text-center">
          {checklist.map((cue) => (
            <div
              key={cue}
              className="rounded-lg bg-white px-1.5 py-1 text-[9.5px] font-semibold leading-tight text-slate-700 border border-slate-200/70"
            >
              {cue}
            </div>
          ))}
        </div>
      </div>

      {/* Live Active Placement Cue */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-[11px] leading-relaxed text-slate-700">
        <strong className="text-blue-800">How to place the tape ({sex}):</strong> {guide.howToMeasure}
        <div className="mt-1 text-[10px] text-slate-500">
          Best accuracy: measure first thing in the morning before eating, tape snug without
          indenting skin.
        </div>
      </div>
    </div>
  );
}
