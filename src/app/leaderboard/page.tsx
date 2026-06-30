'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const groups = [
  { name: 'Neon Crew', points: 1240, completed: 8 },
  { name: 'Midnight Mix', points: 1180, completed: 7 },
  { name: 'Velvet Vibes', points: 1020, completed: 6 },
];

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Live leaderboard</p>
          <h1 className="text-2xl font-semibold">Points update in real time</h1>
        </div>
        <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">Back</Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        {mounted ? groups.map((group, index) => (
          <div key={group.name} className="mt-3 flex items-center justify-between rounded-2xl bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 font-semibold">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold">{group.name}</p>
                <p className="text-sm text-slate-400">{group.completed} challenges</p>
              </div>
            </div>
            <p className="text-lg font-semibold">{group.points}</p>
          </div>
        )) : null}
      </section>
    </main>
  );
}
