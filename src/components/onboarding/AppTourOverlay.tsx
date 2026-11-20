import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Sparkles, X } from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
  actionHint: string;
}

interface AppTourOverlayProps {
  steps: TourStep[];
  currentStepIdx: number;
  onSkip: () => void;
  onFallbackNext?: () => void;
}

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function AppTourOverlay({
  steps,
  currentStepIdx,
  onSkip,
  onFallbackNext,
}: AppTourOverlayProps) {
  const step = steps[currentStepIdx];
  const [rect, setRect] = useState<RectBox | null>(null);
  const [missingTarget, setMissingTarget] = useState(false);

  useEffect(() => {
    if (!step) return;
    setMissingTarget(false);
    let scrolledOnce = false;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
      if (!el) {
        setRect(null);
        setMissingTarget(true);
        return;
      }
      setMissingTarget(false);
      const r = el.getBoundingClientRect();
      if (
        !scrolledOnce &&
        (r.top < 16 || r.bottom > window.innerHeight - 16)
      ) {
        scrolledOnce = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const pad = 6;
      setRect({
        top: Math.max(0, r.top - pad),
        left: Math.max(0, r.left - pad),
        width: Math.min(window.innerWidth, r.width + pad * 2),
        height: Math.min(window.innerHeight, r.height + pad * 2),
      });
    };

    measure();
    const id = window.setInterval(measure, 160);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  if (!step) return null;

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const placeTooltipAbove = rect ? rect.top + rect.height / 2 > viewportH * 0.52 : false;
  const centerX = rect ? rect.left + rect.width / 2 : viewportW / 2;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none" aria-live="polite">
      {/* 4-pane dark vignette blocking clicks everywhere EXCEPT inside the spotlight */}
      {rect ? (
        <>
          <div
            className="fixed left-0 right-0 top-0 bg-slate-900/72 pointer-events-auto transition-all duration-200"
            style={{ height: `${rect.top}px` }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="fixed left-0 right-0 bottom-0 bg-slate-900/72 pointer-events-auto transition-all duration-200"
            style={{ top: `${rect.top + rect.height}px` }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="fixed left-0 bg-slate-900/72 pointer-events-auto transition-all duration-200"
            style={{
              top: `${rect.top}px`,
              height: `${rect.height}px`,
              width: `${rect.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="fixed right-0 bg-slate-900/72 pointer-events-auto transition-all duration-200"
            style={{
              top: `${rect.top}px`,
              height: `${rect.height}px`,
              left: `${rect.left + rect.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Glowing Blue Spotlight Border */}
          <div
            className="fixed rounded-2xl border-2 border-blue-400 ring-4 ring-blue-500/40 shadow-[0_0_24px_rgba(59,130,246,0.65)] pointer-events-none transition-all duration-200"
            style={{
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }}
          />

          {/* Bouncing Pointer Arrow */}
          <div
            className="fixed z-[65] flex -translate-x-1/2 items-center justify-center rounded-full bg-blue-600 p-1.5 text-white shadow-lg animate-bounce pointer-events-none"
            style={{
              left: `${Math.min(viewportW - 28, Math.max(28, centerX))}px`,
              top: placeTooltipAbove ? `${Math.max(12, rect.top - 38)}px` : `${rect.top + rect.height + 8}px`,
            }}
          >
            {placeTooltipAbove ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </div>
        </>
      ) : (
        <div
          className="fixed inset-0 bg-slate-900/72 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div
        className="fixed left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl pointer-events-auto transition-all duration-200"
        style={
          rect
            ? placeTooltipAbove
              ? { bottom: `${Math.min(viewportH - 140, viewportH - rect.top + 48)}px` }
              : { top: `${Math.min(viewportH - 210, rect.top + rect.height + 48)}px` }
            : { top: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600">
            <Sparkles className="h-3.5 w-3.5" />
            Quick Tour · Step {currentStepIdx + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            Skip
            <X className="h-3 w-3" />
          </button>
        </div>

        <h3 className="mt-1.5 text-base font-extrabold text-slate-900">{step.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.description}</p>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <span className="text-xs font-bold text-blue-800">{step.actionHint}</span>
          {missingTarget && onFallbackNext && (
            <button
              type="button"
              onClick={onFallbackNext}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
