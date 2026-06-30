'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Home, Target, Images, Trophy, User } from 'lucide-react';
import { db } from '@/lib/firebase';
import { getActiveEvent } from '@/lib/firestore';
import type { GroupDoc } from '@/lib/group';
import type { SubmissionDoc } from '@/lib/types';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Challenges', href: '/challenges', icon: Target },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
] as const;

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    getActiveEvent().then((event) => {
      if (cancelled) return;
      if (!event) { setLoading(false); return; }

      setEventName(event.name);

      const unsubGroups = onSnapshot(
        query(collection(db, 'groups'), where('eventId', '==', event.id)),
        (snap) => {
          if (cancelled) return;
          const data = snap.docs.map((d) => ({ ...(d.data() as GroupDoc), id: d.id }));
          setGroups(data.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)));
          setLoading(false);
        },
      );

      const unsubSubs = onSnapshot(
        query(collection(db, 'submissions'), where('status', '==', 'approved')),
        (snap) => {
          if (cancelled) return;
          const counts: Record<string, number> = {};
          snap.docs.forEach((d) => {
            const s = d.data() as SubmissionDoc;
            if (!s.eventId || s.eventId === event.id) {
              counts[s.groupId] = (counts[s.groupId] ?? 0) + 1;
            }
          });
          setSubmissionCounts(counts);
        },
      );

      unsubs.push(unsubGroups, unsubSubs);
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6 pb-24">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-pink-200">Leaderboard</p>
          <h1 className="mt-0.5 text-2xl font-semibold leading-tight">
            {eventName || 'Tonight'}
          </h1>
        </div>
        <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      ) : groups.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <p className="text-slate-400 text-sm">No groups yet — crawl hasn't started.</p>
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          {groups.map((group, idx) => {
            const isFirst = idx === 0;
            const challenges = submissionCounts[group.id] ?? 0;

            return (
              <div
                key={group.id}
                className={`flex items-center gap-4 rounded-[1.5rem] border px-4 py-3.5 transition-all ${
                  isFirst
                    ? 'border-pink-500/30 bg-gradient-to-r from-pink-500/15 via-violet-500/10 to-transparent'
                    : 'border-white/8 bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  {idx < 3 ? (
                    <span className="text-xl">{MEDAL[idx]}</span>
                  ) : (
                    <span className={`text-sm font-bold ${isFirst ? 'text-pink-300' : 'text-slate-500'}`}>
                      #{idx + 1}
                    </span>
                  )}
                </div>

                {/* Color dot + name */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: group.color ?? '#f43f5e' }}
                  />
                  <div className="min-w-0">
                    <p className={`truncate font-semibold ${isFirst ? 'text-white' : 'text-slate-200'}`}>
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {challenges} {challenges === 1 ? 'challenge' : 'challenges'} done
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="shrink-0 text-right">
                  <p className={`text-xl font-bold tabular-nums ${isFirst ? 'text-pink-300' : 'text-slate-100'}`}>
                    {group.score ?? 0}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">pts</p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/leaderboard';
            return (
              <Link
                key={item.label}
                href={item.href as string}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition hover:bg-white/10 ${
                  isActive ? 'text-pink-400' : 'text-slate-300'
                }`}
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
