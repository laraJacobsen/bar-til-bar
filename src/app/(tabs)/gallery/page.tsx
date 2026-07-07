'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, getAllSubmissions, getChallenges } from '@/lib/firestore';
import { getGroups } from '@/lib/group';
import { PageSkeleton } from '@/components/PageSkeleton';

type GalleryPhoto = {
  id: string;
  photoUrl: string;
  groupName: string;
  groupColor: string;
  challengeTitle: string;
};

export default function GalleryPage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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
            (!s.eventId || s.eventId === eventId), // lenient event scope (matches summary page)
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // newest first (ISO string)
        .map((s) => {
          const group = groupById.get(s.groupId);
          return {
            id: s.id,
            photoUrl: s.photoUrl!,
            groupName: group?.name || s.groupName || 'A crew',
            groupColor: group?.color || '#ff5aa8',
            challengeTitle: challengeTitleById.get(s.challengeId) || '',
          };
        });

      setPhotos(list);
      setLoading(false);
    };
    load();
  }, [user]);

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
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-[24px] border border-white/[.055]"
            >
              <img
                src={photo.photoUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
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
          ))}
        </section>
      )}
    </main>
  );
}
