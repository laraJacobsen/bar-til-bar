'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadToR2 } from '@/lib/upload';
import { createSubmission, getChallengeById, getActiveEvent } from '@/lib/firestore';
import { getUserGroup, adjustGroupScore } from '@/lib/group';
import { useAuth } from '@/components/AuthProvider';

type Status = { type: 'success' | 'error'; message: string } | null;

export function UploadPanel() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Submissions must be filed under the group's document id (what the admin queue
  // matches on), not the user's uid. Resolve the user's group up front.
  useEffect(() => {
    if (user?.uid) {
      getUserGroup(user.uid).then((group) => setGroupId(group?.id ?? null));
    } else {
      setGroupId(null);
    }
  }, [user]);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStatus(null);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleSubmit = async () => {
    if (!file || !user || !groupId) return;
    setLoading(true);
    setStatus(null);

    try {
      const challengeId = 'group-selfie';
      const [challenge, activeEvent] = await Promise.all([
        getChallengeById(challengeId),
        getActiveEvent(),
      ]);
      const pointsAwarded = challenge?.points ?? 50;

      const photoUrl = await uploadToR2(file, {
        kind: 'submission',
        groupId,
        challengeId,
      });

      await createSubmission({
        userId: user.uid,
        groupId,
        barId: 'north-star',
        challengeId,
        photoUrl,
        pointsAwarded,
        eventId: activeEvent?.id,
      });

      await adjustGroupScore(groupId, pointsAwarded);

      clearSelection();
      setStatus({ type: 'success', message: `Photo submitted! +${pointsAwarded} pts added to your group.` });
    } catch (error) {
      console.error('Error uploading submission:', error);
      setStatus({ type: 'error', message: 'Upload failed. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
      <h2 className="text-xl font-semibold">Upload proof</h2>
      <p className="mt-2 text-sm text-slate-400">Photos are stored in Cloudflare R2 and reviewed by an admin.</p>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={loading} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3" />
      {previewUrl ? (
        <div className="relative mt-4">
          <img src={previewUrl} alt="Upload preview" className="h-40 w-full rounded-2xl object-cover sm:h-48" />
          <button type="button" onClick={clearSelection} disabled={loading} className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-3 py-1 text-sm font-medium text-white backdrop-blur">
            Remove
          </button>
        </div>
      ) : null}
      <button onClick={handleSubmit} disabled={!file || loading || !groupId} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 font-semibold disabled:opacity-50">
        {loading ? 'Uploading…' : 'Submit photo'}
      </button>
      {!groupId ? (
        <p className="mt-2 text-center text-sm text-slate-400">Join a group to submit.</p>
      ) : null}
      {status ? (
        <p className={`mt-3 text-sm ${status.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>{status.message}</p>
      ) : null}
    </div>
  );
}
