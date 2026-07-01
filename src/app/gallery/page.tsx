'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, getDocs, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowLeft, Download, Heart, Home, Images, Target, Trophy, User, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, toggleSubmissionReaction } from '@/lib/firestore';
import type { SubmissionDoc } from '@/lib/types';
import type { GroupDoc } from '@/lib/group';
import { getGroups } from '@/lib/group';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Challenges', href: '/challenges', icon: Target },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function GalleryContent() {
  const searchParams = useSearchParams();
  const paramId = searchParams?.get('id') ?? null;
  const { user } = useAuth();

  const [photos, setPhotos] = useState<SubmissionDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<SubmissionDoc | null>(null);
  const [reacting, setReacting] = useState<Set<string>>(new Set());
  const isHistorical = !!paramId;

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    const fetchUserNames = async (subs: SubmissionDoc[]) => {
      const ids = Array.from(new Set(subs.map((s) => s.userId).filter(Boolean) as string[]));
      if (!ids.length) return;
      const results = await Promise.all(ids.map((id) => getDoc(doc(db, 'users', id))));
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach((snap) => {
        if (snap.exists()) map[snap.id] = (snap.data() as { displayName?: string }).displayName ?? 'Player';
      });
      setUserNames((prev) => ({ ...prev, ...map }));
    };

    const load = async () => {
      let eventId = paramId;

      if (!eventId) {
        const active = await getActiveEvent();
        if (cancelled) return;
        if (!active) { setLoading(false); return; }
        eventId = active.id;
        setEventName(active.name);
      } else {
        setEventName('Past Crawl');
      }

      // Load groups scoped to this event only
      const allGroups = await getGroups();
      if (cancelled) return;
      setGroups(allGroups.filter((g) => g.eventId === eventId || !g.eventId));

      const q = query(collection(db, 'submissions'), where('eventId', '==', eventId));

      // Belt-and-suspenders: also filter client-side so stale Firestore cache
      // entries from other events can never leak into this gallery.
      const apply = (subs: SubmissionDoc[]) => {
        if (cancelled) return;
        const withPhotos = subs
          .filter((s) => !!s.photoUrl && s.eventId === eventId)
          .sort((a, b) => (b.likedBy?.length ?? 0) - (a.likedBy?.length ?? 0));
        setPhotos(withPhotos);
        fetchUserNames(withPhotos);
        setLoading(false);
      };

      if (!isHistorical) {
        unsub = onSnapshot(q, (snap) => {
          apply(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubmissionDoc, 'id'>) })));
        });
      } else {
        const snap = await getDocs(q);
        apply(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubmissionDoc, 'id'>) })));
      }
    };

    load();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [paramId, isHistorical]);

  const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));

  const handleReaction = async (sub: SubmissionDoc) => {
    if (!user || reacting.has(sub.id)) return;
    const liked = sub.likedBy?.includes(user.uid) ?? false;
    setReacting((prev) => new Set(prev).add(sub.id));
    setPhotos((prev) =>
      prev
        .map((s) => {
          if (s.id !== sub.id) return s;
          const current = s.likedBy ?? [];
          const next = liked ? current.filter((id) => id !== user.uid) : [...current, user.uid];
          return { ...s, likedBy: next };
        })
        .sort((a, b) => (b.likedBy?.length ?? 0) - (a.likedBy?.length ?? 0)),
    );
    try {
      await toggleSubmissionReaction(sub.id, user.uid, liked);
    } catch {
      setPhotos((prev) =>
        prev
          .map((s) => (s.id === sub.id ? sub : s))
          .sort((a, b) => (b.likedBy?.length ?? 0) - (a.likedBy?.length ?? 0)),
      );
    } finally {
      setReacting((prev) => { const n = new Set(prev); n.delete(sub.id); return n; });
    }
  };

  const handleDownload = (photoUrl: string, id: string) => {
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `photo-${id}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const backHref = paramId ? (`/summary?id=${paramId}` as any) : '/';

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-0 pb-24">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <Link
          href={backHref}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-300 hover:bg-white/20 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{eventName || 'Gallery'}</h1>
        </div>
        {photos.length > 0 && (
          <span className="shrink-0 text-xs text-slate-500">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-sm text-slate-400">Loading photos…</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="mx-4 mt-8 flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-white/10 bg-white/5 py-20 text-center">
          <p className="text-3xl">📷</p>
          <p className="text-sm text-slate-400">No photos yet — complete challenges to add some!</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/8">
          {photos.map((sub) => {
            const g = groupById[sub.groupId];
            const liked = user ? (sub.likedBy?.includes(user.uid) ?? false) : false;
            const likeCount = sub.likedBy?.length ?? 0;
            const displayName = (sub.userId && userNames[sub.userId]) || sub.groupName || 'Player';
            const initial = displayName.charAt(0).toUpperCase();
            const groupColor = g?.color ?? '#f43f5e';

            return (
              <article key={sub.id} className="flex flex-col bg-slate-950">

                {/* Post header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${groupColor}cc, ${groupColor}66)`, border: `2px solid ${groupColor}55` }}
                  >
                    {initial}
                  </div>

                  {/* Name + group + time */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white leading-tight">{displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: groupColor }} />
                      <span className="text-xs text-slate-400 truncate">{g?.name ?? sub.groupName ?? 'Unknown group'}</span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-xs text-slate-500 shrink-0">{sub.createdAt ? timeAgo(sub.createdAt) : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Photo — tap to open lightbox */}
                <button
                  type="button"
                  onClick={() => setLightbox(sub)}
                  onDoubleClick={() => !liked && handleReaction(sub)}
                  className="relative block w-full overflow-hidden bg-slate-900"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <img
                    src={sub.photoUrl!}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>

                {/* Action bar */}
                <div className="flex items-center justify-between px-4 py-3">
                  {/* Heart + count */}
                  <button
                    type="button"
                    onClick={() => handleReaction(sub)}
                    disabled={!user || reacting.has(sub.id)}
                    className="flex items-center gap-2 transition active:scale-90"
                  >
                    <Heart
                      className={`h-6 w-6 transition-all duration-150 ${liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-300'}`}
                    />
                    <span className={`text-sm font-semibold tabular-nums ${liked ? 'text-rose-400' : 'text-slate-300'}`}>
                      {likeCount > 0 ? likeCount : ''}
                    </span>
                  </button>

                  {/* Download */}
                  <button
                    type="button"
                    onClick={() => handleDownload(sub.photoUrl!, sub.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-200 active:scale-90"
                    title="Save photo"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>

                {/* Like label */}
                {likeCount > 0 && (
                  <p className="px-4 pb-3 -mt-1 text-xs text-slate-500">
                    {likeCount === 1 ? '1 like' : `${likeCount} likes`}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (() => {
        const g = groupById[lightbox.groupId];
        const liked = user ? (lightbox.likedBy?.includes(user.uid) ?? false) : false;
        const displayName = (lightbox.userId && userNames[lightbox.userId]) || lightbox.groupName || 'Player';
        const groupColor = g?.color ?? '#f43f5e';
        return (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black"
            onClick={() => setLightbox(null)}
          >
            {/* Lightbox header */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-black/80"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${groupColor}cc, ${groupColor}66)` }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white leading-tight">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: groupColor }} />
                  <span className="text-xs text-slate-400 truncate">{g?.name ?? lightbox.groupName ?? 'Unknown group'}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-xs text-slate-500">{lightbox.createdAt ? timeAgo(lightbox.createdAt) : ''}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lightbox photo */}
            <div className="flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightbox.photoUrl!}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Lightbox actions */}
            <div
              className="flex items-center justify-between bg-black/80 px-4 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => handleReaction(lightbox)}
                disabled={!user || reacting.has(lightbox.id)}
                className="flex items-center gap-2 transition active:scale-90"
              >
                <Heart
                  className={`h-7 w-7 transition-all duration-150 ${liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                />
                <span className={`text-base font-semibold tabular-nums ${liked ? 'text-rose-400' : 'text-slate-200'}`}>
                  {(lightbox.likedBy?.length ?? 0) > 0 ? `${lightbox.likedBy!.length} ${lightbox.likedBy!.length === 1 ? 'like' : 'likes'}` : 'Like'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(lightbox.photoUrl!, lightbox.id)}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition active:scale-90"
              >
                <Download className="h-5 w-5" />
                <span className="text-sm">Save</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/gallery';
            return (
              <Link
                key={item.label}
                href={item.href as any}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition hover:bg-white/10 ${isActive ? 'text-pink-400' : 'text-slate-300'}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-sm text-slate-400">Loading…</p></main>}>
      <GalleryContent />
    </Suspense>
  );
}
