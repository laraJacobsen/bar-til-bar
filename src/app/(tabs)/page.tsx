'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ChevronRight, History, MapPin } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { GroupJoinCreate } from '@/components/GroupJoinCreate';
import { PageSkeleton } from '@/components/PageSkeleton';
import { getActiveEvent, getBars, seedDemoData } from '@/lib/firestore';
import { getGroups, getUserGroup, type GroupDoc } from '@/lib/group';
import type { BarDoc, EventDoc } from '@/lib/types';

const homeCache: { event: EventDoc | null; currentGroup: GroupDoc | null; allGroups: GroupDoc[]; bars: BarDoc[] } = {
  event: null,
  currentGroup: null,
  allGroups: [],
  bars: [],
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function mapsUrl(bar: BarDoc): string | null {
  if (bar.lat != null && bar.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${bar.lat},${bar.lng}`;
  }
  if (bar.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bar.address)}`;
  }
  return null;
}

// Derives the current slot and countdown from the event schedule — no Firestore
// write needed. Slot advances automatically when time crosses the boundary.
// Shows a "Move!" warning for the last 10 minutes of each stop.
function useSchedule(
  startMs: number | null,
  endMs: number | null,
  numSlots: number,
): { slot: number; countdown: string; isWarning: boolean; remainingMs: number } {
  const [state, setState] = useState({ slot: 0, countdown: '', isWarning: false, remainingMs: 0 });

  useEffect(() => {
    if (!startMs || !endMs || numSlots === 0) return;
    const msPerSlot = (endMs - startMs) / numSlots;
    const WARNING_MS = 10 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const slot = Math.min(Math.max(0, Math.floor((now - startMs) / msPerSlot)), numSlots - 1);
      const remaining = Math.max(0, startMs + (slot + 1) * msPerSlot - now);
      const isWarning = remaining <= WARNING_MS;
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
      setState({
        slot,
        countdown: remaining === 0 ? 'Time to move!' : isWarning ? `Move! ${timeStr}` : timeStr,
        isWarning,
        remainingMs: remaining,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs, endMs, numSlots]);

  return state;
}

export default function HomePage() {
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(homeCache.event);
  const [currentGroup, setCurrentGroup] = useState<GroupDoc | null>(homeCache.currentGroup);
  const [allGroups, setAllGroups] = useState<GroupDoc[]>(homeCache.allGroups);
  const [bars, setBars] = useState<BarDoc[]>(homeCache.bars);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return; }
    if (loading || !user) return;

    const load = async () => {
      if (!localStorage.getItem('bartilbar:seeded')) {
        await seedDemoData();
        localStorage.setItem('bartilbar:seeded', 'true');
      }
      const [activeEvent, group, groups, allBars] = await Promise.all([
        getActiveEvent(),
        getUserGroup(user.uid),
        getGroups(),
        getBars(),
      ]);
      const eventBars = activeEvent
        ? allBars.filter((b) => (b as any).eventId === activeEvent.id).sort((a, b) => a.order - b.order)
        : [];
      const eventGroups = activeEvent
        ? groups.filter((g) => g.eventId === activeEvent.id)
        : [];
      // Prefer a group that's actually in the event (has barSequence assigned).
      // getUserGroup returns the first group the user belongs to regardless of eventId,
      // so if they have a stale group from a previous session we'd get that instead.
      const resolvedGroup =
        eventGroups.find((g) => g.members?.includes(user.uid)) || group || null;
      homeCache.event = activeEvent;
      homeCache.currentGroup = resolvedGroup;
      homeCache.allGroups = eventGroups;
      homeCache.bars = eventBars;
      setEvent(activeEvent);
      setCurrentGroup(resolvedGroup);
      setAllGroups(eventGroups);
      setBars(eventBars);
      setDataLoaded(true);
    };

    load();
  }, [loading, router, user]);

  // Onboarding guard: an authenticated user who never finished the flow (no completion
  // flag, not an admin, and no group in this event) is sent back into it to resume.
  // Legacy users who already have a group predate the flag and are treated as done.
  useEffect(() => {
    if (loading || !user || dbUser === null || !dataLoaded) return;
    const onboarded = dbUser.onboardingComplete || dbUser.role === 'admin' || !!currentGroup;
    if (!onboarded) router.replace('/login');
  }, [loading, user, dbUser, dataLoaded, currentGroup, router]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  }, []);

  // Real-time: pushes event.started / crawl-ended to all clients
  const wasStartedRef = useRef(false);
  const lastEventIdRef = useRef<string | null>(null);
  const notifiedForSlot = useRef<number>(-1);
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'events'), where('status', '==', 'active')),
      async (snapshot) => {
        const activeEvent =
          snapshot.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, 'id'>) }))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

        // Admin ended the crawl — event left the 'active' query → redirect to summary
        if (!activeEvent && lastEventIdRef.current !== null) {
          router.push(`/summary?id=${lastEventIdRef.current}` as any);
          return;
        }
        if (activeEvent) lastEventIdRef.current = activeEvent.id;

        const justStarted = !wasStartedRef.current && !!activeEvent?.started;
        wasStartedRef.current = !!activeEvent?.started;
        homeCache.event = activeEvent;
        setEvent(activeEvent);

        if (justStarted) {
          const [group, groups] = await Promise.all([getUserGroup(user.uid), getGroups()]);
          const eventGroups = activeEvent ? groups.filter((g) => g.eventId === activeEvent.id) : [];
          const resolvedGroup =
            eventGroups.find((g) => g.members?.includes(user.uid)) || group || null;
          setCurrentGroup(resolvedGroup);
          setAllGroups(eventGroups);
          homeCache.currentGroup = resolvedGroup;
          homeCache.allGroups = eventGroups;
        }
      },
    );
    return () => unsub();
  }, [user, router]);

  // Derived route values
  const orderedBars = currentGroup?.barSequence
    ? currentGroup.barSequence.map((i) => bars[i]).filter(Boolean)
    : bars;
  const startMs = event?.startsAt ? new Date(event.startsAt).getTime() : null;
  const endMs = event?.endsAt ? new Date(event.endsAt).getTime() : null;
  const msPerStop = startMs && endMs && orderedBars.length ? (endMs - startMs) / orderedBars.length : null;
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Time-based schedule: slot advances automatically when the slot boundary
  // passes — no Firestore write required. isWarning fires at 10 min remaining.
  const { slot: liveSlot, countdown, isWarning, remainingMs } = useSchedule(
    event?.started ? startMs : null,
    event?.started ? endMs : null,
    orderedBars.length,
  );
  const currentSlot = event?.started ? liveSlot : (currentGroup?.currentBarIndex ?? 0);
  const currentBar = orderedBars[currentSlot] ?? null;

  // All groups meeting this group at a given slot
  const meetingGroupsAtSlot = (slot: number) => {
    const myBar = currentGroup?.barSequence?.[slot];
    if (myBar == null) return [];
    return allGroups.filter(
      (g) => g.id !== currentGroup?.id && g.barSequence?.[slot] === myBar,
    );
  };

  // Leave-time helpers (walking at ~5 km/h = 12 min/km)
  const nextBar = orderedBars[currentSlot + 1] ?? null;
  const distToNextKm =
    userLocation && nextBar?.lat != null && nextBar?.lng != null
      ? haversineKm(userLocation.lat, userLocation.lng, nextBar.lat, nextBar.lng)
      : null;
  const walkToNextMin = distToNextKm != null ? Math.ceil(distToNextKm * 12) : null;
  const leaveInMin =
    walkToNextMin != null && event?.started
      ? Math.floor((remainingMs - walkToNextMin * 60_000) / 60_000)
      : null;

  // Request notification permission once the crawl goes live
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!event?.started || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }, [event?.started]);

  // Schedule a "leave now" notification timed to the walking distance to the next bar
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!event?.started || !startMs || !msPerStop) return;
    const next = orderedBars[currentSlot + 1];
    if (!next || next.lat == null || next.lng == null || !userLocation) return;
    if (notifiedForSlot.current === currentSlot) return;

    const distKm = haversineKm(userLocation.lat, userLocation.lng, next.lat, next.lng);
    const walkMs = Math.ceil(distKm * 12) * 60_000;
    const slotEndMs = startMs + (currentSlot + 1) * msPerStop;
    const delay = slotEndMs - walkMs - Date.now();

    const fire = () => {
      if (notifiedForSlot.current === currentSlot) return;
      notifiedForSlot.current = currentSlot;
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Head to ${next.name}! 🚶`, {
          body: `${Math.ceil(distKm * 12)} min walk — leave now to arrive on time.`,
        });
      }
    };

    if (delay <= 0) { fire(); return; }
    const timer = setTimeout(fire, delay);
    return () => clearTimeout(timer);
  // notifiedForSlot is a ref — intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlot, event?.started, userLocation, orderedBars, startMs, msPerStop]);
  const handleGroupJoined = (group: GroupDoc) => {
    homeCache.currentGroup = group;
    setCurrentGroup(group);
  };

  if (loading || !user) {
    return <PageSkeleton />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6 pb-24">

      {/* Admin shortcut */}
      {dbUser?.role === 'admin' && (
        <section className="flex items-center justify-between gap-4 rounded-3xl border border-pink-500/30 bg-pink-500/10 p-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-pink-300 font-bold">Admin</p>
            <p className="text-sm text-pink-100">You are logged in as administrator.</p>
          </div>
          <Link href="/admin" className="rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-600 transition shrink-0">
            Control Center
          </Link>
        </section>
      )}

      {/* Main card */}
      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-glow">

        {/* Event header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-pink-200">Live event</p>
            <h1 className="text-2xl font-semibold leading-tight mt-0.5">{event?.name || 'Bar Til Bar'}</h1>
          </div>
          <span className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            event?.started ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'
          }`}>
            {event?.started ? '● Live' : 'Not started'}
          </span>
        </div>

        {/* Group row */}
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
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Score</p>
                <p className="text-2xl font-bold text-white">{currentGroup.score ?? 0}</p>
              </div>
            </Link>
          ) : event ? (
            <GroupJoinCreate eventId={event.id} userId={user.uid} onSuccess={handleGroupJoined} />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-500">
              No group yet — get the crawl code from your organiser.
            </div>
          )}
        </div>

        {/* Current stop info + countdown */}
        {event?.started && currentGroup && orderedBars.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900/60 px-4 py-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Now at</p>
              <p className="font-semibold text-white mt-0.5">{currentBar?.name ?? '—'}</p>
              {currentBar && mapsUrl(currentBar) && (
                <a
                  href={mapsUrl(currentBar)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex w-fit items-center gap-1 text-xs text-pink-300 hover:text-pink-200 transition"
                >
                  <MapPin className="h-3 w-3" />
                  Get directions
                </a>
              )}
              <p className="text-xs text-slate-500 mt-0.5">Stop {currentSlot + 1} of {orderedBars.length}</p>
              {nextBar && walkToNextMin != null && (
                <p className={`text-xs mt-1.5 font-medium ${
                  leaveInMin != null && leaveInMin <= 0 ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {leaveInMin != null && leaveInMin <= 0
                    ? `Head to ${nextBar.name} now! (${walkToNextMin} min walk)`
                    : leaveInMin != null
                    ? `Leave in ${leaveInMin}m · ${walkToNextMin} min walk to ${nextBar.name}`
                    : `${walkToNextMin} min walk to ${nextBar.name}`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Time left</p>
              <p className={`text-xl font-mono font-bold mt-0.5 ${isWarning ? 'text-rose-400 animate-pulse' : 'text-pink-300'}`}>
                {countdown}
              </p>
            </div>
          </div>
        )}

        {/* Dot progress bar */}
        {event?.started && currentGroup && orderedBars.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            {orderedBars.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  idx < currentSlot ? 'bg-violet-500'
                  : idx === currentSlot ? 'bg-pink-500'
                  : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {event?.started && currentGroup ? (
          <Link
            href="/challenges"
            className="mt-4 flex w-full items-center justify-center rounded-full bg-white px-4 py-3 font-semibold text-slate-900 hover:bg-slate-100 transition"
          >
            Go to Current Challenge
          </Link>
        ) : !event?.started ? (
          <div className="mt-4 flex w-full items-center justify-center rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed select-none">
            Waiting for leader to start
          </div>
        ) : null}
      </section>

      {/* Tonight's flow — only shown once crawl is live and user has a group */}
      {event?.started && currentGroup && orderedBars.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Tonight&apos;s flow</h2>
            <span className="text-sm text-slate-400">{orderedBars.length} stops</span>
          </div>

          <div className="relative">
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
                const meetingGroups = meetingGroupsAtSlot(idx);
                const distKm =
                  userLocation && bar.lat != null && bar.lng != null
                    ? haversineKm(userLocation.lat, userLocation.lng, bar.lat, bar.lng)
                    : null;
                const barUrl = mapsUrl(bar);

                return (
                  <li key={`${bar.id}-${idx}`} className="relative flex items-center gap-4 pb-4 last:pb-0">
                    {/* Dot */}
                    <div className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full transition-all ${
                      isDone      ? 'bg-violet-500/20 border border-violet-500/30'
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

                    {/* Bar info */}
                    <div className={`flex flex-1 flex-col gap-1 rounded-2xl border px-4 py-3 transition-all ${
                      isCurrent ? 'border-pink-500/25 bg-pink-500/10'
                      : isDone  ? 'border-white/5 bg-white/[0.02]'
                      : 'border-white/5 bg-slate-900/30'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold leading-snug ${isDone ? 'text-slate-500' : isCurrent ? 'text-white' : 'text-slate-400'}`}>
                          {bar.name}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          {barUrl && !isDone && (
                            <a
                              href={barUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-500 hover:text-pink-300 transition"
                              aria-label={`Directions to ${bar.name}`}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {isCurrent && (
                            <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-pink-300 animate-pulse">
                              Now
                            </span>
                          )}
                          {isDone && (
                            <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {arrivalMs && (
                            <p className={`text-xs ${isDone ? 'text-slate-600' : isCurrent ? 'text-pink-300' : 'text-slate-600'}`}>
                              {fmt(arrivalMs)} – {fmt(arrivalMs + (msPerStop ?? 0))}
                            </p>
                          )}
                          {distKm != null && (
                            <span className={`text-xs ${isDone ? 'text-slate-600' : 'text-slate-500'}`}>
                              · {fmtDist(distKm)} (~{Math.ceil(distKm * 12)} min walk)
                            </span>
                          )}
                        </div>
                        {meetingGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {meetingGroups.map((g) => (
                              <div key={g.id} className="flex items-center gap-1">
                                <span
                                  className="inline-block h-2 w-2 rounded-full shrink-0"
                                  style={{ background: g.color ?? '#f43f5e' }}
                                />
                                <p className={`text-xs ${isDone ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {g.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      <Link
        href="/recap"
        className="flex items-center justify-between rounded-[22px] border border-white/[.08] bg-white/[.045] px-5 py-4 text-sm font-semibold text-[#f4f2f8] backdrop-blur-[20px] transition hover:bg-white/[.07]"
      >
        <span className="flex items-center gap-2.5">
          <History className="h-4 w-4 text-[#ff5aa8]" aria-hidden />
          Past crawls
        </span>
        <ChevronRight className="h-4 w-4 text-[#6a637f]" aria-hidden />
      </Link>
    </main>
  );
}
