'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function RecapPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Event recap</p>
          <h1 className="text-2xl font-semibold">Spotify Wrapped for your crawl</h1>
        </div>
        <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">Back</Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/30 to-accent/30 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Winning group</h2>
        <p className="mt-2 text-3xl font-semibold">Neon Crew</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {mounted ? [['Total photos', '48'], ['Completed challenges', '14'], ['Fastest group', '13 min'], ['Most liked photo', '3.2k']].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          )) : null}
        </div>
      </section>
    </main>
  );
}
