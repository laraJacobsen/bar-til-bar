import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSubmission, getAllSubmissions } from '@/lib/firestore';
import { adjustGroupScore, createGroup, getGroupById } from '@/lib/group';
import { clearEmulators, expectDenied, signInAsNewUser } from './helpers';

// Mirrors exactly what UploadPanel.handleSubmit writes after the R2 upload.
const validSubmission = (userId: string, groupId: string) => ({
  userId,
  groupId,
  barId: 'north-star',
  challengeId: 'group-selfie',
  photoUrl: 'https://r2.example.com/photo.jpg',
  pointsAwarded: 50,
});

describe('photo submission write path (firestore.rules)', () => {
  beforeEach(async () => {
    await clearEmulators();
  });

  afterAll(async () => {
    await signOut(auth).catch(() => {});
  });

  it('lets a signed-in group member submit a photo and bump their score', async () => {
    // This is the regression guard: when createSubmission stops writing `userId`
    // (as it did on main), the rules reject this and the test fails.
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });

    await createSubmission(validSubmission(uid, group.id));
    await adjustGroupScore(group.id, 50);

    const stored = await getAllSubmissions();
    expect(stored).toHaveLength(1);
    expect(stored[0].userId).toBe(uid);
    expect(stored[0].status).toBe('pending');

    const updatedGroup = await getGroupById(group.id);
    expect(updatedGroup?.score).toBe(50);
  });

  it('rejects a submission that omits userId', async () => {
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });

    const { userId: _omitted, ...withoutUserId } = validSubmission(uid, group.id);
    await expectDenied(
      createSubmission(withoutUserId as Parameters<typeof createSubmission>[0]),
      'submission without userId',
    );
  });

  it('rejects a submission that claims a different userId', async () => {
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });

    await expectDenied(
      createSubmission(validSubmission('someone-else', group.id)),
      'submission with spoofed userId',
    );
  });

  it('rejects an unauthenticated submission', async () => {
    const uid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: uid });
    await signOut(auth);

    await expectDenied(
      createSubmission(validSubmission(uid, group.id)),
      'unauthenticated submission',
    );
  });

  it('forbids a non-member from changing a group score', async () => {
    const ownerUid = await signInAsNewUser();
    const group = await createGroup({ name: 'Neon Crew', ownerId: ownerUid });

    // Switch to a different signed-in user who is not in the group's members.
    await signInAsNewUser();
    await expectDenied(adjustGroupScore(group.id, 50), 'non-member score change');
  });
});
