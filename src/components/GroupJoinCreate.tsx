'use client';

import { useState } from 'react';
import { createGroup, joinGroup, type GroupDoc } from '@/lib/group';

// Lets an already-signed-in user create or join a group for the active event.
// Rendered only before the crawl starts (the parent gates on !event.started).
export function GroupJoinCreate({
  eventId,
  userId,
  onSuccess,
}: {
  eventId: string;
  userId: string;
  onSuccess?: (group: GroupDoc) => void;
}) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (mode === 'create' && !groupName.trim()) {
      setError('Please name your group.');
      return;
    }
    if (mode === 'join' && !code.trim()) {
      setError('Please enter the group code.');
      return;
    }

    setBusy(true);
    try {
      const group =
        mode === 'create'
          ? await createGroup({ name: groupName.trim(), ownerId: userId, eventId })
          : await joinGroup({ code: code.trim(), userId, eventId });
      setGroupName('');
      setCode('');
      onSuccess?.(group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const tab = (active: boolean) =>
    `rounded-full py-2 text-xs font-semibold transition ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-sm font-semibold text-slate-200">Join the crawl</p>
      <p className="mt-0.5 text-xs text-slate-500">Create your own group or join one with a code.</p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-full border border-white/5 bg-slate-950/60 p-1">
        <button type="button" onClick={() => setMode('create')} className={tab(mode === 'create')}>
          Make group
        </button>
        <button type="button" onClick={() => setMode('join')} className={tab(mode === 'join')}>
          Join group
        </button>
      </div>

      {mode === 'create' ? (
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Neon Crew"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm outline-none focus:border-pink-500"
        />
      ) : (
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="ABC123"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm uppercase tracking-widest outline-none focus:border-pink-500"
        />
      )}

      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-pink-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? 'Working…' : mode === 'create' ? 'Create group' : 'Join group'}
      </button>
    </div>
  );
}
