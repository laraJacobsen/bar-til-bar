'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { UploadPanel } from '@/components/UploadPanel';
import { PageSkeleton } from '@/components/PageSkeleton';
import { useAuth } from '@/components/AuthProvider';
import { getActiveEvent, getBars, getChallenges, createSubmission } from '@/lib/firestore';
import { uploadToR2 } from '@/lib/upload';
import { getGroups, getUserGroup, advanceAllGroupsToNextBar, type GroupDoc } from '@/lib/group';
import type { BarDoc, ChallengeDoc, EventDoc, SubmissionDoc } from '@/lib/types';

export default function ChallengesPage() {
  const router = useRouter();
  const { user, dbUser } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [myGroup, setMyGroup] = useState<GroupDoc | null>(null);
  const [allGroups, setAllGroups] = useState<GroupDoc[]>([]);
  const [bars, setBars] = useState<BarDoc[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [uploadChallengeId, setUploadChallengeId] = useState<string | null>(null);

  // Fun camera state — capture a candid photo and optionally share it to the gallery
  const funInputRef = useRef<HTMLInputElement>(null);
  const [funPhotoUrl, setFunPhotoUrl] = useState('');
  const [funFile, setFunFile] = useState<File | null>(null);
  const [funSubmitting, setFunSubmitting] = useState(false);
  const [funSubmitted, setFunSubmitted] = useState(false);
  const [funError, setFunError] = useState('');

  // Redirect when admin ends the crawl
  const lastEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'events'), where('status', '==', 'active')),
      (snapshot) => {
        const ev = snapshot.docs[0];
        if (ev) { lastEventIdRef.current = ev.id; return; }
        if (lastEventIdRef.current) router.push(`/summary?id=${lastEventIdRef.current}` as any);
      },
    );
    return () => unsub();
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [activeEvent, rawGroup, groupList, allBars, allChallenges] = await Promise.all([
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
      const resolvedGroup =
        eventGroups.find((g) => g.members?.includes(user.uid)) || rawGroup || null;

      setEvent(activeEvent);
      setMyGroup(resolvedGroup);
      setAllGroups(eventGroups);
      setBars(eventBars);
      setChallenges(allChallenges.filter((c) => (c as any).eventId === activeEvent?.id));

      // Load which challenges this group already submitted
      if (resolvedGroup?.id) {
        const subsSnap = await getDocs(
          query(collection(db, 'submissions'), where('groupId', '==', resolvedGroup.id)),
        );
        setSubmittedIds(
          new Set(
            subsSnap.docs.flatMap((d) => {
              const id = (d.data() as SubmissionDoc).challengeId;
              return id ? [id] : []; // fun submissions have no challengeId — skip them
            }),
          ),
        );
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const currentSlot = myGroup?.currentBarIndex ?? 0;
  const barIdx = myGroup?.barSequence ? (myGroup.barSequence[currentSlot] ?? currentSlot) : currentSlot;
  const currentBar = bars[barIdx] ?? null;
  const currentChallenges = challenges.filter((c) => c.barId === currentBar?.id);

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

  const handleFunPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (funPhotoUrl) URL.revokeObjectURL(funPhotoUrl);
    setFunFile(file);
    setFunPhotoUrl(URL.createObjectURL(file));
    setFunSubmitted(false);
    setFunError('');
  };

  const closeFunPhoto = () => {
    if (funPhotoUrl) URL.revokeObjectURL(funPhotoUrl);
    setFunPhotoUrl('');
    setFunFile(null);
    setFunSubmitting(false);
    setFunSubmitted(false);
    setFunError('');
    if (funInputRef.current) funInputRef.current.value = '';
  };

  // Share a "just for fun" photo to the event gallery. It becomes a submission with
  // type 'fun' (no challenge/bar/points) that an admin approves like any other photo.
  const handleFunSubmit = async () => {
    if (!funFile || !user || !myGroup) return;
    setFunSubmitting(true);
    setFunError('');
    try {
      const photoUrl = await uploadToR2(funFile, { kind: 'fun', groupId: myGroup.id });
      await createSubmission({
        userId: user.uid,
        groupId: myGroup.id,
        groupName: myGroup.name,
        photoUrl,
        type: 'fun',
        eventId: event?.id,
      });
      setFunSubmitted(true);
    } catch (err) {
      console.error('Fun photo submit failed', err);
      setFunError('Could not share the photo. Please try again.');
    } finally {
      setFunSubmitting(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!event?.started) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Current stop</p>
          <h1 className="text-2xl font-semibold">—</h1>
        </div>
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Waiting for the leader to start the crawl…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Current stop</p>
        <h1 className="text-2xl font-semibold">{currentBar?.name ?? '—'}</h1>
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
          <p className="mt-2 text-slate-400 text-sm">Solo stop — no other group here this round.</p>
        )}
        {currentBar?.address && (
          <p className="mt-1 text-xs text-slate-500">{currentBar.address}</p>
        )}
      </section>

      {/* Challenges */}
      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
        <h2 className="text-xl font-semibold">Challenges</h2>
        {currentChallenges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No challenges for this stop.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {currentChallenges.map((ch) => {
              const alreadySubmitted = submittedIds.has(ch.id);
              const isOpen = uploadChallengeId === ch.id;
              return (
                <div key={ch.id} className="rounded-2xl bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{ch.title}</h3>
                        <span className="shrink-0 rounded-full bg-pink-500/20 px-2 py-0.5 text-xs text-pink-200">+{ch.points} pts</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{ch.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{ch.difficulty} · photo required</p>
                    </div>
                    {alreadySubmitted ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                        ✓ Done
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUploadChallengeId(isOpen ? null : ch.id)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          isOpen
                            ? 'border border-white/10 bg-white/10 text-slate-300'
                            : 'bg-gradient-to-r from-pink-500 to-violet-500 text-white'
                        }`}
                      >
                        {isOpen ? 'Cancel' : 'Submit'}
                      </button>
                    )}
                  </div>
                  {isOpen && !alreadySubmitted && currentBar && (
                    <UploadPanel
                      challengeId={ch.id}
                      barId={currentBar.id}
                      pointsAwarded={ch.points}
                      onSuccess={() => {
                        setUploadChallengeId(null);
                        setSubmittedIds((prev) => new Set(Array.from(prev).concat(ch.id)));
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fun camera — no submission, just capture a memory */}
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Just for fun</h2>
            <p className="text-xs text-slate-500 mt-0.5">Snap a photo — no submission, no points.</p>
          </div>
          <button
            type="button"
            onClick={() => funInputRef.current?.click()}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/20"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Open camera
          </button>
        </div>
        <input
          ref={funInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFunPhoto}
          className="hidden"
        />
      </section>

      {/* Fun photo fullscreen overlay */}
      {funPhotoUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
          <div className="flex items-center justify-between px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <p className="text-sm font-semibold text-slate-200">Memory</p>
            <button
              type="button"
              onClick={closeFunPhoto}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              Close
            </button>
          </div>
          <img
            src={funPhotoUrl}
            alt="Fun photo"
            className="min-h-0 flex-1 w-full object-contain"
          />
          <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {funError && <p className="mb-2 text-center text-xs text-rose-300">{funError}</p>}
            {funSubmitted ? (
              <p className="rounded-full border border-[rgba(45,212,191,.3)] bg-[rgba(45,212,191,.12)] px-4 py-3 text-center text-sm font-semibold text-[#2dd4bf]">
                ✓ Shared to the gallery — pending approval
              </p>
            ) : (
              <button
                type="button"
                onClick={handleFunSubmit}
                disabled={funSubmitting || !myGroup}
                className="w-full rounded-full bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)] px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {funSubmitting ? 'Sharing…' : !myGroup ? 'Join a group to share' : 'Share to gallery'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin-only: advance all groups */}
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
            <p className="mt-2 text-sm text-slate-400">This advances all groups simultaneously.</p>
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
