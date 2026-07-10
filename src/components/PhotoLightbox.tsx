'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Heart, X } from 'lucide-react';
import { downloadImage } from '@/lib/download';

export interface LightboxPhoto {
  id: string;
  photoUrl: string;
  groupName: string;
  groupColor: string;
  challengeTitle?: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  /** Index of the open photo, or null when closed. */
  index: number | null;
  likeCounts: Record<string, number>;
  likedByMe: Record<string, boolean>;
  onToggleLike: (photoId: string) => void;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function PhotoLightbox({
  photos,
  index,
  likeCounts,
  likedByMe,
  onToggleLike,
  onIndexChange,
  onClose,
}: PhotoLightboxProps) {
  const open = index != null && index >= 0 && index < photos.length;
  const i = open ? (index as number) : 0;
  const photo = open ? photos[i] : null;

  const go = (delta: number) => {
    if (!open) return;
    const next = i + delta;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  };

  // Keyboard nav on desktop: arrows move, Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, photos.length]);

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: photo.groupColor }} />
                <span className="truncate text-[13px] font-semibold text-white">{photo.groupName}</span>
              </div>
              {photo.challengeTitle ? (
                <p className="truncate text-[11px] text-white/60">{photo.challengeTitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {photos.length > 1 && (
                <span className="text-[12px] font-semibold tabular-nums text-white/60">
                  {i + 1} / {photos.length}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/[.085] bg-white/[.05] p-1.5 text-white transition hover:bg-white/[.12]"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          <motion.img
            key={photo.id}
            src={photo.photoUrl}
            alt=""
            className="mx-auto my-3 max-h-[70vh] w-full max-w-lg flex-1 touch-pan-y object-contain"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onClick={(e) => e.stopPropagation()}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />

          {photos.length > 1 && (
            <>
              {i > 0 && (
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
              )}
              {i < photos.length - 1 && (
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              )}
            </>
          )}

          <div
            className="flex items-center justify-center gap-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onToggleLike(photo.id)}
              className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition active:scale-[.98] ${
                likedByMe[photo.id]
                  ? 'border-[rgba(255,90,168,.3)] bg-[rgba(255,90,168,.14)] text-[#ff5aa8]'
                  : 'border-white/[.085] bg-white/[.05] text-white'
              }`}
            >
              <Heart className="h-4 w-4" fill={likedByMe[photo.id] ? '#ff5aa8' : 'none'} aria-hidden />
              {likeCounts[photo.id] ?? 0}
            </button>
            <button
              type="button"
              onClick={() => downloadImage(photo.photoUrl, `bar-til-bar-${photo.id}.jpg`)}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98]"
              style={{ background: 'linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%)' }}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
