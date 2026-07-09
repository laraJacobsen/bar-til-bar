'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { uploadToR2 } from '@/lib/upload';
import { createSubmission, getActiveEvent } from '@/lib/firestore';
import { getGroups, getUserGroup, adjustGroupScore } from '@/lib/group';
import { useRotatablePhoto } from '@/lib/useRotatablePhoto';
import { useAuth } from '@/components/AuthProvider';

interface UploadPanelProps {
  challengeId: string;
  barId: string;
  pointsAwarded: number;
  onSuccess?: () => void;
}

export function UploadPanel({ challengeId, barId, pointsAwarded, onSuccess }: UploadPanelProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLDivElement>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const photo = useRotatablePhoto();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Resolve the event group — getUserGroup returns the first group regardless
  // of eventId, so we prefer whichever event group the user is actually in.
  useEffect(() => {
    if (!user?.uid) { setGroupId(null); return; }
    const resolve = async () => {
      try {
        const [activeEvent, rawGroup, allGroups] = await Promise.all([
          getActiveEvent(),
          getUserGroup(user.uid),
          getGroups(),
        ]);
        const eventGroups = activeEvent
          ? allGroups.filter((g) => g.eventId === activeEvent.id)
          : [];
        const resolved =
          eventGroups.find((g) => g.members?.includes(user.uid)) || rawGroup || null;
        setGroupId(resolved?.id ?? null);
        setGroupName(resolved?.name ?? null);
      } catch (err) {
        console.error(err);
        setError('Could not load your group. Try refreshing the page.');
      }
    };
    resolve();
  }, [user]);

  const clearSelection = () => {
    photo.reset();
    setConfirming(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (!next) return;
    setError('');
    photo.setSource(next);
  };

  // Returning from the native camera (capture="environment") leaves the page scrolled
  // where it was, so the newly-rendered preview + submit button can end up off-screen.
  // Center them in the viewport (block: 'center', not 'end') so they never land under the
  // fixed floating tab bar. Also re-run when the inline confirm dialog opens so its
  // "Go back / Yes, submit" buttons are centered too.
  useEffect(() => {
    if (photo.hasPhoto) submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [photo.hasPhoto, confirming]);

  const handleSubmit = async () => {
    if (!photo.outputFile || !user || !groupId) return;
    setLoading(true);
    setError('');
    try {
      // Resolve the active event before uploading (fast Firestore read) so a slow-but-
      // successful R2 upload is never discarded by an unrelated failure racing it.
      const activeEvent = await getActiveEvent();
      const photoUrl = await uploadToR2(photo.outputFile, { kind: 'submission', groupId, challengeId });
      await createSubmission({
        userId: user.uid,
        groupId,
        groupName: groupName ?? undefined,
        barId,
        challengeId,
        photoUrl,
        pointsAwarded,
        eventId: activeEvent?.id,
      });
      await adjustGroupScore(groupId, pointsAwarded);
      clearSelection();
      setDone(true);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        ✓ Submitted! +{pointsAwarded} pts added to your group.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={loading}
        className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-300"
      />
      {photo.hasPhoto && (
        <div className="relative">
          <img src={photo.previewUrl} alt="Preview" className="h-40 w-full rounded-2xl object-cover" />
          <button
            type="button"
            onClick={photo.rotate}
            disabled={loading || photo.rotating}
            className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium text-white backdrop-blur transition disabled:opacity-60"
            aria-label="Rotate photo"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Rotate
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={loading}
            className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium text-white backdrop-blur"
          >
            Remove
          </button>
        </div>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}

      <div ref={submitButtonRef}>
        {confirming ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Submit this photo?</p>
            <p className="text-xs text-slate-400">
              This will add <span className="text-pink-300 font-semibold">+{pointsAwarded} pts</span> to your group.
            </p>
            <p className="text-xs text-amber-300/80 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              ⚠ Your group can only submit once per challenge. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 transition"
              >
                {loading ? 'Uploading…' : 'Yes, submit'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!photo.hasPhoto || !groupId}
            className="w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition"
          >
            Submit photo · +{pointsAwarded} pts
          </button>
        )}
      </div>

      {!groupId && (
        <p className="text-center text-xs text-slate-500">Join a group to submit.</p>
      )}
    </div>
  );
}
