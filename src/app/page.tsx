'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Target, Images, Trophy, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, getBars, seedDemoData } from '@/lib/firestore';
import { getGroups, getUserGroup, type GroupDoc } from '@/lib/group';
import type { BarDoc, EventDoc } from '@/lib/types';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Challenges', href: '/challenges', icon: Target },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
] as const;

// In-memory cache that survives client-side navigation between tabs. Module state
// persists for the app's lifetime, so returning to Home seeds the initial render
// with the last-known values (no flash) while the data revalidates in the background.
const homeCache: { event: EventDoc | null; currentGroup: GroupDoc | null; groups: GroupDoc[]; bars: BarDoc[] } = {
  event: null,
  currentGroup: null,
  groups: [],
  bars: [],
};

export default function HomePage() {
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(homeCache.event);
  const [currentGroup, setCurrentGroup] = useState<GroupDoc | null>(homeCache.currentGroup);
  const [groups, setGroups] = useState<GroupDoc[]>(homeCache.groups);
  const [bars, setBars] = useState<BarDoc[]>(homeCache.bars);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (loading || !user) {
      return;
    }

    const load = async () => {
      // Seed once per browser instead of reading the whole `events` collection on every load.
      if (!localStorage.getItem('bartilbar:seeded')) {
        await seedDemoData();
        localStorage.setItem('bartilbar:seeded', 'true');
      }

      // These reads are independent — run them in parallel rather than as a waterfall.
      const [activeEvent, group, allGroups, allBars] = await Promise.all([
        getActiveEvent(),
        user?.uid ? getUserGroup(user.uid) : Promise.resolve(null),
        getGroups(),
        getBars(),
      ]);
      const eventBars = activeEvent
        ? allBars.filter((b) => (b as any).eventId === activeEvent.id).sort((a, b) => a.order - b.order)
        : [];
      homeCache.event = activeEvent;
      homeCache.currentGroup = group || null;
      homeCache.groups = allGroups;
      homeCache.bars = eventBars;
      setEvent(activeEvent);
      setCurrentGroup(group || null);
      setGroups(allGroups);
      setBars(eventBars);
    };

    load();
  }, [loading, router, user]);

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

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Live event</p>
            <h1 className="text-3xl font-semibold">{event?.name || 'Bar Til Bar'}</h1>
          </div>
          <div className="rounded-full bg-brand-500/20 px-3 py-1 text-sm text-pink-100">Live</div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Group</p>
            <p className="mt-2 text-lg font-semibold">{currentGroup?.name || 'No group yet'}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Current score</p>
            <p className="mt-2 text-3xl font-semibold">{currentGroup?.score ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Current challenge</p>
            <p className="mt-2 text-lg font-semibold">Group selfie</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Next bar</p>
            <p className="mt-2 text-lg font-semibold">North Star</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/30 to-accent/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-pink-100">Route progress</p>
            <h2 className="text-xl font-semibold">Demo route in motion</h2>
          </div>
          <div className="text-right text-sm text-pink-100">
            <p>Ends in</p>
            <p className="font-semibold">06:00:00</p>
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-900/70">
          <div className="h-3 w-1/3 rounded-full bg-gradient-to-r from-pink-500 to-violet-500" />
        </div>
        <Link href="/challenges" className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-4 py-3 font-semibold text-slate-900">
          Go to Current Challenge
        </Link>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your crew</h3>
          <span className="text-sm text-slate-400">{groups.length} groups</span>
        </div>

        {currentGroup ? (
          <Link href={`/groups/${currentGroup.id}`} className="mt-4 flex flex-col gap-2 rounded-2xl border border-pink-400/30 bg-slate-900/70 p-4 transition hover:border-pink-300 hover:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-pink-200">Current group</p>
                <h4 className="text-xl font-semibold">{currentGroup.name}</h4>
              </div>
              <div className="rounded-full bg-brand-500/20 px-3 py-1 text-sm text-pink-100">{currentGroup.members.length} members</div>
            </div>
            <p className="text-sm text-slate-400">Tap to view members and share the join code.</p>
          </Link>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-4 text-sm text-slate-400">
            Create or join a group from the first screen to unlock your crew card.
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {groups.filter((group) => group.id !== currentGroup?.id).map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-pink-400/40 hover:bg-slate-900">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{group.name}</h4>
                <span className="text-sm text-slate-400">{group.members.length} people</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Code: {group.code}</p>
            </Link>
          ))}
        </div>
      </section>

      {bars.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
          <h3 className="text-lg font-semibold">Tonight&apos;s flow</h3>
          <p className="mt-1 text-sm text-slate-400">Your group&apos;s bar route for the night.</p>
          <div className="mt-5 relative">
            {/* Vertical track */}
            <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-white/10" />
            {/* Filled progress line */}
            {currentGroup && (currentGroup.currentBarIndex ?? 0) > 0 && (
              <div
                className="absolute left-[18px] top-0 w-0.5 bg-gradient-to-b from-pink-500 to-violet-500 transition-all duration-700"
                style={{
                  height: `${Math.min(((currentGroup.currentBarIndex ?? 0) / bars.length) * 100, 100)}%`,
                }}
              />
            )}
            <ol className="space-y-0">
              {bars.map((bar, idx) => {
                const currentIdx = currentGroup?.currentBarIndex ?? 0;
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isUpcoming = idx > currentIdx;
                return (
                  <li key={bar.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {/* Node */}
                    <div className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      isDone
                        ? 'border-violet-500 bg-violet-500'
                        : isCurrent
                        ? 'border-pink-500 bg-pink-500 shadow-[0_0_12px_2px_rgba(236,72,153,0.5)]'
                        : 'border-white/15 bg-slate-900/60'
                    }`}>
                      {isDone ? (
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-500'}`}>{idx + 1}</span>
                      )}
                    </div>
                    {/* Content */}
                    <div className={`flex-1 rounded-2xl border p-3 transition-all ${
                      isCurrent
                        ? 'border-pink-500/30 bg-pink-500/10'
                        : isDone
                        ? 'border-violet-500/20 bg-violet-500/5'
                        : 'border-white/5 bg-slate-900/40'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold ${isUpcoming ? 'text-slate-400' : 'text-white'}`}>{bar.name}</p>
                        {isCurrent && (
                          <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-xs font-semibold text-pink-300 animate-pulse">
                            Now
                          </span>
                        )}
                        {isDone && (
                          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">Done</span>
                        )}
                      </div>
                      {bar.address && (
                        <p className={`mt-0.5 text-xs ${isUpcoming ? 'text-slate-600' : 'text-slate-400'}`}>{bar.address}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

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
