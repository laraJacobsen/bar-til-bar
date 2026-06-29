'use client';

import { useEffect, useState } from 'react';
import { getGroups, type GroupDoc } from '@/lib/group';

export default function LeaderboardPage() {
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getGroups().then((all) => {
      setGroups(all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)));
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Live leaderboard</p>
        <h1 className="text-2xl font-semibold">Points update in real time</h1>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        {mounted ? groups.map((group, index) => (
          <div key={group.id} className="mt-3 flex items-center justify-between rounded-2xl bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white"
                style={{ backgroundColor: group.color ?? '#ec4899' }}
              >
                {index + 1}
              </div>
              <div>
                <p className="font-semibold">{group.name}</p>
                <p className="text-sm text-slate-400">{group.completedChallenges?.length ?? 0} challenges done</p>
              </div>
            </div>
            <p className="text-lg font-semibold">{group.score ?? 0} pts</p>
          </div>
        )) : null}
        {mounted && groups.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-400">No groups yet.</p>
        ) : null}
      </section>
    </main>
  );
}
