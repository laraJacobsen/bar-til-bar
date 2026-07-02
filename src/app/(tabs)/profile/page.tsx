'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Camera, LogOut, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { InstallApp } from '@/components/InstallApp';
import { uploadToR2 } from '@/lib/upload';
import { getActiveEvent, getUserCrawlArchives, updateUserPhoto } from '@/lib/firestore';
import { getGroups, getUserGroup, type GroupDoc } from '@/lib/group';
import type { CrawlArchive, SubmissionDoc } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, dbUser, signOutUser } = useAuth();

  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [approvedSubmissions, setApprovedSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState<CrawlArchive[]>([]);
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [activeEvent, rawGroup, groups] = await Promise.all([
        getActiveEvent(),
        getUserGroup(user.uid),
        getGroups(),
      ]);

      // Prefer the group that's in the active event (same logic as home page)
      const eventGroups = activeEvent
        ? groups.filter((g) => g.eventId === activeEvent.id)
        : [];
      const resolvedGroup =
        eventGroups.find((g) => g.members?.includes(user.uid)) || rawGroup || null;
      setGroup(resolvedGroup);

      // Count this user's submissions in the active event
      const subsSnap = await getDocs(
        query(collection(db, 'submissions'), where('userId', '==', user.uid)),
      );
      const subs = subsSnap.docs.map((d) => d.data() as SubmissionDoc);
      const eventSubs = activeEvent
        ? subs.filter((s) => !s.eventId || s.eventId === activeEvent.id)
        : subs;

      setTotalSubmissions(eventSubs.length);
      setApprovedSubmissions(eventSubs.filter((s) => s.status === 'approved').length);

      const crawlHistory = await getUserCrawlArchives(user.uid);
      setArchives(crawlHistory);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSignOut = async () => {
    await signOutUser().catch(console.error);
    router.replace('/login');
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) event.target.value = '';
    if (!file || !user) return;
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      const photoURL = await uploadToR2(file, { kind: 'profile-picture', userId: user.uid });
      await updateUserPhoto(user.uid, photoURL);
    } catch (err) {
      console.error(err);
      setPhotoError('Could not update photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const displayName = dbUser?.displayName || user?.displayName || 'Traveler';
  const initial = displayName.charAt(0).toUpperCase();
  const photoURL = dbUser?.photoURL || user?.photoURL || '';

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-6 pb-24">

      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-pink-200">Profile</p>
        <h1 className="mt-0.5 text-2xl font-semibold">{loading ? '…' : `Hey, ${displayName}`}</h1>
      </div>

      {/* Avatar + group */}
      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full disabled:opacity-70"
            aria-label="Change profile photo"
          >
            {photoURL ? (
              <img src={photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500 to-violet-500 text-xl font-bold">
                {initial}
              </span>
            )}
            <span className={`absolute inset-0 flex items-center justify-center bg-slate-950/60 transition group-hover:opacity-100 ${uploadingPhoto ? 'opacity-100' : 'opacity-0'}`}>
              {uploadingPhoto ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Camera className="h-4 w-4 text-white" aria-hidden />
              )}
            </span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{displayName}</p>
            <p className="truncate text-sm text-slate-400">{user?.email ?? ''}</p>
            {group && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: group.color ?? '#f43f5e' }} />
                <p className="text-xs text-slate-400">{group.name}</p>
              </div>
            )}
          </div>
        </div>

        {photoError && <p className="mt-3 text-xs text-rose-300">{photoError}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Challenges done</p>
            <p className="mt-2 text-2xl font-bold">{loading ? '—' : totalSubmissions}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Approved</p>
            <p className="mt-2 text-2xl font-bold">{loading ? '—' : approvedSubmissions}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Group score</p>
            <p className="mt-2 text-2xl font-bold">{loading ? '—' : (group?.score ?? 0)}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Current stop</p>
            <p className="mt-2 text-2xl font-bold">{loading ? '—' : group ? `#${(group.currentBarIndex ?? 0) + 1}` : '—'}</p>
          </div>
        </div>
      </section>

      <InstallApp />

      {/* Account actions */}
      {archives.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
          <h2 className="text-base font-semibold mb-4">Previous crawls</h2>
          <div className="flex flex-col gap-3">
            {archives.map((archive) => {
              const myGroup = archive.groups.find((g) => g.members.includes(user?.uid ?? ''));
              const allPhotos = archive.submissions.filter((s) => s.photoUrl);
              const isExpanded = expandedArchiveId === archive.id;
              const rank = myGroup
                ? [...archive.groups].sort((a, b) => b.score - a.score).findIndex((g) => g.id === myGroup.id) + 1
                : null;
              return (
                <div key={archive.id} className="rounded-[1.5rem] border border-white/8 bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedArchiveId(isExpanded ? null : archive.id)}
                    className="w-full flex items-start justify-between p-4 text-left hover:bg-white/5 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{archive.eventName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(archive.endedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                        {myGroup && ` · ${myGroup.name}`}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      {myGroup && <p className="text-lg font-bold text-pink-300 tabular-nums">{myGroup.score} pts</p>}
                      {rank && <p className="text-xs text-slate-500">#{rank} of {archive.groups.length}</p>}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="space-y-1.5">
                        {[...archive.groups].sort((a, b) => b.score - a.score).map((g, idx) => (
                          <div key={g.id} className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2">
                            <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-500">
                              {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx + 1}`}
                            </span>
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: g.color ?? '#f43f5e' }} />
                            <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-300">{g.score}</span>
                          </div>
                        ))}
                      </div>
                      {allPhotos.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">All photos</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {allPhotos.slice(0, 6).map((s) => (
                              <img key={s.id} src={s.photoUrl!} alt="" className="h-20 w-full rounded-lg object-cover" />
                            ))}
                          </div>
                          {allPhotos.length > 6 && (
                            <Link href={`/summary?id=${archive.id}` as any} className="mt-2 block text-center text-xs text-pink-400 underline">
                              See all {allPhotos.length} photos →
                            </Link>
                          )}
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

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account</h2>
        <div className="mt-4 flex flex-col gap-3">
          {dbUser?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 rounded-full bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-600"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Admin Control Center
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      </section>

    </main>
  );
}
