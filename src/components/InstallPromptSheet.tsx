'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Compass, Copy, Download, Plus, Share, X } from 'lucide-react';
import {
  detectIOSKind,
  detectStandalone,
  INSTALL_DISMISS_KEY as DISMISS_KEY,
  OPEN_INSTALL_EVENT,
  type BeforeInstallPromptEvent,
  type IOSKind,
} from '@/lib/install';

const GRADIENT = 'linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%)';
const SHOW_DELAY_MS = 2000;

type Mode = 'cta' | 'guide';

export function InstallPromptSheet() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosKind, setIosKind] = useState<IOSKind>('none');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('cta');
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
      setOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (installed) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

    const canPrompt = !!prompt;
    const canGuide = iosKind !== 'none' && !prompt;
    if (!canPrompt && !canGuide) return;

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [installed, prompt, iosKind]);

  // Re-open on demand (profile button). Ignore if there's nothing to install.
  useEffect(() => {
    const onOpenRequest = () => {
      const canPrompt = !!prompt;
      const canGuide = iosKind !== 'none' && !prompt;
      if (installed || (!canPrompt && !canGuide)) return;
      setMode('cta');
      setOpen(true);
    };
    window.addEventListener(OPEN_INSTALL_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_INSTALL_EVENT, onOpenRequest);
  }, [installed, prompt, iosKind]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
    setMode('cta');
  };

  const handleInstall = async () => {
    if (prompt) {
      try {
        await prompt.prompt();
      } finally {
        setPrompt(null);
        setOpen(false);
      }
      return;
    }
    if (iosKind !== 'none') setMode('guide');
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

  if (installed) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-6 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="relative w-full max-w-sm rounded-[26px] border border-white/[.085] bg-[#14101c] p-5 pt-6 shadow-[0_20px_50px_rgba(0,0,0,.5)]"
            initial={{ y: '110%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) dismiss();
            }}
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
                  style={{ background: GRADIENT }}
                >
                  <Download className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">
                    {mode === 'cta' ? 'Get the app' : 'Install on iPhone'}
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold">
                    {mode === 'cta'
                      ? 'Install Bar Til Bar'
                      : iosKind === 'safari'
                        ? 'Add to home screen'
                        : 'Open in Safari first'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-white/10 bg-white/[.05] p-1.5 text-slate-300 transition hover:bg-white/[.12]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {mode === 'cta' ? (
              <>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  Add it to your home screen for a full-screen experience — no browser bar, launches
                  like a real app.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleInstall}
                    className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98]"
                    style={{ background: GRADIENT }}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    {prompt ? 'Install app' : 'Show me how'}
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                  >
                    Not now
                  </button>
                </div>
              </>
            ) : iosKind === 'safari' ? (
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
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-4 w-full rounded-full px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                >
                  Got it
                </button>
              </>
            ) : (
              <>
                <div className="mt-4 flex flex-col items-center gap-3 rounded-[22px] border border-[rgba(255,90,168,.25)] bg-[rgba(255,90,168,.08)] p-5 text-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#4fa3ff] to-[#0a63d6] shadow-[0_10px_24px_rgba(10,99,214,.35)]">
                    <Compass className="h-9 w-9 text-white" strokeWidth={2.2} aria-hidden />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">
                      Safari required
                    </p>
                    <p className="mt-1 text-base font-semibold leading-snug">
                      This browser can&apos;t install the app
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      iPhone only lets you install from Safari.
                    </p>
                  </div>
                </div>

                <ol className="mt-4 space-y-2">
                  <li className="flex items-center gap-3 rounded-2xl border border-white/[.055] bg-white/[.028] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,168,.14)] text-xs font-bold text-[#ff5aa8]">
                      1
                    </span>
                    <p className="text-sm">Copy the link below.</p>
                  </li>
                  <li className="flex items-center gap-3 rounded-2xl border border-white/[.055] bg-white/[.028] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,168,.14)] text-xs font-bold text-[#ff5aa8]">
                      2
                    </span>
                    <p className="text-sm">
                      Open <span className="font-semibold">Safari</span> and paste it in the address bar.
                    </p>
                  </li>
                  <li className="flex items-center gap-3 rounded-2xl border border-white/[.055] bg-white/[.028] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,168,.14)] text-xs font-bold text-[#ff5aa8]">
                      3
                    </span>
                    <p className="text-sm">
                      Tap <Share className="mx-0.5 inline h-4 w-4 -translate-y-0.5" aria-hidden />{' '}
                      Share → <span className="font-semibold">Add to Home Screen</span>.
                    </p>
                  </li>
                </ol>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98]"
                  style={{ background: GRADIENT }}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden /> Link copied — now open Safari
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden /> Copy link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-2 w-full rounded-full px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                >
                  Not now
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
