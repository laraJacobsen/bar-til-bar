'use client';

import { useState } from 'react';
import { createGroup, joinGroup, type GroupDoc } from '@/lib/group';

// Lets an already-signed-in user create OR join a group for the active event, from
// inside the app (rendered on Home when the user has no group yet). Both options are
// always available — a group created after the crawl has started simply follows the
// default bar order (no route in the round-robin schedule), which the app handles.
export function GroupJoinCreate({
  eventId,
  userId,
  onSuccess,
}: {
  eventId: string;
  userId: string;
  onSuccess?: (group: GroupDoc) => void;
}) {
  const [mode, setMode] = useState<'create' | 'join'>('join');
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
    `rounded-full py-2 text-[13px] font-bold transition ${
      active ? 'bg-[rgba(255,90,168,.15)] text-[#ff5aa8]' : 'text-[#9b95ad] hover:text-[#f4f2f8]'
    }`;

  return (
    <div className="rounded-[18px] border border-white/[.06] bg-white/[.03] p-4">
      <p className="text-[15px] font-bold text-[#f4f2f8]">Join the crawl</p>
      <p className="mt-0.5 text-[12.5px] text-[#9b95ad]">
        {mode === 'create' ? 'Name your crew and rally your friends.' : 'Enter the group code from your crew.'}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-full border border-white/[.06] bg-black/20 p-1">
        <button type="button" onClick={() => setMode('join')} className={tab(mode === 'join')}>
          Join group
        </button>
        <button type="button" onClick={() => setMode('create')} className={tab(mode === 'create')}>
          Make group
        </button>
      </div>

      {mode === 'create' ? (
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Neon Crew"
          className="mt-3 w-full rounded-2xl border border-white/[.055] bg-white/[.028] px-4 py-3.5 text-[15px] font-semibold text-[#f4f2f8] outline-none placeholder:text-[#6a637f] focus:border-[#ff5aa8]"
        />
      ) : (
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="ABC123"
          className="mt-3 w-full rounded-2xl border border-white/[.055] bg-white/[.028] px-4 py-3.5 text-[15px] font-semibold uppercase tracking-[3px] text-[#f4f2f8] outline-none placeholder:text-[#6a637f] focus:border-[#ff5aa8]"
        />
      )}

      {error ? <p className="mt-2 text-[13px] font-semibold text-[#ff5aa8]">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-2xl bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Working…' : mode === 'create' ? 'Create group' : 'Join group'}
      </button>
    </div>
  );
}
