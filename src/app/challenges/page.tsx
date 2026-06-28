'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { UploadPanel } from '@/components/UploadPanel';
import { buildBarMeetups, getGroups, type GroupDoc } from '@/lib/group';

const challengeCards = [
  { title: 'Team selfie', points: 50, difficulty: 'easy', icon: '📸' },
  { title: 'Human pyramid', points: 80, difficulty: 'medium', icon: '🧍' },
  { title: 'Find someone wearing red', points: 60, difficulty: 'easy', icon: '🔴' },
];

export default function ChallengesPage() {
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const nextGroups = await getGroups();
        setGroups(nextGroups);
      } catch {
        setGroups([]);
      }
    };

    loadGroups();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setActiveBarIndex((current) => (current + 1) % 4);
          return 15 * 60;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const bars = useMemo(() => buildBarMeetups(groups.map((group) => group.name)), [groups]);
  const activeBar = bars[activeBarIndex] ?? bars[0];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Current meetup</p>
          <h1 className="text-2xl font-semibold">{activeBar?.name}</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">Back</Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/20 via-slate-900 to-violet-500/20 p-5 shadow-[0_0_60px_rgba(236,72,153,0.15)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-pink-100">Next bar swap</p>
            <h2 className="text-2xl font-semibold">{formatTime(timeLeft)}</h2>
          </div>
          <div className="rounded-full border border-pink-400/20 bg-pink-500/15 px-3 py-2 text-sm text-pink-100">
            {activeBar?.groups.join(' vs ')}
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
            style={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">4-bar route</h2>
          <span className="text-sm text-slate-400">Each stop pairs two groups</span>
        </div>
        <div className="mt-4 space-y-3">
          {bars.map((bar, index) => (
            <div
              key={bar.name}
              className={`rounded-2xl border p-4 ${index === activeBarIndex ? 'border-pink-400/40 bg-pink-500/10' : 'border-white/10 bg-slate-900/60'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Bar {index + 1}</p>
                  <h3 className="font-semibold">{bar.name}</h3>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-sm text-slate-200">{bar.groups.join(' + ')}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Unlockable challenges</h2>
        <div className="mt-4 space-y-3">
          {challengeCards.map((challenge) => (
            <div key={challenge.title} className="rounded-2xl bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{challenge.icon}</span>
                  <h3 className="font-semibold">{challenge.title}</h3>
                </div>
                <span className="rounded-full bg-brand-500/20 px-2 py-1 text-sm text-pink-100">+{challenge.points} pts</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Snap a photo and submit for review.</p>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>{challenge.difficulty}</span>
                <span>Photo required</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <UploadPanel />
    </main>
  );
}
