'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
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

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = searchParams?.get('id') ?? null;
  const { user } = useAuth();

  const [photos, setPhotos] = useState<SubmissionDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<SubmissionDoc | null>(null);
  const [reacting, setReacting] = useState<Set<string>>(new Set());
  const isHistorical = !!paramId;

  // Load groups for color dots
  useEffect(() => {
    getGroups().then(setGroups);
  }, []);

  // Load photos — real-time for active event, one-time for past events
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const load = async () => {
      let eventId = paramId;

      if (!eventId) {
        const active = await getActiveEvent();
        if (!active) { setLoading(false); return; }
        eventId = active.id;
        setEventName(active.name);
      }

      const q = query(
        collection(db, 'submissions'),
        where('eventId', '==', eventId),
      );

      if (!isHistorical) {
        unsub = onSnapshot(q, (snap) => {
          const subs = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<SubmissionDoc, 'id'>) }))
            .filter((s) => !!s.photoUrl)
            .sort((a, b) => (b.likedBy?.length ?? 0) - (a.likedBy?.length ?? 0));
          setPhotos(subs);
          setLoading(false);
        });
      } else {
        const snap = await getDocs(q);
        const subs = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<SubmissionDoc, 'id'>) }))
          .filter((s) => !!s.photoUrl)
          .sort((a, b) => (b.likedBy?.length ?? 0) - (a.likedBy?.length ?? 0));
        setPhotos(subs);
        setLoading(false);
      }
    };

    load();
    return () => unsub?.();
  }, [paramId, isHistorical]);

  // If historical and no eventName, try to derive from URL or leave blank
  useEffect(() => {
    if (paramId && !eventName) setEventName('Past Crawl');
  }, [paramId, eventName]);

  const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));

  const handleReaction = async (sub: SubmissionDoc) => {
    if (!user || reacting.has(sub.id)) return;
    const liked = sub.likedBy?.includes(user.uid) ?? false;
    setReacting((prev) => new Set(prev).add(sub.id));
    // Optimistic update
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
      // Revert on error by re-applying the original state
      setPhotos((prev) =>
        prev
          .map((s) => (s.id === sub.id ? sub : s))
          .sort((a, b) => (b.likedBy?.length ?? 0) - (a.likedBy?.length ?? 0)),
      );
    } finally {
      setReacting((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-300 hover:bg-white/20 transition">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.35em] text-pink-200">Gallery</p>
          <h1 className="truncate text-xl font-semibold leading-tight">{eventName || 'Tonight'}</h1>
        </div>
        {photos.length > 0 && (
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-400">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-sm text-slate-400">Loading photos…</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-white/10 bg-white/5 py-20 text-center">
          <p className="text-3xl">📷</p>
          <p className="text-sm text-slate-400">No photos yet — complete challenges to add some!</p>
        </div>
      ) : (
        <>
          {/* Top 3 most loved */}
          {photos[0]?.likedBy?.length ? (
            <section className="rounded-[2rem] border border-pink-500/20 bg-pink-500/8 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-pink-300">Most loved</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.slice(0, 3).filter((p) => (p.likedBy?.length ?? 0) > 0).map((p) => {
                  const g = groupById[p.groupId];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setLightbox(p)}
                      className="relative shrink-0 overflow-hidden rounded-xl"
                      style={{ width: 100, height: 100 }}
                    >
                      <img src={p.photoUrl!} alt="" className="h-full w-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-xs text-white">
                        <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                        <span>{p.likedBy?.length ?? 0}</span>
                      </div>
                      {g && (
                        <span className="absolute top-1.5 left-1.5 inline-block h-2 w-2 rounded-full border border-white/40" style={{ background: g.color ?? '#f43f5e' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Full grid */}
          <div className="grid grid-cols-2 gap-3">
            {photos.map((sub) => {
              const g = groupById[sub.groupId];
              const liked = user ? (sub.likedBy?.includes(user.uid) ?? false) : false;
              const likeCount = sub.likedBy?.length ?? 0;
              return (
                <div key={sub.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                  {/* Photo */}
                  <button
                    type="button"
                    onClick={() => setLightbox(sub)}
                    className="relative block w-full overflow-hidden"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    <img src={sub.photoUrl!} alt="" className="h-full w-full object-cover transition duration-200 hover:scale-105" />
                    {g && (
                      <div className="absolute bottom-0 inset-x-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: g.color ?? '#f43f5e' }} />
                        <p className="truncate text-[11px] font-medium text-white">{g.name}</p>
                      </div>
                    )}
                  </button>

                  {/* Action bar */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleReaction(sub)}
                      disabled={!user || reacting.has(sub.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        liked
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-white/8 text-slate-400 hover:bg-white/15 hover:text-slate-200'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${liked ? 'fill-rose-400' : ''}`} />
                      <span className="tabular-nums">{likeCount > 0 ? likeCount : ''}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(sub.photoUrl!, sub.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-slate-400 transition hover:bg-white/15 hover:text-slate-200"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="flex w-full max-w-lg flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.photoUrl!}
              alt=""
              className="w-full rounded-2xl object-contain"
              style={{ maxHeight: '70vh' }}
            />

            {/* Lightbox actions */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                {groupById[lightbox.groupId] && (
                  <>
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: groupById[lightbox.groupId].color ?? '#f43f5e' }} />
                    <p className="text-sm font-medium text-slate-200">{groupById[lightbox.groupId].name}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReaction(lightbox)}
                  disabled={!user || reacting.has(lightbox.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    user && (lightbox.likedBy?.includes(user.uid) ?? false)
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${user && (lightbox.likedBy?.includes(user.uid) ?? false) ? 'fill-rose-400' : ''}`} />
                  <span>{lightbox.likedBy?.length ?? 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(lightbox.photoUrl!, lightbox.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
