'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { addDoc, collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createGroup, getGroups, type GroupDoc } from '@/lib/group';
import type { BarDoc, ChallengeDoc, EventDoc } from '@/lib/types';

export default function AdminPage() {
  const [eventName, setEventName] = useState('Saturday Night Crawl');
  const [barName, setBarName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengePoints, setChallengePoints] = useState('50');
  const [challengeBarId, setChallengeBarId] = useState('');
  const [bars, setBars] = useState<BarDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const barsSnap = await getDocs(collection(db, 'bars'));
      const groupsSnap = await getDocs(collection(db, 'groups'));
      setBars(barsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<BarDoc, 'id'>) })));
      setGroups(groupsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<GroupDoc, 'id'>) })));
    };

    loadData();
  }, []);

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
    setMessage('Challenge added.');
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

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/20 to-violet-500/20 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Event setup</h2>
        <div className="mt-4 space-y-3">
          <input value={eventName} onChange={(event) => setEventName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3" placeholder="Event name" />
          <button onClick={saveEvent} className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900">Save event</button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Create bars</h2>
        <div className="mt-4 flex gap-2">
          <input value={barName} onChange={(event) => setBarName(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3" placeholder="Bar name" />
          <button onClick={saveBar} className="rounded-full bg-brand-500 px-4 py-2 font-semibold">Add bar</button>
        </div>
        <div className="mt-3 space-y-2">
          {bars.map((bar) => <div key={bar.id} className="rounded-2xl bg-slate-900/60 p-3 text-sm">{bar.name}</div>)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Create groups</h2>
        <div className="mt-4 flex gap-2">
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3" placeholder="Group name" />
          <button onClick={saveGroup} className="rounded-full bg-violet-500 px-4 py-2 font-semibold">Add group</button>
        </div>
        <div className="mt-3 space-y-2">
          {groups.map((group) => <div key={group.id} className="rounded-2xl bg-slate-900/60 p-3 text-sm">{group.name}</div>)}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Create challenges</h2>
        <div className="mt-4 space-y-3">
          <input value={challengeTitle} onChange={(event) => setChallengeTitle(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3" placeholder="Challenge title" />
          <div className="flex gap-2">
            <input value={challengePoints} onChange={(event) => setChallengePoints(event.target.value)} className="w-24 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3" placeholder="Points" />
            <select value={challengeBarId} onChange={(event) => setChallengeBarId(event.target.value)} className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <option value="">Select a bar</option>
              {bars.map((bar) => <option key={bar.id} value={bar.id}>{bar.name}</option>)}
            </select>
          </div>
          <button onClick={saveChallenge} className="rounded-full bg-pink-500 px-4 py-2 font-semibold">Add challenge</button>
        </div>
      </section>
    </main>
  );
}
