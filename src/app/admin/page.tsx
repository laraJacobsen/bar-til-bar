'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { collection, doc, deleteDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type GroupDoc, recalculateSchedule } from '@/lib/group';
import { getAllSubmissions, getChallenges, getEvents, approveSubmission, rejectSubmission, archiveCrawl } from '@/lib/firestore';
import type { BarDoc, ChallengeDoc, EventDoc, SubmissionDoc } from '@/lib/types';

export default function AdminPage() {
  const [bars, setBars] = useState<BarDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [message, setMessage] = useState('');
  const [activeEvent, setActiveEvent] = useState<EventDoc | null>(null);

  // Inline edit (name + times only — stops are immutable after creation)
  const [editingTimes, setEditingTimes] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editDurationHours, setEditDurationHours] = useState(6);
  const [isSaving, setIsSaving] = useState(false);

  // Create wizard (only visible when no active crawl)
  const [showWizard, setShowWizard] = useState(false);
  const [crawlName, setCrawlName] = useState('Saturday Night Crawl');
  const [startTime, setStartTime] = useState(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const tzOffset = nextHour.getTimezoneOffset() * 60000;
    return new Date(nextHour.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [durationHours, setDurationHours] = useState(6);
const [wizardBars, setWizardBars] = useState<string[]>(['North Star', 'Velvet Room', 'Neon Tunnel', 'Starlight Lounge']);
  const [newWizardBar, setNewWizardBar] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  // End crawl confirmation
  const [endConfirm, setEndConfirm] = useState(false);

  // Photo gallery drill-down
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Auto-refresh while in the waiting room
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = async () => {
    const [barsSnap, groupsSnap, allSubs, allEvents, allChallenges] = await Promise.all([
      getDocs(collection(db, 'bars')),
      getDocs(collection(db, 'groups')),
      getAllSubmissions(),
      getEvents(),
      getChallenges(),
    ]);

    let active =
      allEvents
        .filter((e) => e.status === 'active')
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

    if (active && !active.joinCode) {
      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      await setDoc(doc(db, 'events', active.id), { joinCode }, { merge: true });
      active = { ...active, joinCode };
    }
    setActiveEvent(active);

    const loadedBars = barsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<BarDoc, 'id'>) }))
      .sort((a, b) => a.order - b.order);
    setBars(active ? loadedBars.filter((b) => (b as any).eventId === active.id) : []);

    const loadedGroups = groupsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GroupDoc, 'id'>) }));
    setGroups(active ? loadedGroups.filter((g) => g.eventId === active.id || !g.eventId) : []);

    setSubmissions(active ? allSubs.filter((s) => s.eventId === active.id || !s.eventId) : []);
    setChallenges(active ? allChallenges.filter((c) => (c as any).eventId === active.id || !(c as any).eventId) : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll every 8s while crawl hasn't started so new groups appear automatically
  useEffect(() => {
    if (activeEvent && !activeEvent.started) {
      autoRefreshRef.current = setInterval(loadData, 8000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [activeEvent?.id, activeEvent?.started]);

  // Deletes event + all associated bars, challenges, groups, and submissions
  const deleteEventFull = async (eventId: string) => {
    const [barsSnap, challengesSnap, groupsSnap] = await Promise.all([
      getDocs(collection(db, 'bars')),
      getDocs(collection(db, 'challenges')),
      getDocs(collection(db, 'groups')),
    ]);

    const batch = writeBatch(db);

    barsSnap.docs.filter((d) => (d.data() as any).eventId === eventId).forEach((d) => batch.delete(d.ref));
    challengesSnap.docs.filter((d) => (d.data() as any).eventId === eventId).forEach((d) => batch.delete(d.ref));
    groupsSnap.docs.filter((d) => (d.data() as any).eventId === eventId).forEach((d) => batch.delete(d.ref));

    batch.delete(doc(db, 'events', eventId));
    await batch.commit();
  };

  const endAndDeleteCrawl = async () => {
    if (!activeEvent) return;
    try {
      // Archive permanently first, then mark event ended
      await archiveCrawl(activeEvent.id, activeEvent.name);
      setActiveEvent(null);
      setGroups([]);
      setBars([]);
      setSubmissions([]);
      setMessage('Crawl ended! Results saved permanently to all participants\' profiles.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to end crawl');
    } finally {
      setEndConfirm(false);
    }
  };

  const kickGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeEvent) await recalculateSchedule(activeEvent.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to remove group');
    }
  };

  const startCrawl = async () => {
    if (!activeEvent) return;
    try {
      await recalculateSchedule(activeEvent.id);
      await setDoc(doc(db, 'events', activeEvent.id), { started: true }, { merge: true });
      await loadData();
      setMessage('Crawl started! Groups are on their way.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to start crawl');
    }
  };

  const openEditTimes = () => {
    if (!activeEvent) return;
    setEditName(activeEvent.name);
    if (activeEvent.startsAt) {
      const dt = new Date(activeEvent.startsAt);
      const tzOffset = dt.getTimezoneOffset() * 60000;
      setEditStartTime(new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16));
      if (activeEvent.endsAt) {
        const dur = (new Date(activeEvent.endsAt).getTime() - dt.getTime()) / (1000 * 60 * 60);
        setEditDurationHours(Math.max(1, Math.round(dur)));
      }
    }
    setEditingTimes(true);
  };

  const saveTimesEdit = async () => {
    if (!activeEvent) return;
    setIsSaving(true);
    try {
      const startsAt = new Date(editStartTime).toISOString();
      const endsAt = new Date(new Date(editStartTime).getTime() + editDurationHours * 60 * 60 * 1000).toISOString();
      await setDoc(doc(db, 'events', activeEvent.id), { name: editName, startsAt, endsAt }, { merge: true });
      setEditingTimes(false);
      await loadData();
      setMessage('Crawl updated.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update crawl');
    } finally {
      setIsSaving(false);
    }
  };

  const addWizardBar = () => {
    if (!newWizardBar.trim()) return;
    setWizardBars((prev) => [...prev, newWizardBar.trim()]);
    setNewWizardBar('');
  };

  const removeWizardBar = (index: number) => {
    setWizardBars((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleInitializeCrawl = async () => {
    if (wizardBars.length === 0 || !crawlName.trim()) return;
    setIsInitializing(true);
    setMessage('');
    try {
      const eventId = 'active-event';
      const startsAt = new Date(startTime).toISOString();
      const endsAt = new Date(new Date(startTime).getTime() + durationHours * 60 * 60 * 1000).toISOString();
      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      await setDoc(doc(db, 'events', eventId), {
        id: eventId,
        name: crawlName.trim(),
        description: '',
        status: 'active',
        startsAt,
        endsAt,
        createdAt: new Date().toISOString(),
        joinCode,
      });

      const challengeTitles = [
        'Group selfie',
        'Human pyramid photo',
        'Find someone wearing red photo',
        'Team cheers video',
        'Imitate a famous painting photo',
      ];

      for (let idx = 0; idx < wizardBars.length; idx++) {
        const barName = wizardBars[idx];
        const barId = barName.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'bars', barId), {
          id: barId,
          name: barName,
          address: `${10 + idx * 12} Market St`,
          description: `Stop #${idx + 1} on the crawl`,
          order: idx + 1,
          eventId,
        });
        const challengeTitle = challengeTitles[idx % challengeTitles.length];
        const challengeId = `${barId}-${challengeTitle.toLowerCase().replace(/\s+/g, '-')}`;
        await setDoc(doc(db, 'challenges', challengeId), {
          id: challengeId,
          barId,
          title: challengeTitle,
          description: `Complete the ${challengeTitle} at ${barName}!`,
          points: (idx + 1) * 50,
          difficulty: idx % 2 === 0 ? 'easy' : 'medium',
          requiresPhoto: true,
          eventId,
        });
      }

      await loadData();
      setShowWizard(false);
      setMessage(`Initialized "${crawlName}" with ${wizardBars.length} stops. Participants can now create and join groups.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to initialize crawl.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    try {
      await approveSubmission(submissionId);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, status: 'approved' as const } : s)),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (submission: SubmissionDoc) => {
    try {
      await rejectSubmission(submission.id, submission.groupId, submission.pointsAwarded ?? 0);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submission.id ? { ...s, status: 'rejected' as const } : s)),
      );
      setMessage(`Rejected.${submission.pointsAwarded ? ` −${submission.pointsAwarded} pts deducted.` : ''}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Admin</p>
          <h1 className="text-2xl font-semibold">Control center</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm">
          Back
        </Link>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {/* Active crawl card or create wizard */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-pink-500/20 via-brand-500/20 to-violet-500/20 p-6 shadow-glow">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-violet-300">
              {activeEvent ? activeEvent.name : 'No Active Crawl'}
            </h2>
            {activeEvent ? (
              <p className="mt-1 text-sm text-slate-400">
                {activeEvent.startsAt ? new Date(activeEvent.startsAt).toLocaleString() : '—'}
                {activeEvent.endsAt ? ` → ${new Date(activeEvent.endsAt).toLocaleString()}` : ''}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Create a crawl to get started.</p>
            )}
          </div>

          {activeEvent && !editingTimes && (
            <div className="flex gap-2">
              <button
                onClick={openEditTimes}
                className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
              >
                Edit
              </button>
              {!activeEvent.started ? (
                <button
                  onClick={startCrawl}
                  className="rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  Start Crawl
                </button>
              ) : (
                <button
                  onClick={() => setEndConfirm(true)}
                  className="rounded-full bg-rose-500/80 hover:bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  End Crawl
                </button>
              )}
            </div>
          )}

          {!activeEvent && !showWizard && (
            <button
              onClick={() => setShowWizard(true)}
              className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-5 py-2.5 text-sm font-semibold shadow-md transition text-white"
            >
              🚀 New Bar Crawl
            </button>
          )}
        </div>

        {/* Join code — shown first so it's easy to share */}
        {activeEvent && !editingTimes && activeEvent.joinCode && (
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-violet-300 font-semibold">Crawl code</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-white mt-0.5">{activeEvent.joinCode}</p>
            </div>
            <p className="text-xs text-slate-400 text-right max-w-[110px] leading-relaxed">Share with participants to join this crawl.</p>
          </div>
        )}

        {/* Waiting room — groups that have joined, shown before crawl starts */}
        {activeEvent && !activeEvent.started && !editingTimes && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-300">Groups joined ({groups.length})</p>
              <span className="text-xs text-slate-600">auto-refreshing</span>
            </div>
            {groups.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No groups yet. Share the crawl code above.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ background: g.color ?? '#f43f5e' }} />
                      <div>
                        <p className="font-medium leading-tight">{g.name}</p>
                        <p className="text-xs text-slate-500">{g.members.length} {g.members.length === 1 ? 'person' : 'people'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => kickGroup(g.id)}
                      className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500">Press <strong className="text-slate-300">Start Crawl</strong> when everyone is in. Routes are calculated at that point.</p>
          </div>
        )}

        {/* Stops list */}
        {activeEvent && bars.length > 0 && !editingTimes && (
          <div className="mt-4 flex flex-wrap gap-2">
            {bars.map((bar, idx) => (
              <span
                key={bar.id}
                className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs text-slate-300"
              >
                <span className="text-pink-400 font-semibold mr-1">{idx + 1}.</span>
                {bar.name}
              </span>
            ))}
          </div>
        )}

        {/* Inline edit form — name and times only */}
        {editingTimes && (
          <div className="mt-5 border-t border-white/10 pt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Crawl Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Duration: {editDurationHours} hrs
              </label>
              <input
                type="range"
                min="1"
                max="24"
                value={editDurationHours}
                onChange={(e) => setEditDurationHours(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveTimesEdit}
                disabled={isSaving}
                className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-pink-600 hover:to-violet-600 transition disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingTimes(false)}
                className="rounded-full border border-white/10 bg-slate-900/60 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Create wizard */}
        {showWizard && !activeEvent && (
          <div className="mt-6 border-t border-white/10 pt-6 space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Crawl Name
              </label>
              <input
                value={crawlName}
                onChange={(e) => setCrawlName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 text-sm text-white"
                placeholder="Saturday Night Crawl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Duration
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="flex-1 accent-pink-500"
                  />
                  <span className="text-sm font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5 w-16 text-center">
                    {durationHours} hrs
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Route Stops
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  value={newWizardBar}
                  onChange={(e) => setNewWizardBar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addWizardBar();
                    }
                  }}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 text-sm text-white"
                  placeholder="e.g. Neon Tunnel"
                />
                <button
                  type="button"
                  onClick={addWizardBar}
                  className="rounded-2xl bg-white text-slate-900 font-semibold px-4 hover:bg-slate-200 transition text-sm shrink-0"
                >
                  Add Stop
                </button>
              </div>
              {wizardBars.length === 0 ? (
                <p className="text-xs text-amber-300/80 italic">Add at least one stop.</p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-950/50 rounded-2xl border border-white/5">
                  {wizardBars.map((bar, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-full pl-3 pr-2 py-1 text-xs text-slate-200"
                    >
                      <span className="font-semibold text-pink-400">{idx + 1}.</span>
                      <span>{bar}</span>
                      <button
                        type="button"
                        onClick={() => removeWizardBar(idx)}
                        className="text-slate-400 hover:text-rose-400 transition ml-1 font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                disabled={isInitializing || wizardBars.length === 0}
                onClick={handleInitializeCrawl}
                className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-5 py-3 font-semibold text-white transition disabled:opacity-50 text-sm"
              >
                {isInitializing ? 'Initializing…' : '🚀 Initialize Bar Crawl'}
              </button>
              <button
                type="button"
                onClick={() => setShowWizard(false)}
                className="rounded-full border border-white/10 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-900 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Approval queue */}
      {activeEvent && (
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Approval Queue</h2>
          <p className="mt-1 text-sm text-slate-400">Points are awarded on submission; deducted on rejection.</p>
          {pendingSubmissions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-4 text-sm text-slate-400">
              No pending submissions.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingSubmissions.map((submission) => {
                const group = groups.find((g) => g.id === submission.groupId);
                const challenge = challenges.find((c) => c.id === submission.challengeId);
                const bar = bars.find((b) => b.id === submission.barId);
                return (
                  <div key={submission.id} className="rounded-2xl bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{group?.name ?? submission.groupName ?? 'Unknown group'}</p>
                        <p className="text-sm text-slate-300 mt-0.5">
                          {challenge?.title ?? submission.challengeId}
                        </p>
                        <p className="text-xs text-slate-500">
                          {bar?.name ?? submission.barId} · {new Date(submission.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {submission.pointsAwarded ? (
                        <span className="rounded-full bg-yellow-500/15 px-2 py-1 text-xs text-yellow-200">
                          +{submission.pointsAwarded} pts
                        </span>
                      ) : null}
                    </div>
                    {submission.photoUrl ? (
                      <img
                        src={submission.photoUrl}
                        alt="Submission"
                        className="mt-3 h-48 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(submission)}
                        className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
                      >
                        Reject{submission.pointsAwarded ? ` (−${submission.pointsAwarded} pts)` : ''}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Photo gallery grouped by team */}
      {activeEvent && groups.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Photos by Group</h2>
          <p className="mt-1 text-sm text-slate-400">Click a group to view their submissions.</p>
          <div className="mt-4 space-y-2">
            {groups.map((group) => {
              const groupSubs = submissions.filter((s) => s.groupId === group.id && s.photoUrl);
              const isExpanded = expandedGroupId === group.id;
              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ background: group.color ?? '#f43f5e' }}
                      />
                      <span className="font-semibold">{group.name}</span>
                      <span className="text-xs text-slate-400">
                        {groupSubs.length} photo{groupSubs.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-slate-500">· {group.score ?? 0} pts</span>
                    </div>
                    <span className="text-slate-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {groupSubs.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No photos yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {groupSubs.map((sub) => (
                            <div key={sub.id} className="rounded-xl overflow-hidden relative">
                              <img
                                src={sub.photoUrl}
                                alt={sub.challengeId}
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
                                {sub.challengeId}
                              </div>
                              <span
                                className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-500/90'
                                    : sub.status === 'rejected'
                                    ? 'bg-rose-500/90'
                                    : 'bg-yellow-500/90'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* End crawl confirmation modal */}
      {endConfirm && activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEndConfirm(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-slate-900/90 p-6 border border-white/10">
            <h3 className="text-lg font-semibold">End crawl?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will save <strong>{activeEvent.name}</strong> permanently to all participants&apos; profiles and redirect everyone to the summary screen.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setEndConfirm(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={endAndDeleteCrawl}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition"
              >
                End &amp; Save Results
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
