import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { COACH_ARTICLES, TERM_GLOSSARY, type TermId } from '../../data/coachArticles';

interface TermHintProps {
  termId: TermId;
  className?: string;
}

export function TermHint({ termId, className = '' }: TermHintProps) {
  const [open, setOpen] = useState(false);
  const [showFullArticle, setShowFullArticle] = useState(false);
  const def = TERM_GLOSSARY[termId];
  if (!def) return null;

  const relatedArticle = def.relatedArticleId
    ? COACH_ARTICLES.find((a) => a.id === def.relatedArticleId)
    : undefined;

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 p-4 font-sans normal-case tracking-normal backdrop-blur-xs"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <div
              className="max-h-[84dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-blue-200 bg-white p-4 text-left shadow-2xl space-y-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-extrabold text-slate-900">
                  {def.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close help popup"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs leading-relaxed text-slate-700">{def.plainExplanation}</p>

              {relatedArticle && !showFullArticle && (
                <button
                  type="button"
                  onClick={() => setShowFullArticle(true)}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  Read 30-Second Guide: {relatedArticle.title}
                </button>
              )}

              {relatedArticle && showFullArticle && (
                <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-700">
                  <div className="font-bold text-blue-900">{relatedArticle.headline}</div>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed">
                    {relatedArticle.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  <div className="border-t border-blue-100 pt-1.5 text-[10px] text-slate-500">
                    {relatedArticle.researchNote}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Got It
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        aria-label={`Explain ${def.title}`}
        onClick={(e) => {
          e.stopPropagation();
          setShowFullArticle(false);
          setOpen(true);
        }}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-100 hover:text-blue-600 ${className}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {modal}
    </>
  );
}
