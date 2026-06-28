'use client';

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

export function UploadPanel() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setLoading(true);

    const storageRef = ref(storage, `submissions/${user.uid}/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const photoUrl = await getDownloadURL(snapshot.ref);

    await addDoc(collection(db, 'submissions'), {
      groupId: user.uid,
      barId: 'north-star',
      challengeId: 'group-selfie',
      photoUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    setLoading(false);
    setFile(null);
    setPreviewUrl('');
  };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
      <h2 className="text-xl font-semibold">Upload proof</h2>
      <p className="mt-2 text-sm text-slate-400">Photos are stored in Firebase Storage and reviewed by an admin.</p>
      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3" />
      {previewUrl ? <img src={previewUrl} alt="Upload preview" className="mt-4 h-48 w-full rounded-2xl object-cover" /> : null}
      <button onClick={handleSubmit} disabled={!file || loading} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 font-semibold">
        {loading ? 'Uploading…' : 'Submit photo'}
      </button>
    </div>
  );
}
