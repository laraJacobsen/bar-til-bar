'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createGroup, getGroups, type GroupDoc } from '@/lib/group';
import { getAllSubmissions, getActiveEvent, getEventById, getEvents, approveSubmission, rejectSubmission } from '@/lib/firestore';
import type { BarDoc, ChallengeDoc, EventDoc, SubmissionDoc } from '@/lib/types';

export default function AdminPage() {
  const [eventName, setEventName] = useState('Saturday Night Crawl');
  const [barName, setBarName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengePoints, setChallengePoints] = useState('50');
  const [challengeBarId, setChallengeBarId] = useState('');
  const [bars, setBars] = useState<BarDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [message, setMessage] = useState('');

  // Crawl Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [loadEventId, setLoadEventId] = useState('active-event');
  const [crawlName, setCrawlName] = useState('Saturday Night Crawl');
  const [startTime, setStartTime] = useState(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const tzOffset = nextHour.getTimezoneOffset() * 60000;
    return new Date(nextHour.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [durationHours, setDurationHours] = useState(6);
  const [numGroups, setNumGroups] = useState(4);
  const [wizardBars, setWizardBars] = useState<string[]>(['North Star', 'Velvet Room', 'Neon Tunnel', 'Starlight Lounge']);
  const [newWizardBar, setNewWizardBar] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; title?: string } | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ challenge: ChallengeDoc; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventDoc | null>(null);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [endEventConfirm, setEndEventConfirm] = useState(false);
  const [deleteEventCandidate, setDeleteEventCandidate] = useState<EventDoc | null>(null);

  const loadData = async () => {
    const barsSnap = await getDocs(collection(db, 'bars'));
    const groupsSnap = await getDocs(collection(db, 'groups'));
    const allSubs = await getAllSubmissions();
    const challengesSnap = await getDocs(collection(db, 'challenges'));
    const active = await getActiveEvent();
    const allEvents = await getEvents();
    
    const loadedBars = barsSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<BarDoc, 'id'>),
    })).sort((a, b) => a.order - b.order);

    setActiveEvent(active);
    setEvents(allEvents);
    setBars(active ? loadedBars.filter((b) => ((b as any).eventId === active.id)) : loadedBars);
    setGroups(groupsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<GroupDoc, 'id'>) })));
    setSubmissions(allSubs);
    const loadedChallenges = challengesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ChallengeDoc, 'id'>) }));
    setChallenges(active ? loadedChallenges.filter((c) => ((c as any).eventId === active.id)) : loadedChallenges);
  };

  const activateEvent = async (eventId: string) => {
    try {
      const startsAt = new Date().toISOString();
      await setDoc(doc(db, 'events', eventId), { status: 'active', startsAt, endsAt: undefined }, { merge: true });
      setMessage('Event activated.');
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'Failed to activate event');
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      // delete event and its associated bars/challenges/submissions
      const batch = writeBatch(db);
      const barsSnap = await getDocs(collection(db, 'bars'));
      const barsToDelete = barsSnap.docs.filter((d) => (d.data() as any).eventId === eventId);
      barsToDelete.forEach((docSnap) => batch.delete(docSnap.ref));

      const challengesSnap = await getDocs(collection(db, 'challenges'));
      const challengesToDelete = challengesSnap.docs.filter((d) => (d.data() as any).eventId === eventId);
      challengesToDelete.forEach((docSnap) => batch.delete(docSnap.ref));

      const submissionsSnap = await getDocs(collection(db, 'submissions'));
      const challengeIds = new Set(challengesToDelete.map((d) => d.id));
      const barIds = new Set(barsToDelete.map((d) => d.id));
      submissionsSnap.docs.forEach((docSnap) => {
        const s = docSnap.data() as SubmissionDoc;
        if (challengeIds.has(s.challengeId) || barIds.has(s.barId)) {
          batch.delete(docSnap.ref);
        }
      });

      batch.delete(doc(db, 'events', eventId));
      await batch.commit();
      setMessage('Event deleted.');
      setDeleteEventCandidate(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadEvent = async (eventId?: string) => {
    try {
      const id = eventId || loadEventId;
      if (!id) return setMessage('Provide an event id');
      const evDoc = await import('@/lib/firestore').then((m) => m.getEventById(id));
      if (!evDoc) return setMessage(`Event not found: ${id}`);
      setCrawlName(evDoc.name || '');
      if (evDoc.startsAt) {
        const dt = new Date(evDoc.startsAt);
        const tzOffset = dt.getTimezoneOffset() * 60000;
        setStartTime(new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16));
        if (evDoc.endsAt) {
          const dur = (new Date(evDoc.endsAt).getTime() - new Date(evDoc.startsAt).getTime()) / (1000 * 60 * 60);
          setDurationHours(Math.max(1, Math.round(dur)));
        }
      }

      // load bars for this event (global bars ordered by order)
      const barsModule = await import('firebase/firestore');
      const { collection, getDocs, query, orderBy } = barsModule;
      const barsSnap = await getDocs(query(collection(db, 'bars'), orderBy('order')));
      const loaded = barsSnap.docs.map((d) => (d.data() as any).name);
      if (loaded.length) setWizardBars(loaded);

      setShowWizard(true);
      setMessage(`Loaded event ${id}`);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'Failed to load event');
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
      // Only remove bars/challenges/submissions associated with the existing active event (if any).
      const batch = writeBatch(db);
      const existingActive = await getActiveEvent();

      if (existingActive) {
        // delete bars for this event
        const barsSnap = await getDocs(collection(db, 'bars'));
        const barsToDelete = barsSnap.docs.filter((d) => (d.data() as any).eventId === existingActive.id);
        barsToDelete.forEach((docSnap) => batch.delete(docSnap.ref));

        // delete challenges for this event
        const challengesSnap = await getDocs(collection(db, 'challenges'));
        const challengesToDelete = challengesSnap.docs.filter((d) => (d.data() as any).eventId === existingActive.id);
        challengesToDelete.forEach((docSnap) => batch.delete(docSnap.ref));

        // delete submissions that reference the deleted challenges or bars
        const submissionsSnap = await getDocs(collection(db, 'submissions'));
        const challengeIds = new Set(challengesToDelete.map((d) => d.id));
        const barIds = new Set(barsToDelete.map((d) => d.id));
        submissionsSnap.docs.forEach((docSnap) => {
          const s = docSnap.data() as SubmissionDoc;
          if (challengeIds.has(s.challengeId) || barIds.has(s.barId)) {
            batch.delete(docSnap.ref);
          }
        });

        await batch.commit();
      }

      const eventId = 'active-event';
      const startsAt = new Date(startTime).toISOString();
      const endsAt = new Date(new Date(startTime).getTime() + durationHours * 60 * 60 * 1000).toISOString();
      const newEvent: EventDoc = {
        id: eventId,
        name: crawlName.trim(),
        description: `A brand new bar crawl starting at ${new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        status: 'active',
        startsAt,
        endsAt,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'events', eventId), newEvent);

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
          eventId: eventId,
        });

        const challengeTitle = challengeTitles[idx % challengeTitles.length];
        const challengeId = `${barId}-${challengeTitle.toLowerCase().replace(/\s+/g, '-')}`;
        const challengeDoc: ChallengeDoc = {
          id: challengeId,
          barId: barId,
          title: challengeTitle,
          description: `Complete the ${challengeTitle} at ${barName}!`,
          points: (idx + 1) * 50,
          difficulty: idx % 2 === 0 ? 'easy' : 'medium',
          requiresPhoto: true,
          eventId: eventId,
        };
        await setDoc(doc(db, 'challenges', challengeId), challengeDoc);
      }

      const funGroupNames = [
        'Neon Crew',
        'Midnight Mix',
        'Velvet Crawlers',
        'Disco Divas',
        'Sip Chasers',
        'Rooftop Rangers',
        'Pub Pioneers',
        'Lounge Legends',
      ];

      for (let i = 0; i < numGroups; i++) {
        const gName = funGroupNames[i % funGroupNames.length] + (i >= funGroupNames.length ? ` ${Math.floor(i / funGroupNames.length) + 1}` : '');
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const groupId = gName.toLowerCase().replace(/\s+/g, '-');
        
        await setDoc(doc(db, 'groups', groupId), {
          id: groupId,
          name: gName,
          code,
          ownerId: 'admin',
          members: ['admin'],
          createdAt: new Date().toISOString(),
          color: ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][i % 6],
          currentBarIndex: 0,
          score: 0,
        });
      }

      await loadData();
      setShowWizard(false);
      setMessage(`Successfully initialized new crawl "${crawlName}" with ${wizardBars.length} stops and ${numGroups} groups!`);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'Failed to initialize crawl.');
    } finally {
      setIsInitializing(false);
    }
  };

  const saveEvent = async () => {
    const eventId = 'active-event';
    const event: EventDoc = {
      id: eventId,
      name: eventName,
      description: 'Admin-created event',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'events', eventId), event);
    setMessage('Event saved.');
  };

  const saveBar = async () => {
    if (!barName.trim()) return;
    const barId = barName.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'bars', barId), {
      id: barId,
      name: barName,
      address: 'TBD',
      description: 'Admin-created stop',
      order: bars.length + 1,
    });
    setBars((prev) => [...prev, { id: barId, name: barName, address: 'TBD', description: 'Admin-created stop', order: prev.length + 1 }]);
    setBarName('');
    setMessage('Bar added.');
  };

  const saveGroup = async () => {
    if (!groupName.trim()) return;
    const created = await createGroup({ name: groupName, ownerId: 'admin', color: '#8b5cf6' });
    setGroups((prev) => [...prev, created]);
    setGroupName('');
    setMessage(`Group created: ${created.name}`);
  };

  const saveChallenge = async () => {
    if (!challengeTitle.trim() || !challengeBarId) return;
    const challengeId = challengeTitle.toLowerCase().replace(/\s+/g, '-');
    const challenge: ChallengeDoc = {
      id: challengeId,
      barId: challengeBarId,
      title: challengeTitle,
      description: 'Admin-created challenge',
      points: Number(challengePoints) || 50,
      difficulty: 'easy',
      requiresPhoto: true,
    };
    await setDoc(doc(db, 'challenges', challengeId), challenge);
    setChallengeTitle('');
    setChallengePoints('50');
    setChallenges((prev) => [...prev, challenge]);
    setMessage('Challenge added.');
  };

  const removeChallenge = (challengeId: string, title?: string) => {
    setDeleteCandidate({ id: challengeId, title });
  };

  const performDeleteChallenge = async () => {
    if (!deleteCandidate) return;
    const id = deleteCandidate.id;
    const ch = challenges.find((c) => c.id === id) as ChallengeDoc | undefined;

    // Optimistically remove from UI and show undo snackbar; schedule permanent delete
    setChallenges((prev) => prev.filter((c) => c.id !== id));
    setDeleteCandidate(null);

    const timeoutId = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, 'challenges', id));
        setMessage('Challenge permanently removed.');
      } catch (err) {
        console.error(err);
        setMessage(err instanceof Error ? err.message : 'Failed to remove challenge');
      } finally {
        setRecentlyDeleted(null);
      }
    }, 8000);

    if (ch) {
      setRecentlyDeleted({ challenge: ch, timeoutId });
    } else {
      // If we didn't have the challenge locally, still schedule deletion but no undo
      setRecentlyDeleted(null);
    }
  };

  const undoDelete = () => {
    if (!recentlyDeleted) return;
    clearTimeout(recentlyDeleted.timeoutId);
    setChallenges((prev) => [recentlyDeleted.challenge, ...prev]);
    setRecentlyDeleted(null);
    setMessage('Delete undone.');
  };

  const endCrawl = async () => {
    if (!activeEvent) return;
    try {
      const updated: EventDoc = { ...activeEvent, status: 'ended', endsAt: new Date().toISOString() };
      await setDoc(doc(db, 'events', activeEvent.id), updated, { merge: true });
      setMessage('Crawl ended.');
      setActiveEvent(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'Failed to end crawl');
    } finally {
      setEndEventConfirm(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    try {
      await approveSubmission(submissionId);
      setSubmissions((prev) => prev.map((s) => s.id === submissionId ? { ...s, status: 'approved' as const } : s));
      setMessage('Submission approved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to approve submission');
    }
  };

  const handleReject = async (submission: (typeof submissions)[number]) => {
    try {
      await rejectSubmission(submission.id, submission.groupId, submission.pointsAwarded ?? 0);
      setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, status: 'rejected' as const } : s));
      setMessage(`Submission rejected.${submission.pointsAwarded ? ` −${submission.pointsAwarded} pts deducted.` : ''}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to reject submission');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Admin</p>
          <h1 className="text-2xl font-semibold">Control center</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm">Back</Link>
      </div>

      {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}

      <section className="rounded-[1rem] border border-white/10 bg-slate-900/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Events</h3>
          <span className="text-xs text-slate-400">Manage created events</span>
        </div>
        <div className="mt-3 space-y-2">
          {events.length ? events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-3">
              <div>
                <p className="font-semibold">{ev.name}</p>
                <p className="text-xs text-slate-400">{ev.status} • {ev.startsAt ? new Date(ev.startsAt).toLocaleString() : 'No start set'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => loadEvent(ev.id)} className="rounded-full border border-white/10 px-3 py-1 text-sm">Load</button>
                {ev.status !== 'active' ? (
                  <button onClick={() => activateEvent(ev.id)} className="rounded-full bg-emerald-600 px-3 py-1 text-sm text-white">Activate</button>
                ) : (
                  <button onClick={() => { setActiveEvent(ev); setEndEventConfirm(true); }} className="rounded-full bg-rose-500 px-3 py-1 text-sm text-white">End</button>
                )}
                <button onClick={() => setDeleteEventCandidate(ev)} className="rounded-full border border-white/10 px-3 py-1 text-sm text-rose-300">Delete</button>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-3 text-sm text-slate-400">No events yet.</div>
          )}
        </div>
      </section>

      {/* Crawl Wizard Trigger & Panel */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-pink-500/20 via-brand-500/20 to-violet-500/20 p-6 shadow-glow backdrop-blur-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-violet-300">Crawl Creator Wizard</h2>
            <p className="mt-1 text-sm text-slate-400">Instantly create and launch a new bar crawl event with custom groups, start times, and routes.</p>
          </div>
          {!showWizard && (
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setShowWizard(true)}
                disabled={isInitializing || Boolean(activeEvent && activeEvent.status === 'active' && (!activeEvent.startsAt || new Date(activeEvent.startsAt).getTime() <= Date.now()))}
                className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-5 py-2.5 text-sm font-semibold shadow-md transition duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚀 Make New Bar Crawl
              </button>
              {activeEvent && activeEvent.status === 'active' ? (
                <button onClick={() => setEndEventConfirm(true)} className="rounded-full border border-white/10 bg-rose-600/10 px-4 py-2 text-sm text-rose-200">End Crawl</button>
              ) : null}
              <div className="flex items-center gap-2">
                <input value={loadEventId} onChange={(e) => setLoadEventId(e.target.value)} placeholder="event id (active-event)" className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white" />
                <button onClick={() => loadEvent()} className="rounded-full border border-white/10 px-3 py-2 text-sm">Load</button>
              </div>
            </div>
          )}
        </div>

        {showWizard && (
          <div className="mt-6 border-t border-white/10 pt-6 space-y-5 animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Crawl Event Name</label>
                <input
                  value={crawlName}
                  onChange={(e) => setCrawlName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 transition text-sm text-white"
                  placeholder="Saturday Night Crawl"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Number of Groups</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={numGroups}
                  onChange={(e) => setNumGroups(Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 transition text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 transition text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Duration (Hours)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="flex-1 accent-pink-500"
                  />
                  <span className="text-sm font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5 w-16 text-center">{durationHours} hrs</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Route Stops (Bars in sequence)</label>
              <div className="flex gap-2 mb-3">
                <input
                  value={newWizardBar}
                  onChange={(e) => setNewWizardBar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWizardBar(); } }}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 outline-none focus:border-pink-500 transition text-sm text-white"
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
                <p className="text-xs text-amber-300/80 italic">Add at least one stop to launch the crawl.</p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-950/50 rounded-2xl border border-white/5">
                  {wizardBars.map((bar, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-full pl-3 pr-2 py-1 text-xs text-slate-200">
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
                className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-5 py-3 font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg"
              >
                {isInitializing ? 'Initializing Crawl...' : '🚀 Initialize New Bar Crawl'}
              </button>
              <button
                type="button"
                disabled={isInitializing}
                onClick={() => setShowWizard(false)}
                className="rounded-full border border-white/10 bg-slate-900/60 hover:bg-slate-900 px-5 py-3 text-sm font-semibold transition text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Manual Fine-Tuning Setup Accordion/Sections */}
      <div className="border border-white/10 rounded-[2rem] bg-white/5 overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer p-5 select-none hover:bg-white/5 transition duration-200">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Manual Fine-Tuning (Advanced Settings)</span>
            <span className="transition group-open:rotate-180">
              <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" className="text-slate-400"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <div className="p-5 border-t border-white/10 space-y-6">
            <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <h2 className="text-base font-semibold">Event Name Setup</h2>
              <div className="mt-3 flex gap-2">
                <input value={eventName} onChange={(event) => setEventName(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-sm text-white" placeholder="Event name" />
                <button onClick={saveEvent} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition">Save event</button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <h2 className="text-base font-semibold">Add Individual Bar Stop</h2>
              <div className="mt-3 flex gap-2">
                <input value={barName} onChange={(event) => setBarName(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-sm text-white" placeholder="Bar name" />
                <button onClick={saveBar} className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition">Add bar</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {bars.map((bar) => <div key={bar.id} className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs">{bar.name}</div>)}
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <h2 className="text-base font-semibold">Add Custom Group</h2>
              <div className="mt-3 flex gap-2">
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-sm text-white" placeholder="Group name" />
                <button onClick={saveGroup} className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 transition">Add group</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {groups.map((group) => <div key={group.id} className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs">{group.name}</div>)}
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <h2 className="text-base font-semibold">Add Custom Challenge</h2>
              <div className="mt-3 space-y-3">
                <input value={challengeTitle} onChange={(event) => setChallengeTitle(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-sm text-white" placeholder="Challenge title" />
                <div className="flex gap-2">
                  <input value={challengePoints} onChange={(event) => setChallengePoints(event.target.value)} className="w-24 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-sm text-white" placeholder="Points" />
                  <select value={challengeBarId} onChange={(event) => setChallengeBarId(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-sm text-white">
                    <option value="">Select a bar</option>
                    {bars.map((bar) => <option key={bar.id} value={bar.id}>{bar.name}</option>)}
                  </select>
                </div>
                <button onClick={saveChallenge} className="rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 transition">Add challenge</button>
              </div>
            </section>
          </div>
        </details>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Challenges (by bar)</h2>
        <p className="mt-2 text-sm text-slate-400">View and remove challenges assigned to each bar.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {bars.map((bar) => {
            const barChallenges = challenges.filter((c) => c.barId === bar.id);
            return (
              <div key={bar.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{bar.name}</p>
                    <h4 className="text-lg font-semibold">{barChallenges.length} challenges</h4>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {barChallenges.length ? barChallenges.map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/80 p-3">
                      <div>
                        <p className="font-semibold">{ch.title}</p>
                        <p className="text-sm text-slate-400">{ch.points} pts • {ch.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeChallenge(ch.id)} className="text-sm rounded-full bg-rose-600/10 px-3 py-1 text-rose-300 border border-rose-600/20">Delete</button>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed border-white/15 bg-slate-900/50 p-3 text-sm text-slate-400">No challenges for this bar.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <h2 className="mt-6 text-xl font-semibold">Approval queue</h2>
        <p className="mt-2 text-sm text-slate-400">Points are awarded on submission and deducted on rejection.</p>
        {submissions.filter((s) => s.status === 'pending').length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-4 text-sm text-slate-400">
            No pending submissions yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {submissions.filter((s) => s.status === 'pending').map((submission) => {
              const group = groups.find((g) => g.id === submission.groupId);
              return (
                <div key={submission.id} className="rounded-2xl bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{group?.name ?? submission.groupId}</p>
                      <p className="text-sm text-slate-400">{submission.challengeId} · {submission.barId}</p>
                      <p className="text-xs text-slate-500">{new Date(submission.createdAt).toLocaleString()}</p>
                    </div>
                    {submission.pointsAwarded ? (
                      <span className="rounded-full bg-yellow-500/15 px-2 py-1 text-xs text-yellow-200">+{submission.pointsAwarded} pts</span>
                    ) : null}
                  </div>
                  {submission.photoUrl ? <img src={submission.photoUrl} alt="Submission" className="mt-3 h-48 w-full rounded-2xl object-cover" /> : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(submission.id)}
                      className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
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
        {submissions.filter((s) => s.status !== 'pending').length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Reviewed</h3>
            <div className="mt-3 space-y-2">
              {submissions.filter((s) => s.status !== 'pending').map((submission) => {
                const group = groups.find((g) => g.id === submission.groupId);
                return (
                  <div key={submission.id} className="rounded-2xl bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{group?.name ?? submission.groupId}</p>
                        <p className="text-sm text-slate-400">{submission.challengeId}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${submission.status === 'approved' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
                        {submission.status}
                      </span>
                    </div>
                    {submission.photoUrl ? <img src={submission.photoUrl} alt="Submission" className="mt-3 h-24 w-full rounded-2xl object-cover" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {deleteCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteCandidate(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900/90 p-6 border border-white/10">
            <h3 className="text-lg font-semibold">Delete challenge</h3>
            <p className="mt-2 text-sm text-slate-400">Are you sure you want to delete <strong>{deleteCandidate.title || deleteCandidate.id}</strong>? This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeleteCandidate(null)} className="rounded-full border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button onClick={performDeleteChallenge} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
      {endEventConfirm && activeEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEndEventConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900/90 p-6 border border-white/10">
            <h3 className="text-lg font-semibold">End current crawl</h3>
            <p className="mt-2 text-sm text-slate-400">Are you sure you want to end the crawl <strong>{activeEvent.name}</strong>? This will stop progression and archive the event.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setEndEventConfirm(false)} className="rounded-full border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button onClick={endCrawl} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">End crawl</button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteEventCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteEventCandidate(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900/90 p-6 border border-white/10">
            <h3 className="text-lg font-semibold">Delete event</h3>
            <p className="mt-2 text-sm text-slate-400">Delete <strong>{deleteEventCandidate.name}</strong> and all its data? This will remove bars, challenges, and submissions for this event.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeleteEventCandidate(null)} className="rounded-full border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => deleteEvent(deleteEventCandidate.id)} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
      {recentlyDeleted ? (
        <div className="fixed left-1/2 bottom-6 z-50 -translate-x-1/2">
          <div className="rounded-full bg-slate-900/95 px-4 py-2 text-sm flex items-center gap-3 border border-white/10">
            <div className="text-slate-200">Deleted {recentlyDeleted.challenge.title}</div>
            <button onClick={undoDelete} className="text-sm text-white bg-emerald-600/90 rounded-full px-3 py-1">Undo</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
