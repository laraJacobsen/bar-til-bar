'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getGroupById, getGroupMembers, type GroupDoc, type GroupMemberInfo } from '@/lib/group';

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [members, setMembers] = useState<GroupMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!params?.groupId) return;
      const groupDoc = await getGroupById(params.groupId);
      setGroup(groupDoc);

      if (groupDoc) {
        const memberList = await getGroupMembers(groupDoc.members);
        setMembers(memberList);
      }

      setLoading(false);
    };

    load();
  }, [params?.groupId]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 px-6 py-8 text-center backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Bar Til Bar</p>
          <h1 className="mt-2 text-2xl font-semibold">Loading crew…</h1>
        </div>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6">
        <Link href="/" className="text-sm text-pink-200">← Back home</Link>
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 text-center backdrop-blur-xl">
          <h1 className="text-2xl font-semibold">Group not found</h1>
          <p className="mt-2 text-slate-400">This crew may have been removed or the link is outdated.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
      <Link href="/" className="text-sm text-pink-200">← Back home</Link>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/30 to-accent/30 p-6 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-pink-100">Crew details</p>
        <h1 className="mt-2 text-3xl font-semibold">{group.name}</h1>
        <p className="mt-3 text-sm text-slate-100">Share this join code so your crew can connect instantly.</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">Join code</p>
          <p className="mt-2 text-2xl font-semibold tracking-[0.3em]">{group.code}</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Members</h2>
          <span className="text-sm text-slate-400">{members.length} joined</span>
        </div>

        <div className="mt-4 grid gap-3">
          {members.map((member) => (
            <div key={member.uid} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{member.displayName}</p>
                  {member.email ? <p className="text-sm text-slate-400">{member.email}</p> : null}
                </div>
                <div className="rounded-full bg-brand-500/20 px-3 py-1 text-sm text-pink-100">Crewmate</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
