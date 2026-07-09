'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, getAllSubmissions, getChallenges } from '@/lib/firestore';
import { getGroups } from '@/lib/group';
import { useReactions } from '@/lib/useReactions';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PhotoLightbox, type LightboxPhoto } from '@/components/PhotoLightbox';

type GalleryPhoto = LightboxPhoto;

export default function GalleryPage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const { likeCounts, likedByMe, loadReactions, toggleLike } = useReactions(user?.uid);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [event, submissions, groups, challenges] = await Promise.all([
          getActiveEvent(),
          getAllSubmissions(),
          getGroups(),
          getChallenges(),
        ]);

        const groupById = new Map(groups.map((g) => [g.id, g]));
        const challengeTitleById = new Map(challenges.map((c) => [c.id, c.title]));
        const eventId = event?.id;

        // ponytail: reads the whole submissions collection and filters client-side —
        // fine at bar-crawl scale. If volume grows, swap for a scoped query
        // where('eventId','==',event.id).where('status','==','approved') (needs a composite index).
        const list: GalleryPhoto[] = submissions
          .filter(
            (s) =>
              !!s.photoUrl &&
              s.status === 'approved' &&
              !!eventId && s.eventId === eventId, // strict: only the active crawl's photos, never prior/unscoped
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // newest first (ISO string)
          .map((s) => {
            const group = groupById.get(s.groupId);
            return {
              id: s.id,
              photoUrl: s.photoUrl!,
              groupName: group?.name || s.groupName || 'A crew',
              groupColor: group?.color || '#ff5aa8',
              challengeTitle:
                s.type === 'fun'
                  ? 'Just for fun'
                  : (s.challengeId ? challengeTitleById.get(s.challengeId) || '' : ''),
            };
          });

        setPhotos(list);
      } catch (err) {
        console.error('Failed to load gallery', err);
      } finally {
        setLoading(false);
      }

      // Reactions are fetched separately so a permissions/network hiccup on likes
      // never blocks the photos themselves from showing — hearts just default to 0.
      try {
        await loadReactions();
      } catch (err) {
        console.error('Failed to load reactions', err);
      }
    };
    load();
  }, [user, loadReactions]);

  if (loading) return <PageSkeleton />;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">
          Event gallery
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold">Moments from the crawl</h1>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/[.055] p-6 text-center text-[13px] text-[#6a637f]">
          No photos yet — approved moments from the crawl will show up here.
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => {
            const liked = !!likedByMe[photo.id];
            const count = likeCounts[photo.id] ?? 0;
            return (
              <div
                key={photo.id}
                onClick={() => setActivePhoto(photo)}
                className="relative aspect-square overflow-hidden rounded-[24px] border border-white/[.055]"
              >
                <img
                  src={photo.photoUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(photo.id);
                  }}
                  className={`absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold backdrop-blur-sm transition ${
                    liked ? 'bg-[rgba(255,90,168,.25)] text-[#ff5aa8]' : 'bg-black/40 text-white'
                  }`}
                >
                  <Heart className="h-3 w-3" fill={liked ? '#ff5aa8' : 'none'} aria-hidden />
                  {count > 0 && count}
                </button>
                <div
                  className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-2.5"
                  style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(10,7,17,.5))' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: photo.groupColor }}
                    />
                    <span className="truncate text-[12px] font-semibold text-white">
                      {photo.groupName}
                    </span>
                  </div>
                  {photo.challengeTitle ? (
                    <span className="truncate text-[11px] text-white/70">{photo.challengeTitle}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <PhotoLightbox
        photo={activePhoto}
        likeCount={activePhoto ? likeCounts[activePhoto.id] ?? 0 : 0}
        liked={activePhoto ? !!likedByMe[activePhoto.id] : false}
        onToggleLike={toggleLike}
        onClose={() => setActivePhoto(null)}
      />
    </main>
  );
}
