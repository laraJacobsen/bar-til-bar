'use client';

import { useEffect, useState } from 'react';
import { arrayUnion, collection, doc, increment, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserGroup } from '@/lib/group';
import { useAuth } from '@/components/AuthProvider';

interface Props {
  challengeId: string;
  barId: string;
  points: number;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function UploadPanel({ challengeId, barId, points, onSubmitted, onCancel }: Props) {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      getUserGroup(user.uid).then((group) => setGroupId(group?.id ?? null));
    }
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleSubmit = async () => {
    if (!file || !user || !groupId) return;
    setLoading(true);
    setError(null);
    try {
      // Upload via server-side API route (bypasses browser CORS restriction)
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', groupId);
      formData.append('challengeId', challengeId);
      formData.append('idToken', idToken);

      const res = await fetch('/api/upload-submission', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }
      const { photoUrl } = await res.json();

      // Atomic batch: create submission + increment score + mark challenge completed
      const submissionRef = doc(collection(db, 'submissions'));
      const groupRef = doc(db, 'groups', groupId);
      const batch = writeBatch(db);

      batch.set(submissionRef, {
        groupId,
        userId: user.uid,
        barId,
        challengeId,
        photoUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      batch.update(groupRef, {
        score: increment(points),
        completedChallenges: arrayUnion(challengeId),
      });

      await batch.commit();

      setDone(true);
      setTimeout(() => onSubmitted?.(), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-[2rem] border border-green-500/30 bg-green-500/10 p-5 text-center backdrop-blur-xl">
        <p className="text-2xl">✓</p>
        <p className="mt-2 font-semibold text-green-300">Submitted! +{points} pts added to your group</p>
        <p className="mt-1 text-sm text-slate-400">Waiting for admin review</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Upload proof</h2>
          <p className="mt-1 text-sm text-slate-400">+{points} pts added to your group on submit</p>
        </div>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400">
            Cancel
          </button>
        ) : null}
      </div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3"
      />
      {previewUrl ? <img src={previewUrl} alt="Upload preview" className="mt-4 h-48 w-full rounded-2xl object-cover" /> : null}
      <button
        onClick={handleSubmit}
        disabled={!file || loading || !groupId}
        className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Uploading…' : 'Submit photo'}
      </button>
      {!groupId && <p className="mt-2 text-center text-sm text-slate-400">Join a group first to submit.</p>}
      {error && <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
