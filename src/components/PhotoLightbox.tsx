'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Heart, X } from 'lucide-react';
import { downloadImage } from '@/lib/download';

export interface LightboxPhoto {
  id: string;
  photoUrl: string;
  groupName: string;
  groupColor: string;
  challengeTitle?: string;
}

interface PhotoLightboxProps {
  photo: LightboxPhoto | null;
  likeCount: number;
  liked: boolean;
  onToggleLike: (photoId: string) => void;
  onClose: () => void;
}

export function PhotoLightbox({ photo, likeCount, liked, onToggleLike, onClose }: PhotoLightboxProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!photo || downloading) return;
    setDownloading(true);
    try {
      await downloadImage(photo.photoUrl, `bar-til-bar-${photo.id}.jpg`);
    } catch {
      // Best-effort — the image still opens in the lightbox for a manual long-press save.
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {photo && (
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
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/[.085] bg-white/[.05] p-1.5 text-white transition hover:bg-white/[.12]"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <img
            src={photo.photoUrl}
            alt=""
            className="mx-auto my-3 max-h-[70vh] w-full max-w-lg flex-1 object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div
            className="flex items-center justify-center gap-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onToggleLike(photo.id)}
              className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition active:scale-[.98] ${
                liked
                  ? 'border-[rgba(255,90,168,.3)] bg-[rgba(255,90,168,.14)] text-[#ff5aa8]'
                  : 'border-white/[.085] bg-white/[.05] text-white'
              }`}
            >
              <Heart className="h-4 w-4" fill={liked ? '#ff5aa8' : 'none'} aria-hidden />
              {likeCount}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98] disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%)' }}
            >
              <Download className="h-4 w-4" aria-hidden />
              {downloading ? 'Saving…' : 'Download'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
