'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Heart, Trophy } from 'lucide-react';
import { db } from '@/lib/firebase';
import { getActiveEvent, getBars, getCrawlArchive } from '@/lib/firestore';
import { getGroups } from '@/lib/group';
import { useAuth } from '@/components/AuthProvider';
import { useReactions } from '@/lib/useReactions';
import { PhotoLightbox, type LightboxPhoto } from '@/components/PhotoLightbox';
import { CrawlHighlights, type HighlightPhoto } from '@/components/CrawlHighlights';
import type { CrawlArchive, CrawlArchiveGroup, CrawlArchiveSubmission } from '@/lib/types';

const MEDAL = ['🥇', '🥈', '🥉'];
const HIGHLIGHTS_SEEN_KEY = (eventId: string) => `crawl-highlights-seen:${eventId}`;

interface SummaryData {
  eventId: string;
  eventName: string;
  groups: CrawlArchiveGroup[];
  submissions: CrawlArchiveSubmission[];
  bars: { id: string; name: string; order: number }[];
}

function SummaryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const archiveId = searchParams?.get('id') ?? null;

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<LightboxPhoto | null>(null);
  const [showHighlights, setShowHighlights] = useState(false);
  const { likeCounts, likedByMe, loadReactions, toggleLike } = useReactions(user?.uid);

  useEffect(() => {
    const load = async () => {
      try {
        if (archiveId) {
          const archive: CrawlArchive | null = await getCrawlArchive(archiveId);
          if (archive) {
            setData({
              eventId: archive.eventId,
              eventName: archive.eventName,
              groups: [...archive.groups].sort((a, b) => b.score - a.score),
              submissions: archive.submissions,
              bars: [...archive.bars].sort((a, b) => a.order - b.order),
            });
          }
        } else {
          const [event, groups, bars] = await Promise.all([getActiveEvent(), getGroups(), getBars()]);
          if (!event) return;

          const eventGroups = groups
            .filter((g) => g.eventId === event.id)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const eventBars = bars
            .filter((b) => (b as any).eventId === event.id)
            .sort((a, b) => a.order - b.order);

          const subsSnap = await getDocs(
            query(collection(db, 'submissions'), where('status', 'in', ['pending', 'approved', 'rejected'])),
          );
          const allSubs = subsSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((s: any) => !s.eventId || s.eventId === event.id);

          setData({
            eventId: event.id,
            eventName: event.name,
            groups: eventGroups.map((g) => ({ id: g.id, name: g.name, color: g.color, score: g.score ?? 0, members: g.members })),
            submissions: allSubs,
            bars: eventBars.map((b) => ({ id: b.id, name: b.name, order: b.order })),
          });
        }
      } catch (err) {
        // On any failure (e.g. a denied read) fall through to the "No crawl data
        // found" state instead of spinning forever.
        console.error('Failed to load summary', err);
      } finally {
        setLoading(false);
      }

      // Reactions are fetched separately so a permissions/network hiccup on likes
      // never blocks the actual crawl summary from loading.
      try {
        await loadReactions();
      } catch (err) {
        console.error('Failed to load reactions', err);
      }
    };
    load();
  }, [archiveId, loadReactions]);

  const groupPhotoCount = data
    ? Object.fromEntries(data.groups.map((g) => [g.id, data.submissions.filter((s) => s.groupId === g.id).length]))
    : {};
  const groupApprovedCount = data
    ? Object.fromEntries(data.groups.map((g) => [g.id, data.submissions.filter((s) => s.groupId === g.id && s.status === 'approved').length]))
    : {};
  const barSubCount = data
    ? Object.fromEntries(data.bars.map((b) => [b.id, data.submissions.filter((s) => s.barId === b.id).length]))
    : {};

  const mostPhotosGroup = data ? [...data.groups].sort((a, b) => (groupPhotoCount[b.id] ?? 0) - (groupPhotoCount[a.id] ?? 0))[0] : null;
  const mostChallengesGroup = data ? [...data.groups].sort((a, b) => (groupApprovedCount[b.id] ?? 0) - (groupApprovedCount[a.id] ?? 0))[0] : null;
  const hottestBar = data ? [...data.bars].sort((a, b) => (barSubCount[b.id] ?? 0) - (barSubCount[a.id] ?? 0))[0] : null;
  const totalPoints = data ? data.groups.reduce((sum, g) => sum + g.score, 0) : 0;
  const allPhotos = data ? data.submissions.filter((s) => s.photoUrl) : [];

  const groupById = useMemo(() => new Map((data?.groups ?? []).map((g) => [g.id, g])), [data]);

  const toLightboxPhoto = (s: CrawlArchiveSubmission): LightboxPhoto => {
    const group = groupById.get(s.groupId);
    return {
      id: s.id,
      photoUrl: s.photoUrl!,
      groupName: group?.name || s.groupName || 'A crew',
      groupColor: group?.color || '#ff5aa8',
    };
  };

  const topReacted: HighlightPhoto[] = useMemo(() => {
    return allPhotos
      .filter((s) => s.status === 'approved' && (likeCounts[s.id] ?? 0) > 0)
      .map((s) => ({ ...toLightboxPhoto(s), likeCount: likeCounts[s.id] ?? 0 }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 6);
  }, [allPhotos, likeCounts, groupById]);

  // Auto-surface the highlights once per crawl (per browser) — dismissing it is
  // remembered so revisiting an old crawl's summary doesn't nag every time, but the
  // "Highlights" button below always lets a player reopen it on demand.
  useEffect(() => {
    if (!data || topReacted.length === 0) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(HIGHLIGHTS_SEEN_KEY(data.eventId))) return;
    setShowHighlights(true);
  }, [data, topReacted.length]);

  const dismissHighlights = () => {
    setShowHighlights(false);
    if (data) localStorage.setItem(HIGHLIGHTS_SEEN_KEY(data.eventId), '1');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6 pb-24">
      <div className="text-center py-4">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-xs uppercase tracking-[0.35em] text-pink-200">That&apos;s a wrap</p>
        <h1 className="mt-1 text-3xl font-bold">{data?.eventName ?? 'Night Summary'}</h1>
        <p className="mt-1 text-sm text-slate-400">Here&apos;s how the crawl went down</p>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-sm text-slate-400">Loading results…</p>
        </div>
      ) : !data ? (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">No crawl data found.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-pink-400 underline">Back to home</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {mostPhotosGroup && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
                <p className="text-xl mb-1">📸</p>
                <p className="text-xs uppercase tracking-wider text-slate-500">Most pictures</p>
                <p className="mt-1 font-bold text-white truncate">{mostPhotosGroup.name}</p>
                <p className="text-xs text-slate-400">{groupPhotoCount[mostPhotosGroup.id] ?? 0} photos</p>
              </div>
            )}
            {mostChallengesGroup && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
                <p className="text-xl mb-1">🏆</p>
                <p className="text-xs uppercase tracking-wider text-slate-500">Most challenges</p>
                <p className="mt-1 font-bold text-white truncate">{mostChallengesGroup.name}</p>
                <p className="text-xs text-slate-400">{groupApprovedCount[mostChallengesGroup.id] ?? 0} approved</p>
              </div>
            )}
            {hottestBar && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
                <p className="text-xl mb-1">🍺</p>
                <p className="text-xs uppercase tracking-wider text-slate-500">Hottest bar</p>
                <p className="mt-1 font-bold text-white truncate">{hottestBar.name}</p>
                <p className="text-xs text-slate-400">{barSubCount[hottestBar.id] ?? 0} submissions</p>
              </div>
            )}
            <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
              <p className="text-xl mb-1">⚡</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">Total points</p>
              <p className="mt-1 font-bold text-white">{totalPoints}</p>
              <p className="text-xs text-slate-400">across all groups</p>
            </div>
          </div>

          {data.groups.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
              <h2 className="text-lg font-semibold mb-4">Final leaderboard</h2>
              <div className="flex flex-col gap-2">
                {data.groups.map((g, idx) => (
                  <div
                    key={g.id}
                    className={`flex items-center gap-4 rounded-[1.5rem] border px-4 py-3 ${
                      idx === 0
                        ? 'border-pink-500/30 bg-gradient-to-r from-pink-500/15 via-violet-500/10 to-transparent'
                        : 'border-white/8 bg-white/5'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                      {idx < 3 ? <span className="text-xl">{MEDAL[idx]}</span> : <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>}
                    </div>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color ?? '#f43f5e' }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{g.name}</p>
                      <p className="text-xs text-slate-500">{groupPhotoCount[g.id] ?? 0} photos · {groupApprovedCount[g.id] ?? 0} approved</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xl font-bold tabular-nums ${idx === 0 ? 'text-pink-300' : 'text-slate-100'}`}>{g.score}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {allPhotos.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">All photos</h2>
                {topReacted.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHighlights(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(255,90,168,.25)] bg-[rgba(255,90,168,.14)] px-3 py-1.5 text-xs font-bold text-[#ff5aa8]"
                  >
                    <Trophy className="h-3.5 w-3.5" aria-hidden />
                    Highlights
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.map((s) => {
                  const group = groupById.get(s.groupId);
                  const liked = !!likedByMe[s.id];
                  const count = likeCounts[s.id] ?? 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => s.photoUrl && setActivePhoto(toLightboxPhoto(s))}
                      className="relative overflow-hidden rounded-xl"
                    >
                      <img src={s.photoUrl!} alt="" className="h-28 w-full object-cover" />
                      {s.status === 'approved' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(s.id);
                          }}
                          className={`absolute right-1 top-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
                            liked ? 'bg-[rgba(255,90,168,.3)] text-[#ff5aa8]' : 'bg-black/40 text-white'
                          }`}
                        >
                          <Heart className="h-2.5 w-2.5" fill={liked ? '#ff5aa8' : 'none'} aria-hidden />
                          {count > 0 && count}
                        </button>
                      )}
                      {group && (
                        <div className="absolute bottom-0 inset-x-0 flex items-center gap-1 bg-black/60 px-2 py-1">
                          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: group.color ?? '#f43f5e' }} />
                          <p className="truncate text-[10px] text-white">{group.name}</p>
                        </div>
                      )}
                      <span className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${s.status === 'approved' ? 'bg-[rgba(45,212,191,.9)]' : s.status === 'rejected' ? 'bg-rose-500/90' : 'bg-yellow-500/90'}`}>
                        {s.status === 'approved' ? '✓' : s.status === 'rejected' ? '✗' : '…'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <Link href="/" className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/20">
            Back to home
          </Link>
        </>
      )}

      <CrawlHighlights
        eventName={data?.eventName ?? ''}
        photos={topReacted}
        open={showHighlights}
        onClose={dismissHighlights}
        onSelectPhoto={(photo) => {
          setShowHighlights(false);
          setActivePhoto(photo);
        }}
      />

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

export default function SummaryPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-sm text-slate-400">Loading…</p></main>}>
      <SummaryContent />
    </Suspense>
  );
}
