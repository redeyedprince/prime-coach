import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, HelpCircle } from 'lucide-react';

export function OAuthGuideAccordion() {
  const [open, setOpen] = useState(false);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);

  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://127.0.0.1:4173';
  const androidOrigin = 'https://localhost';
  const showSeparateWebOrigin = currentOrigin !== androidOrigin;

  const copyUri = async (uri: string) => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopiedUri(uri);
      window.setTimeout(() => setCopiedUri(null), 2000);
    } catch {
      // ignore if clipboard unavailable
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50/50"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          How to get a free Google OAuth Client ID (Step-by-Step)
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-slate-200 bg-white px-3.5 py-3 text-[11px] leading-relaxed text-slate-700">
          <p className="text-slate-600">
            <strong>100% Optional:</strong> Prime works completely offline without this. Only set
            this up if you want automatic backups to your own Google Drive and direct Drive links
            for Gemini AI coaching.
          </p>

          <ol className="list-decimal space-y-2 pl-4">
            <li>
              <strong>Create a free project:</strong> Open{' '}
              <span className="font-mono text-blue-700">https://console.cloud.google.com/</span>,
              click the project dropdown at the top, and create a new project named{' '}
              <strong>Prime Coach</strong>.
            </li>

            <li>
              <strong>Turn on Google Drive API:</strong> In the left menu, click{' '}
              <strong>APIs &amp; Services → Library</strong>. Search for{' '}
              <strong>Google Drive API</strong>, click it, and press <strong>Enable</strong>.
            </li>

            <li>
              <strong>Allow your own Gmail to sign in:</strong> In the left menu, click{' '}
              <strong>APIs &amp; Services → OAuth consent screen</strong>:
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
                <li>
                  If it asks to get started, set App Name to <strong>Prime</strong>, pick your
                  email, choose <strong>External</strong>, and finish.
                </li>
                <li>
                  Click <strong>Audience</strong> in the left menu → under{' '}
                  <strong>Test users</strong>, click <strong>+ Add users</strong>, enter your own
                  Gmail address, and click <strong>Save</strong>.
                </li>
              </ul>
            </li>

            <li>
              <strong>Create the Client ID:</strong> In the left menu, click{' '}
              <strong>APIs &amp; Services → Credentials</strong> → click{' '}
              <strong>+ Create Credentials</strong> at the top → choose{' '}
              <strong>OAuth client ID</strong>, then fill out the form exactly like this:
              <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">
                <li>
                  <strong>Application type:</strong> Select <strong>Web application</strong>.
                </li>
                <li>
                  <strong>Name:</strong> Type <strong>Prime App</strong> (this is just a private
                  label for you — any name works).
                </li>
                <li>
                  <strong>Authorized JavaScript origins:</strong> This simply tells Google which
                  exact address is allowed to open the Sign-In popup. Click{' '}
                  <strong>+ Add URI</strong> and paste:
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-bold text-slate-900">
                          {androidOrigin}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Required for the Prime Android APK
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyUri(androidOrigin)}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        {copiedUri === androidOrigin ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>

                    {showSeparateWebOrigin && (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] font-bold text-slate-900">
                            {currentOrigin}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Also click + Add URI for this browser address
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void copyUri(currentOrigin)}
                          className="flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                          {copiedUri === currentOrigin ? (
                            <>
                              <Check className="h-3 w-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
                <li>
                  <strong>Authorized redirect URIs:</strong> Leave this{' '}
                  <strong>completely empty</strong>.
                </li>
                <li>
                  Click <strong>Create</strong>.
                </li>
              </ul>
            </li>

            <li>
              <strong>Paste into Prime:</strong> A popup appears showing{' '}
              <strong>Your Client ID</strong> (ending in{' '}
              <span className="font-mono text-slate-800">.apps.googleusercontent.com</span>). Click{' '}
              <strong>Copy</strong>, paste it into Prime&apos;s{' '}
              <strong>Settings → Google OAuth Client ID</strong>, and tap{' '}
              <strong>Save Settings</strong>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
