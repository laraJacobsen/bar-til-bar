'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { UploadPanel } from '@/components/UploadPanel';
import { useAuth } from '@/components/AuthProvider';
import { advanceAllGroupsToNextBar, buildBarMeetups, getGroups, getUserGroup, type GroupDoc } from '@/lib/group';

const challengeCards = [
  { id: 'group-selfie', title: 'Group selfie', points: 50, difficulty: 'easy', icon: '📸' },
  { id: 'human-pyramid', title: 'Human pyramid', points: 80, difficulty: 'medium', icon: '🧍' },
  { id: 'find-someone-wearing-red', title: 'Find someone wearing red', points: 60, difficulty: 'easy', icon: '🔴' },
];

type ChallengeCard = typeof challengeCards[0];

export default function ChallengesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [userGroup, setUserGroup] = useState<GroupDoc | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [mounted, setMounted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeCard | null>(null);

  useEffect(() => {
    setMounted(true);

    const loadGroups = async () => {
      try {
        const nextGroups = await getGroups();
        setGroups(nextGroups);

        const sharedBarIndex = nextGroups.find((group) => typeof group.currentBarIndex === 'number')?.currentBarIndex;
        if (typeof sharedBarIndex === 'number') {
          setActiveBarIndex(sharedBarIndex);
        }
      } catch {
        setGroups([]);
      }
    };

    loadGroups();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      getUserGroup(user.uid).then((group) => setUserGroup(group ?? null));
    }
  }, [user]);

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

  const bars = useMemo(() => buildBarMeetups(groups.map((group) => group.name), ['North Star', 'Velvet Room', 'Neon Tunnel', 'Golden Hour']), [groups]);
  const activeBar = bars[activeBarIndex] || bars[0];
  const completedChallenges = new Set(userGroup?.completedChallenges ?? []);

  const handleAdvanceToNextBar = async () => {
    setIsAdvancing(true);
    try {
      const nextIndex = await advanceAllGroupsToNextBar(groups.map((group) => group.id), activeBarIndex);
      setActiveBarIndex(nextIndex);
      setTimeLeft(15 * 60);
      setGroups((currentGroups) => currentGroups.map((group) => ({ ...group, currentBarIndex: nextIndex })));
    } finally {
      setIsAdvancing(false);
      setShowConfirmModal(false);
    }
  };

  const handleChallengeSubmitted = (challengeId: string) => {
    setUserGroup((prev) => prev ? {
      ...prev,
      completedChallenges: [...(prev.completedChallenges ?? []), challengeId],
      score: (prev.score ?? 0) + (challengeCards.find((c) => c.id === challengeId)?.points ?? 0),
    } : prev);
    setActiveChallenge(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
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
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isAdvancing}
            className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {isAdvancing ? 'Moving…' : 'Next bar'}
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-400">Advance the whole crawl to the next stop and lock in the current submissions.</p>
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Challenges</h2>
          {userGroup && (
            <span className="text-sm text-slate-400">{completedChallenges.size}/{challengeCards.length} done</span>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {challengeCards.map((challenge) => {
            const isCompleted = completedChallenges.has(challenge.id);
            const isActive = activeChallenge?.id === challenge.id;

            return (
              <div key={challenge.id} className={`rounded-2xl border p-4 transition ${isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-slate-900/60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{challenge.icon}</span>
                    <h3 className="font-semibold">{challenge.title}</h3>
                  </div>
                  <span className="rounded-full bg-brand-500/20 px-2 py-1 text-sm text-pink-100">+{challenge.points} pts</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Snap a photo and submit for review.</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">{challenge.difficulty}</span>
                  {isCompleted ? (
                    <span className="text-sm font-semibold text-green-400">✓ Submitted</span>
                  ) : !isActive ? (
                    <button
                      type="button"
                      onClick={() => setActiveChallenge(challenge)}
                      className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1 text-sm font-semibold text-white"
                    >
                      Submit photo
                    </button>
                  ) : null}
                </div>

                {mounted && isActive ? (
                  <div className="mt-4">
                    <UploadPanel
                      challengeId={challenge.id}
                      barId={activeBar?.name.toLowerCase().replace(/\s+/g, '-') ?? 'north-star'}
                      points={challenge.points}
                      onSubmitted={() => handleChallengeSubmitted(challenge.id)}
                      onCancel={() => setActiveChallenge(null)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {showConfirmModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Confirm bar change</p>
            <h3 className="mt-3 text-2xl font-semibold">All photos will be submitted for this bar</h3>
            <p className="mt-3 text-sm text-slate-400">
              Once you move on, the current bar submissions will be locked in and you won&apos;t be able to redo them. Are you sure you want to continue to the next bar?
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
                Cancel
              </button>
              <button type="button" onClick={handleAdvanceToNextBar} disabled={isAdvancing} className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white">
                {isAdvancing ? 'Moving…' : 'Yes, continue'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
