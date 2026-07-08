'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import type { LightboxPhoto } from '@/components/PhotoLightbox';

export interface HighlightPhoto extends LightboxPhoto {
  likeCount: number;
}

interface CrawlHighlightsProps {
  eventName: string;
  photos: HighlightPhoto[];
  open: boolean;
  onClose: () => void;
  onSelectPhoto: (photo: HighlightPhoto) => void;
}

export function CrawlHighlights({ eventName, photos, open, onClose, onSelectPhoto }: CrawlHighlightsProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-6 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="relative w-full max-w-sm rounded-[26px] border border-white/[.085] bg-[#14101c] p-5 shadow-[0_20px_50px_rgba(0,0,0,.5)]"
            initial={{ y: '30px', opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '20px', opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">🏆 Crawl highlights</p>
                <h3 className="mt-0.5 truncate text-lg font-semibold">{eventName}</h3>
                <p className="mt-0.5 text-xs text-slate-400">The most-loved photos of the night</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/10 bg-white/[.05] p-1.5 text-slate-300 transition hover:bg-white/[.12]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onSelectPhoto(photo)}
                  className="relative aspect-square overflow-hidden rounded-[18px] border border-white/[.055] text-left"
                >
                  <img src={photo.photoUrl} alt="" className="h-full w-full object-cover" />
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 px-2 py-1.5"
                    style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(10,7,17,.65))' }}
                  >
                    <span className="truncate text-[11px] font-semibold text-white">{photo.groupName}</span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[#ff5aa8]">
                      <Heart className="h-3 w-3" fill="#ff5aa8" aria-hidden />
                      {photo.likeCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-full px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
