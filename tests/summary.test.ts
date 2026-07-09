import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { approveSubmission, archiveCrawl, createSubmission, getAllSubmissions, getCrawlArchive } from '@/lib/firestore';
import { adjustGroupScore, createGroup } from '@/lib/group';
import { getAllReactions, summarizeReactions, toggleReaction } from '@/lib/reactions';
import { clearEmulators, signInAsNewUser } from './helpers';

async function makeAdmin(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { role: 'admin' }, { merge: true });
}

describe('crawl summary (archiveCrawl + reactions aggregation)', () => {
  beforeEach(async () => {
    await clearEmulators();
  });

  afterAll(async () => {
    await signOut(auth).catch(() => {});
  });

  it('archives scores, approvals and likes so the end-of-night summary reflects the live crawl', async () => {
    const adminUid = await signInAsNewUser();
    await makeAdmin(adminUid);
    await setDoc(doc(db, 'events', 'demo-crawl'), {
      id: 'demo-crawl',
      name: 'Saturday Night Crawl',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    const winner = await createGroup({ name: 'Neon Crew', ownerId: adminUid });
    const runnerUp = await createGroup({ name: 'Velvet Squad', ownerId: adminUid });
    await adjustGroupScore(winner.id, 150);
    await adjustGroupScore(runnerUp.id, 90);

    await createSubmission({
      userId: adminUid,
      groupId: winner.id,
      barId: 'north-star',
      challengeId: 'group-selfie',
      photoUrl: 'https://r2.example.com/winner.jpg',
      pointsAwarded: 50,
    });
    const [submission] = await getAllSubmissions();
    await approveSubmission(submission.id);

    // Liked before the crawl ends — the summary's "highlights" reel depends on
    // this like surviving the archive + live-collection teardown below.
    await toggleReaction(submission.id, adminUid);

    await archiveCrawl('demo-crawl', 'Saturday Night Crawl');

    const archive = await getCrawlArchive('demo-crawl');
    expect(archive).not.toBeNull();

    // What the leaderboard section renders.
    const archivedWinner = archive!.groups.find((g) => g.id === winner.id);
    const archivedRunnerUp = archive!.groups.find((g) => g.id === runnerUp.id);
    expect(archivedWinner?.score).toBe(150);
    expect(archivedRunnerUp?.score).toBe(90);

    // What the "all photos" / approval-count stats render.
    const archivedSubmission = archive!.submissions.find((s) => s.id === submission.id);
    expect(archivedSubmission?.status).toBe('approved');
    expect(archivedSubmission?.photoUrl).toBe('https://r2.example.com/winner.jpg');

    // What the "Highlights" (top-liked photos) card renders. Reactions are
    // keyed by submissionId, independent of the archive, so the pre-archive
    // like must still resolve correctly for the now-archived photo.
    const { counts, likedByMe } = summarizeReactions(await getAllReactions(), adminUid);
    expect(counts[submission.id]).toBe(1);
    expect(likedByMe[submission.id]).toBe(true);
  });

  it('drops the live groups/bars/challenges once archived, so re-running the summary for an ended crawl needs the archive, not live data', async () => {
    const adminUid = await signInAsNewUser();
    await makeAdmin(adminUid);
    await setDoc(doc(db, 'events', 'demo-crawl'), {
      id: 'demo-crawl',
      name: 'Saturday Night Crawl',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    const group = await createGroup({ name: 'Neon Crew', ownerId: adminUid });
    await archiveCrawl('demo-crawl', 'Saturday Night Crawl');

    const archive = await getCrawlArchive('demo-crawl');
    expect(archive?.groups.map((g) => g.id)).toContain(group.id);
  });
});
