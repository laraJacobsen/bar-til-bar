import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ReactionDoc } from '@/lib/types';

function reactionId(submissionId: string, userId: string) {
  return `${submissionId}_${userId}`;
}

export async function getAllReactions(): Promise<ReactionDoc[]> {
  const snapshot = await getDocs(collection(db, 'reactions'));
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReactionDoc, 'id'>) }));
}

// Toggles the current user's like on a photo. Returns the new liked state.
export async function toggleReaction(submissionId: string, userId: string): Promise<boolean> {
  const ref = doc(db, 'reactions', reactionId(submissionId, userId));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { submissionId, userId, createdAt: new Date().toISOString() });
  return true;
}

// Reduces a flat reaction list into per-submission like counts and which of them
// the given user has already liked — the shape every photo grid needs to render.
export function summarizeReactions(reactions: ReactionDoc[], userId?: string) {
  const counts: Record<string, number> = {};
  const likedByMe: Record<string, boolean> = {};
  for (const r of reactions) {
    counts[r.submissionId] = (counts[r.submissionId] ?? 0) + 1;
    if (userId && r.userId === userId) likedByMe[r.submissionId] = true;
  }
  return { counts, likedByMe };
}
