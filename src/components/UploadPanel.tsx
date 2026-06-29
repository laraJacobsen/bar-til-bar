'use client';

import { useEffect, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { createSubmission } from '@/lib/firestore';
import { getUserGroup, incrementGroupScore } from '@/lib/group';
import { useAuth } from '@/components/AuthProvider';

interface Props {
  challengeId: string;
  barId: string;
  points: number;
  onSubmitted?: () => void;
}

export function UploadPanel({ challengeId, barId, points, onSubmitted }: Props) {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
    try {
      const storageRef = ref(storage, `submissions/${user.uid}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(snapshot.ref);

      await createSubmission({ groupId, barId, challengeId, photoUrl });
      await incrementGroupScore(groupId, points);

      setFile(null);
      setPreviewUrl('');
      onSubmitted?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
      <h2 className="text-xl font-semibold">Upload proof</h2>
      <p className="mt-2 text-sm text-slate-400">Your group earns +{points} pts on submit</p>
      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3" />
      {previewUrl ? <img src={previewUrl} alt="Upload preview" className="mt-4 h-48 w-full rounded-2xl object-cover" /> : null}
      <button
        onClick={handleSubmit}
        disabled={!file || loading || !groupId}
        className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Uploading…' : 'Submit photo'}
      </button>
      {!groupId && <p className="mt-2 text-center text-sm text-slate-400">Join a group to submit.</p>}
    </div>
  );
}
