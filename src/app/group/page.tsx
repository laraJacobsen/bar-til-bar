'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getUserGroup, updateGroupPicture } from '@/lib/group';
import type { GroupDoc } from '@/lib/group';
import { uploadToR2 } from '@/lib/upload';

export default function GroupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (loading || !user) {
      return;
    }

    const load = async () => {
      if (user?.uid) {
        const userGroup = await getUserGroup(user.uid);
        if (userGroup) {
          setGroup(userGroup);
        } else {
          router.replace('/');
        }
      }
    };

    load();
  }, [loading, router, user]);

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !group) return;

    setUploading(true);
    try {
      const pictureUrl = await uploadToR2(file, {
        kind: 'group-picture',
        groupId: group.id,
      });
      await updateGroupPicture(group.id, pictureUrl);
      setGroup({ ...group, pictureUrl });
    } catch (error) {
      console.error('Error uploading picture:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading || !user || !group) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 px-6 py-8 text-center backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Back to home
      </Link>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Your group</p>
            <h1 className="text-3xl font-semibold">{group.name}</h1>
          </div>
          <div className="rounded-full bg-brand-500/20 px-3 py-1 text-sm text-pink-100">{group.members.length} members</div>
        </div>

        <div className="mt-6 space-y-4">
          {group.pictureUrl ? (
            <div className="relative">
              <img src={group.pictureUrl} alt={group.name} className="w-full rounded-2xl object-cover h-64" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 rounded-full bg-pink-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-2xl border-2 border-dashed border-white/20 bg-slate-900/50 py-12 text-center transition hover:border-pink-400/40 hover:bg-slate-900 disabled:opacity-50"
            >
              <p className="text-sm text-slate-400">{uploading ? 'Uploading…' : 'Add group photo'}</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePictureUpload}
            className="hidden"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h3 className="text-lg font-semibold">Group members</h3>
        <div className="mt-4 space-y-3">
          {group.members.map((memberId) => (
            <div key={memberId} className="rounded-2xl bg-slate-900/70 p-4">
              <p className="font-semibold text-slate-100">{memberId}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h3 className="text-lg font-semibold">Group code</h3>
        <div className="mt-4 rounded-2xl bg-slate-900/70 p-4">
          <p className="text-sm text-slate-400">Share this code with friends to join your group:</p>
          <p className="mt-2 text-2xl font-mono font-semibold tracking-widest">{group.code || 'N/A'}</p>
        </div>
      </section>
    </main>
  );
}
