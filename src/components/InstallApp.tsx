'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Plus, Share, X } from 'lucide-react';
import {
  detectIOSKind,
  detectStandalone,
  type BeforeInstallPromptEvent,
  type IOSKind,
} from '@/lib/install';

const GRADIENT = 'linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%)';

export function InstallApp() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosKind, setIosKind] = useState<IOSKind>('none');
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInstalled(detectStandalone());
    setIosKind(detectIOSKind());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const canPrompt = !!prompt;
  const canGuide = iosKind !== 'none' && !prompt;
  if (!canPrompt && !canGuide) return null;

  const handleClick = async () => {
    if (prompt) {
      try {
        await prompt.prompt();
      } finally {
        setPrompt(null);
      }
      return;
    }
    if (iosKind !== 'none') setShowGuide(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — user can still copy from address bar
    }
  };

  return (
    <>
      <section
        className="rounded-[26px] border border-[rgba(255,90,168,.2)] p-5 shadow-[0_20px_50px_rgba(0,0,0,.4)] backdrop-blur-[20px]"
        style={{ background: 'linear-gradient(180deg,rgba(255,90,168,.09) 0%,rgba(124,58,237,.06) 100%)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
            style={{ background: GRADIENT }}
          >
            <Download className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">
              Get the app
            </p>
            <h3 className="mt-0.5 text-base font-semibold">Add Bar Til Bar to home screen</h3>
            <p className="mt-1 text-sm text-slate-400">
              Full-screen, no browser bar, launches like a real app.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98]"
          style={{ background: GRADIENT }}
        >
          <Download className="h-4 w-4" aria-hidden />
          {canPrompt ? 'Install app' : 'Show me how'}
        </button>
      </section>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 pt-6 backdrop-blur-sm sm:items-center"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-[26px] border border-white/[.085] bg-[#14101c] p-5 shadow-[0_20px_50px_rgba(0,0,0,.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">
                  Install on iPhone
                </p>
                <h3 className="mt-0.5 text-lg font-semibold">
                  {iosKind === 'safari' ? 'Add to home screen' : 'Open in Safari first'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full border border-white/10 bg-white/[.05] p-1.5 text-slate-300 transition hover:bg-white/[.12]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {iosKind === 'safari' ? (
              <>
                <ol className="mt-5 space-y-3">
                  <li className="flex items-start gap-3 rounded-2xl border border-white/[.055] bg-white/[.028] p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,168,.14)] text-xs font-bold text-[#ff5aa8]">
                      1
                    </span>
                    <p className="text-sm leading-relaxed">
                      Tap the <Share className="mx-0.5 inline h-4 w-4 -translate-y-0.5" aria-hidden />{' '}
                      <span className="font-semibold">Share</span> button in Safari&apos;s toolbar.
                    </p>
                  </li>
                  <li className="flex items-start gap-3 rounded-2xl border border-white/[.055] bg-white/[.028] p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,168,.14)] text-xs font-bold text-[#ff5aa8]">
                      2
                    </span>
                    <p className="text-sm leading-relaxed">
                      Scroll and pick <span className="font-semibold">Add to Home Screen</span>{' '}
                      <Plus className="mx-0.5 inline h-4 w-4 -translate-y-0.5" aria-hidden />.
                    </p>
                  </li>
                  <li className="flex items-start gap-3 rounded-2xl border border-white/[.055] bg-white/[.028] p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,168,.14)] text-xs font-bold text-[#ff5aa8]">
                      3
                    </span>
                    <p className="text-sm leading-relaxed">
                      Tap <span className="font-semibold">Add</span> in the top-right corner.
                    </p>
                  </li>
                </ol>
                <p className="mt-4 text-xs text-slate-500">
                  Only works in Safari, not other iOS browsers.
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  iPhone can only install apps through <span className="font-semibold">Safari</span>.
                  Copy the link, open Safari, paste it in the address bar, then come back to install.
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[.085] bg-white/[.05] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[.12] active:scale-[.98]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden /> Link copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden /> Copy link
                    </>
                  )}
                </button>
                <p className="mt-3 text-xs text-slate-500">
                  In Safari: tap <Share className="mx-0.5 inline h-3.5 w-3.5 -translate-y-0.5" aria-hidden />{' '}
                  Share → <span className="font-semibold">Add to Home Screen</span>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
