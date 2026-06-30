'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Home, Target, Images, Trophy, User } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, getBars, seedDemoData } from '@/lib/firestore';
import { getUserGroup, type GroupDoc } from '@/lib/group';
import type { BarDoc, EventDoc } from '@/lib/types';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Challenges', href: '/challenges', icon: Target },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
] as const;

const homeCache: { event: EventDoc | null; currentGroup: GroupDoc | null; bars: BarDoc[] } = {
  event: null,
  currentGroup: null,
  bars: [],
};

export default function HomePage() {
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(homeCache.event);
  const [currentGroup, setCurrentGroup] = useState<GroupDoc | null>(homeCache.currentGroup);
  const [bars, setBars] = useState<BarDoc[]>(homeCache.bars);

  // Initial data load
  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return; }
    if (loading || !user) return;

    const load = async () => {
      if (!localStorage.getItem('bartilbar:seeded')) {
        await seedDemoData();
        localStorage.setItem('bartilbar:seeded', 'true');
      }
      const [activeEvent, group, allBars] = await Promise.all([
        getActiveEvent(),
        getUserGroup(user.uid),
        getBars(),
      ]);
      const eventBars = activeEvent
        ? allBars.filter((b) => (b as any).eventId === activeEvent.id).sort((a, b) => a.order - b.order)
        : [];
      homeCache.event = activeEvent;
      homeCache.currentGroup = group || null;
      homeCache.bars = eventBars;
      setEvent(activeEvent);
      setCurrentGroup(group || null);
      setBars(eventBars);
    };

    load();
  }, [loading, router, user]);

  // Real-time listener: pushes event.started change to all clients instantly
  const wasStartedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'events'), where('status', '==', 'active')),
      async (snapshot) => {
        const activeEvent =
          snapshot.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, 'id'>) }))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

        const justStarted = !wasStartedRef.current && !!activeEvent?.started;
        wasStartedRef.current = !!activeEvent?.started;
        homeCache.event = activeEvent;
        setEvent(activeEvent);

        if (justStarted) {
          const group = await getUserGroup(user.uid);
          setCurrentGroup(group || null);
          homeCache.currentGroup = group || null;
        }
      },
    );
    return () => unsub();
  }, [user]);

  // Derived values for Tonight's flow — computed before JSX so the section is readable
  const startMs = event?.startsAt ? new Date(event.startsAt).getTime() : null;
  const endMs = event?.endsAt ? new Date(event.endsAt).getTime() : null;
  const msPerStop = startMs && endMs && bars.length ? (endMs - startMs) / bars.length : null;
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const orderedBars = currentGroup?.barSequence
    ? currentGroup.barSequence.map((i) => bars[i]).filter(Boolean)
    : bars;
  const currentSlot = currentGroup?.currentBarIndex ?? 0;

  if (loading || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 px-6 py-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Bar Til Bar</p>
          <h1 className="mt-2 text-2xl font-semibold">Redirecting to login…</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6 pb-24">

      {/* Admin shortcut — only visible to admins */}
      {dbUser?.role === 'admin' && (
        <section className="flex items-center justify-between gap-4 rounded-3xl border border-pink-500/30 bg-pink-500/10 p-4 shadow-glow-sm animate-fade-in">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-pink-300 font-bold">Admin Privileges Active</p>
            <p className="mt-1 text-sm text-pink-100">You are logged in as administrator.</p>
          </div>
          <Link href="/admin" className="rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-pink-600 transition shrink-0">
            Control Center
          </Link>
        </section>
      )}

      {/* Live event + your group */}
      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Live event</p>
            <h1 className="text-2xl font-semibold leading-tight">{event?.name || 'Bar Til Bar'}</h1>
          </div>
          <div className="rounded-full bg-brand-500/20 px-3 py-1 text-sm text-pink-100 shrink-0">Live</div>
        </div>

        <div className="mt-4">
          {currentGroup ? (
            <Link
              href={`/groups/${currentGroup.id}`}
              className="flex items-center justify-between rounded-2xl border border-pink-400/20 bg-slate-900/70 px-4 py-3 transition hover:border-pink-400/40 hover:bg-slate-900"
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-pink-300 font-semibold">Your group</p>
                <p className="mt-0.5 font-semibold text-white">{currentGroup.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentGroup.members.length} {currentGroup.members.length === 1 ? 'member' : 'members'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Score</p>
                <p className="text-2xl font-bold text-white">{currentGroup.score ?? 0}</p>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-500">
              No group yet — join via the crawl code from your organiser.
            </div>
          )}
        </div>
      </section>

      {/* Route progress + challenge entry point */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/30 to-accent/30 p-5">
        <p className="text-sm text-pink-100">Route progress</p>
        <div className="mt-3 h-3 rounded-full bg-slate-900/70">
          {event?.started && <div className="h-3 w-1/3 rounded-full bg-gradient-to-r from-pink-500 to-violet-500" />}
        </div>
        {event?.started ? (
          <Link href="/challenges" className="mt-4 flex w-full items-center justify-center rounded-full bg-white px-4 py-3 font-semibold text-slate-900">
            Go to Current Challenge
          </Link>
        ) : (
          <div className="mt-4 flex w-full items-center justify-center rounded-full bg-white/10 px-4 py-3 font-semibold text-slate-500 cursor-not-allowed select-none">
            Waiting for leader to start
          </div>
        )}
      </section>

      {/* Tonight's flow — personal bar route with time slots */}
      {bars.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tonight&apos;s flow</h3>
            <span className="text-sm text-slate-400">
              Stop {Math.min(currentSlot + 1, orderedBars.length)}/{orderedBars.length}
            </span>
          </div>

          {!event?.started ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center">
              <p className="text-sm text-slate-400">Waiting for the organiser to start the crawl…</p>
              <p className="mt-1 text-xs text-slate-600">Your route will appear here once it begins.</p>
            </div>
          ) : (
            <div className="mt-5 relative">
              {/* Vertical track */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10" />
              <div
                className="absolute left-[15px] top-2 w-px bg-gradient-to-b from-pink-500 to-violet-500 transition-all duration-700"
                style={{ height: `${(currentSlot / Math.max(orderedBars.length - 1, 1)) * 90}%` }}
              />

              <ol className="space-y-0">
                {orderedBars.map((bar, idx) => {
                  const isDone = idx < currentSlot;
                  const isCurrent = idx === currentSlot;
                  const arrivalMs = startMs && msPerStop != null ? startMs + idx * msPerStop : null;

                  return (
                    <li key={`${bar.id}-${idx}`} className="relative flex items-center gap-4 pb-5 last:pb-0">
                      {/* Stop indicator dot */}
                      <div className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full transition-all ${
                        isDone    ? 'bg-violet-500/20 border border-violet-500/30'
                        : isCurrent ? 'bg-gradient-to-br from-pink-500 to-violet-600 shadow-[0_0_12px_2px_rgba(236,72,153,0.45)]'
                        : 'border border-white/10 bg-slate-900/50'
                      }`}>
                        {isDone ? (
                          <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isCurrent ? (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-600">{idx + 1}</span>
                        )}
                      </div>

                      {/* Bar name + time slot */}
                      <div className={`flex flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
                        isCurrent ? 'border-pink-500/25 bg-pink-500/10'
                        : isDone  ? 'border-white/5 bg-white/[0.02]'
                        : 'border-white/5 bg-slate-900/30'
                      }`}>
                        <div>
                          <p className={`font-semibold leading-snug ${isDone ? 'text-slate-500' : isCurrent ? 'text-white' : 'text-slate-400'}`}>
                            {bar.name}
                          </p>
                          {arrivalMs && (
                            <p className={`text-xs mt-0.5 ${isDone ? 'text-slate-600' : isCurrent ? 'text-pink-300' : 'text-slate-600'}`}>
                              {fmt(arrivalMs)} – {fmt(arrivalMs + (msPerStop ?? 0))}
                            </p>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="shrink-0 rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-pink-300 animate-pulse">
                            Now
                          </span>
                        )}
                        {isDone && (
                          <svg className="h-4 w-4 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href as any}
                className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-slate-300 transition hover:bg-white/10"
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
