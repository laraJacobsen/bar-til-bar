import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSubmission, getAllSubmissions } from '@/lib/firestore';
import { createGroup } from '@/lib/group';
import { getAllReactions, summarizeReactions, toggleReaction } from '@/lib/reactions';
import { clearEmulators, expectDenied, signInAsNewUser } from './helpers';

async function seedSubmission(userId: string, groupId: string): Promise<string> {
  await createSubmission({
    userId,
    groupId,
    barId: 'north-star',
    challengeId: 'group-selfie',
    photoUrl: 'https://r2.example.com/photo.jpg',
    pointsAwarded: 50,
  });
  const [submission] = await getAllSubmissions();
  return submission.id;
}

describe('photo reactions (firestore.rules + reactions.ts)', () => {
  beforeEach(async () => {
    await clearEmulators();
  });

  afterAll(async () => {
    await signOut(auth).catch(() => {});
  });

  it('lets a user like then unlike a photo', async () => {
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });
    const submissionId = await seedSubmission(uid, group.id);

    expect(await toggleReaction(submissionId, uid)).toBe(true);
    let { counts, likedByMe } = summarizeReactions(await getAllReactions(), uid);
    expect(counts[submissionId]).toBe(1);
    expect(likedByMe[submissionId]).toBe(true);

    expect(await toggleReaction(submissionId, uid)).toBe(false);
    ({ counts, likedByMe } = summarizeReactions(await getAllReactions(), uid));
    expect(counts[submissionId] ?? 0).toBe(0);
    expect(likedByMe[submissionId]).toBeUndefined();
  });

  it('settles to one consistent state under a rapid double-toggle (double-tap)', async () => {
    // This is the regression guard for the double-tap bug: toggleReaction used
    // to read-then-write outside a transaction, so two toggles fired back to
    // back could both read "not liked yet" and both create a reaction doc,
    // leaving a like that couldn't be undone. The transaction serializes them.
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });
    const submissionId = await seedSubmission(uid, group.id);

    await Promise.all([toggleReaction(submissionId, uid), toggleReaction(submissionId, uid)]);

    const reactions = await getAllReactions();
    const mine = reactions.filter((r) => r.submissionId === submissionId && r.userId === uid);
    expect(mine.length).toBeLessThanOrEqual(1);

    const { counts } = summarizeReactions(reactions, uid);
    expect(counts[submissionId] ?? 0).toBe(mine.length);
  });

  it('sums likes from multiple users, as the summary page highlights depend on', async () => {
    const uidA = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uidA });
    const submissionId = await seedSubmission(uidA, group.id);
    await toggleReaction(submissionId, uidA);

    const uidB = await signInAsNewUser();
    await toggleReaction(submissionId, uidB);

    const uidC = await signInAsNewUser();
    await toggleReaction(submissionId, uidC);

    const reactions = await getAllReactions();
    const { counts, likedByMe } = summarizeReactions(reactions, uidB);
    expect(counts[submissionId]).toBe(3);
    expect(likedByMe[submissionId]).toBe(true);

    const { likedByMe: likedByStranger } = summarizeReactions(reactions, 'someone-else');
    expect(likedByStranger[submissionId]).toBeUndefined();
  });

  it('scopes likes per (photo, user): one user liking never removes another user\'s like', async () => {
    const uidA = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uidA });
    const submissionId = await seedSubmission(uidA, group.id);
    await toggleReaction(submissionId, uidA);

    const uidB = await signInAsNewUser();
    await toggleReaction(submissionId, uidB);

    const { counts } = summarizeReactions(await getAllReactions());
    expect(counts[submissionId]).toBe(2);
  });

  it('rejects liking as a spoofed user', async () => {
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });
    const submissionId = await seedSubmission(uid, group.id);

    await expectDenied(toggleReaction(submissionId, 'someone-else'), 'liking as a spoofed user');
  });
});
