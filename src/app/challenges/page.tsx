'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { UploadPanel } from '@/components/UploadPanel';
import { advanceAllGroupsToNextBar, buildBarMeetups, getGroups, getUserGroup, updateGroupScore, type GroupDoc } from '@/lib/group';
import { createSubmission, getBars, getChallenges, getSubmissionsByGroup, type ChallengeDoc, type SubmissionDoc } from '@/lib/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const challengeCards = [
  { id: 'group-selfie', title: 'Group selfie', points: 50, difficulty: 'easy', icon: '📸' },
  { id: 'human-pyramid', title: 'Human pyramid', points: 80, difficulty: 'medium', icon: '🧍' },
  { id: 'find-red', title: 'Find someone wearing red', points: 60, difficulty: 'easy', icon: '🔴' },
];

export default function ChallengesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [currentGroup, setCurrentGroup] = useState<GroupDoc | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [mounted, setMounted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Challenge submission state
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);

    const loadGroups = async () => {
      try {
        const nextGroups = await getGroups();
        setGroups(nextGroups);

        if (user?.uid) {
          const group = await getUserGroup(user.uid);
          setCurrentGroup(group ?? null);
        }

        const sharedBarIndex = nextGroups.find((group) => typeof group.currentBarIndex === 'number')?.currentBarIndex;
        if (typeof sharedBarIndex === 'number') {
          setActiveBarIndex(sharedBarIndex);
        }
      } catch {
        setGroups([]);
      }
    };

    loadGroups();
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
  const activeBar = bars[activeBarIndex] ?? bars[0];

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

  const handleChallengeClick = (challengeId: string) => {
    setActiveChallengeId(challengeId);
    setCapturedImage(null);
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage || !activeChallengeId || !currentGroup) return;

    setSubmitting(true);
    try {
      const challenge = challengeCards.find((c) => c.id === activeChallengeId);
      if (!challenge) return;

      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Upload image directly to Firebase Storage
      const timestamp = Date.now();
      const fileName = `submissions/${currentGroup.id}/${activeChallengeId}-${timestamp}.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob, { contentType: blob.type });
      const photoUrl = await getDownloadURL(storageRef);

      // Create submission record
      await createSubmission({
        groupId: currentGroup.id,
        barId: activeBar?.name.toLowerCase().replace(/\s+/g, '-') || 'north-star',
        challengeId: activeChallengeId,
        photoUrl,
      });

      // Update group score
      const newScore = (currentGroup.score || 0) + challenge.points;
      await updateGroupScore(currentGroup.id, newScore);

      // Update local state
      setCurrentGroup({ ...currentGroup, score: newScore });
      setActiveChallengeId(null);
      setCapturedImage(null);
    } catch (error) {
      console.error('Error submitting challenge:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (activeChallengeId && currentGroup) {
    const challenge = challengeCards.find((c) => c.id === activeChallengeId);
    if (!challenge) return null;

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
        <button 
          onClick={() => {
            setActiveChallengeId(null);
            setCapturedImage(null);
          }}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back
        </button>

        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{challenge.icon}</span>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Challenge</p>
              <h1 className="text-2xl font-semibold">{challenge.title}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">+{challenge.points} points</p>
        </section>

        {!capturedImage ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-pink-400/40 bg-slate-900/50 py-24 text-center transition hover:border-pink-300 hover:bg-slate-900"
            >
              <p className="text-lg font-semibold">📸</p>
              <p className="mt-3 text-sm text-slate-300">Tap to take or upload photo</p>
              <p className="mt-1 text-xs text-slate-500">iOS optimized</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <img src={capturedImage} alt="Challenge submission" className="w-full rounded-2xl object-cover" />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleRetake}
                disabled={submitting}
                className="flex-1 rounded-full border border-white/10 px-4 py-3 font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"
              >
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </section>
        )}
      </main>
    );
  }

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
          <div>
            <p className="text-sm text-slate-400">Current score</p>
            <h2 className="text-3xl font-semibold">{currentGroup?.score || 0}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isAdvancing}
            className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {isAdvancing ? 'Moving…' : 'Next bar'}
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Unlockable challenges</h2>
        <div className="mt-4 space-y-3">
          {challengeCards.map((challenge) => (
            <button
              key={challenge.id}
              onClick={() => handleChallengeClick(challenge.id)}
              className="w-full rounded-2xl bg-slate-900/60 p-4 text-left transition hover:border hover:border-pink-400/40 hover:bg-slate-900"
            >
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
                <span>Tap to submit</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {mounted ? <UploadPanel /> : null}

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
