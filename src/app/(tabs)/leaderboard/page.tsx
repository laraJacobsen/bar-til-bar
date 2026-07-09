'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getActiveEvent } from '@/lib/firestore';
import type { GroupDoc } from '@/lib/group';
import type { SubmissionDoc } from '@/lib/types';

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
            if (s.eventId === event.id) { // strict: only this crawl's submissions count
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
        <section className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-3.5"
            >
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="h-6 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </section>
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

    </main>
  );
}
