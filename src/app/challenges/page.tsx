'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UploadPanel } from '@/components/UploadPanel';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, getBars, getChallenges } from '@/lib/firestore';
import { getGroups, getUserGroup, advanceAllGroupsToNextBar, type GroupDoc } from '@/lib/group';
import type { BarDoc, ChallengeDoc, EventDoc } from '@/lib/types';

export default function ChallengesPage() {
  const { user, dbUser } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [myGroup, setMyGroup] = useState<GroupDoc | null>(null);
  const [allGroups, setAllGroups] = useState<GroupDoc[]>([]);
  const [bars, setBars] = useState<BarDoc[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [activeEvent, group, groupList, allBars, allChallenges] = await Promise.all([
        getActiveEvent(),
        getUserGroup(user.uid),
        getGroups(),
        getBars(),
        getChallenges(),
      ]);
      const eventBars = activeEvent
        ? allBars.filter((b) => (b as any).eventId === activeEvent.id).sort((a, b) => a.order - b.order)
        : [];
      const eventGroups = activeEvent
        ? groupList.filter((g) => g.eventId === activeEvent.id)
        : [];
      setEvent(activeEvent);
      setMyGroup(group);
      setAllGroups(eventGroups);
      setBars(eventBars);
      setChallenges(allChallenges.filter((c) => (c as any).eventId === activeEvent?.id));
      setLoading(false);
    };
    load();
  }, [user]);

  const currentSlot = myGroup?.currentBarIndex ?? 0;
  const barIdx = myGroup?.barSequence ? (myGroup.barSequence[currentSlot] ?? currentSlot) : currentSlot;
  const currentBar = bars[barIdx] ?? null;
  const currentChallenges = challenges.filter((c) => c.barId === currentBar?.id);

  // Find which other group is at the same bar this slot
  const meetingGroup = allGroups.find(
    (g) => g.id !== myGroup?.id && (g.barSequence ? g.barSequence[currentSlot] : currentSlot) === barIdx,
  );

  const handleAdvance = async () => {
    if (!myGroup) return;
    setIsAdvancing(true);
    try {
      const groupIds = allGroups.map((g) => g.id);
      await advanceAllGroupsToNextBar(groupIds, currentSlot);
      setMyGroup((prev) => prev ? { ...prev, currentBarIndex: (currentSlot + 1) % bars.length } : prev);
      setAllGroups((prev) => prev.map((g) => ({ ...g, currentBarIndex: (currentSlot + 1) % bars.length })));
    } finally {
      setIsAdvancing(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
        <p className="text-slate-400 text-sm">Loading…</p>
      </main>
    );
  }

  if (!event?.started) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Current stop</p>
            <h1 className="text-2xl font-semibold">—</h1>
          </div>
          <Link href="/" className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm">Back</Link>
        </div>
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Waiting for the leader to start the crawl…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Current stop</p>
          <h1 className="text-2xl font-semibold">{currentBar?.name ?? '—'}</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm">Back</Link>
      </div>

      {/* Meeting info */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-pink-500/20 via-slate-900 to-violet-500/20 p-5">
        <p className="text-sm text-pink-200 font-medium">Stop {currentSlot + 1} of {bars.length}</p>
        {meetingGroup ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ background: meetingGroup.color ?? '#f43f5e' }} />
            <p className="text-lg font-semibold">Meeting <span className="text-pink-300">{meetingGroup.name}</span> here</p>
          </div>
        ) : (
          <p className="mt-2 text-slate-400 text-sm">Solo stop — no other group assigned here this round.</p>
        )}
        {currentBar?.address && (
          <p className="mt-1 text-xs text-slate-500">{currentBar.address}</p>
        )}
      </section>

      {/* Challenges for this bar */}
      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
        <h2 className="text-xl font-semibold">Challenges</h2>
        {currentChallenges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No challenges for this stop.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {currentChallenges.map((ch) => (
              <div key={ch.id} className="rounded-2xl bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{ch.title}</h3>
                  <span className="rounded-full bg-pink-500/20 px-2 py-1 text-sm text-pink-200">+{ch.points} pts</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{ch.description}</p>
                <p className="mt-2 text-xs text-slate-500">{ch.difficulty} · photo required</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <UploadPanel />

      {/* Admin-only: advance all groups to next bar */}
      {dbUser?.role === 'admin' && (
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Admin: advance crawl</h2>
              <p className="text-sm text-slate-400 mt-1">Move all groups to the next stop.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isAdvancing || currentSlot >= bars.length - 1}
              className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isAdvancing ? 'Moving…' : 'Next stop →'}
            </button>
          </div>
        </section>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold">Move to next stop?</h3>
            <p className="mt-2 text-sm text-slate-400">This advances all groups simultaneously. Current submissions will be locked in.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold">Cancel</button>
              <button onClick={handleAdvance} disabled={isAdvancing} className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white">
                {isAdvancing ? 'Moving…' : 'Yes, continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
