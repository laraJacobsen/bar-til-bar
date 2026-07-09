'use client';

import { useCallback, useRef, useState } from 'react';
import { getAllReactions, summarizeReactions, toggleReaction } from '@/lib/reactions';

// Shared by the gallery and summary pages so the like-toggle logic (and its
// fixes) only need to live in one place.
export function useReactions(userId: string | undefined) {
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  // Tracks photos with a toggle in flight. Guards against a rapid double-tap
  // firing a second toggle before the first's optimistic state and Firestore
  // write have settled — without it, both calls read the same stale "not
  // liked yet" state and the like count drifts (e.g. +2 instead of net 0).
  const pending = useRef<Set<string>>(new Set());

  const loadReactions = useCallback(async () => {
    const reactions = await getAllReactions();
    const { counts, likedByMe: mine } = summarizeReactions(reactions, userId);
    setLikeCounts(counts);
    setLikedByMe(mine);
  }, [userId]);

  const toggleLike = useCallback(
    async (photoId: string) => {
      if (!userId || pending.current.has(photoId)) return;
      pending.current.add(photoId);

      const wasLiked = !!likedByMe[photoId];
      setLikedByMe((prev) => ({ ...prev, [photoId]: !wasLiked }));
      setLikeCounts((prev) => ({ ...prev, [photoId]: (prev[photoId] ?? 0) + (wasLiked ? -1 : 1) }));

      try {
        await toggleReaction(photoId, userId);
      } catch {
        setLikedByMe((prev) => ({ ...prev, [photoId]: wasLiked }));
        setLikeCounts((prev) => ({ ...prev, [photoId]: (prev[photoId] ?? 0) + (wasLiked ? 1 : -1) }));
      } finally {
        pending.current.delete(photoId);
      }
    },
    [likedByMe, userId],
  );

  return { likeCounts, likedByMe, loadReactions, toggleLike };
}
