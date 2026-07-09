import { addDoc, collection, doc, getDoc, getDocs, increment, limit, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BarDoc, ChallengeDoc, CrawlArchive, EventDoc, SubmissionDoc } from '@/lib/types';

export async function updateUserPhoto(uid: string, photoURL: string) {
  await setDoc(doc(db, 'users', uid), { photoURL, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function seedDemoData() {
  const eventsSnap = await getDocs(collection(db, 'events'));
  if (!eventsSnap.empty) {
    return;
  }

  const eventId = 'demo-crawl';
  await setDoc(doc(db, 'events', eventId), {
    id: eventId,
    name: 'Saturday Night Crawl',
    description: 'A demo event for testing the app end to end.',
    status: 'active',
    createdAt: new Date().toISOString(),
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
  });

  const bars: Array<Omit<BarDoc, 'id'>> = [
    { name: 'North Star', address: '18 Market St', description: 'A bright rooftop with skyline views.', order: 1 },
    { name: 'Velvet Room', address: '44 River Ave', description: 'Live jazz and dim lights.', order: 2 },
    { name: 'Neon Tunnel', address: '88 Arc St', description: 'A colorful basement lounge.', order: 3 },
  ];

  for (const bar of bars) {
    const barId = bar.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'bars', barId), {
      id: barId,
      ...bar,
      eventId: eventId,
    });
  }

  const challenges: Array<Omit<ChallengeDoc, 'id'>> = [
    { barId: 'north-star', title: 'Group selfie', description: 'Take a group selfie in front of the venue.', points: 50, difficulty: 'easy', requiresPhoto: true },
    { barId: 'velvet-room', title: 'Human pyramid', description: 'Build a silly human pyramid with your group.', points: 80, difficulty: 'medium', requiresPhoto: true },
    { barId: 'neon-tunnel', title: 'Find someone wearing red', description: 'Spot a red outfit and snap the moment.', points: 60, difficulty: 'easy', requiresPhoto: true },
  ];

  for (const challenge of challenges) {
    const challengeId = challenge.title.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'challenges', challengeId), {
      id: challengeId,
      ...challenge,
      eventId: eventId,
    });
  }

  const groups = [
    { name: 'Neon Crew', color: '#f43f5e', members: ['Ari', 'Max'] },
    { name: 'Midnight Mix', color: '#8b5cf6', members: ['Jules', 'Sam'] },
  ];

  for (const group of groups) {
    const groupId = group.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'groups', groupId), {
      id: groupId,
      name: group.name,
      code: groupId.toUpperCase().slice(0, 6),
      ownerId: 'seed',
      members: group.members || [],
      createdAt: new Date().toISOString(),
      color: group.color,
      currentBarIndex: 0,
    });
  }
}

export async function getActiveEvent(): Promise<EventDoc | null> {
  // Fetch only active events (equality filter uses Firestore's automatic single-field
  // index — no composite index needed), then prefer the most recently created so a
  // stray active event can never shadow the current crawl.
  const snapshot = await getDocs(query(collection(db, 'events'), where('status', '==', 'active')));
  const activeEvents = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<EventDoc, 'id'>) }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return activeEvents[0] || null;
}

export async function getEventByJoinCode(joinCode: string): Promise<EventDoc | null> {
  const snapshot = await getDocs(
    query(collection(db, 'events'), where('joinCode', '==', joinCode.toUpperCase()), limit(1)),
  );
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...(d.data() as Omit<EventDoc, 'id'>) };
}

export async function getEvents(): Promise<EventDoc[]> {
  const snapshot = await getDocs(collection(db, 'events'));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<EventDoc, 'id'>) }));
}

export async function getBars(): Promise<BarDoc[]> {
  const snapshot = await getDocs(collection(db, 'bars'));
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<BarDoc, 'id'>) }))
    .sort((a, b) => a.order - b.order);
}

export async function getChallenges(): Promise<ChallengeDoc[]> {
  const snapshot = await getDocs(collection(db, 'challenges'));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ChallengeDoc, 'id'>) }));
}

export async function createSubmission(input: { userId: string; groupId: string; groupName?: string; barId?: string; challengeId?: string; photoUrl: string; pointsAwarded?: number; eventId?: string; type?: 'challenge' | 'fun' }) {
  return addDoc(collection(db, 'submissions'), {
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function approveSubmission(submissionId: string): Promise<void> {
  await updateDoc(doc(db, 'submissions', submissionId), { status: 'approved' });
}

export async function rejectSubmission(submissionId: string, groupId: string, pointsAwarded: number): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'submissions', submissionId), { status: 'rejected' });
  if (pointsAwarded > 0) {
    batch.update(doc(db, 'groups', groupId), { score: increment(-pointsAwarded) });
  }
  await batch.commit();
}

export async function getAllSubmissions(): Promise<SubmissionDoc[]> {
  const snapshot = await getDocs(collection(db, 'submissions'));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<SubmissionDoc, 'id'>) }));
}

export async function archiveCrawl(eventId: string, eventName: string): Promise<void> {
  const [groupsSnap, barsSnap, challengesSnap, allSubs] = await Promise.all([
    getDocs(collection(db, 'groups')),
    getDocs(collection(db, 'bars')),
    getDocs(collection(db, 'challenges')),
    getAllSubmissions(),
  ]);

  const groupDocs = groupsSnap.docs.filter((d) => (d.data() as any).eventId === eventId || !(d.data() as any).eventId);
  const barDocs = barsSnap.docs.filter((d) => (d.data() as any).eventId === eventId);
  const challengeDocs = challengesSnap.docs.filter((d) => (d.data() as any).eventId === eventId);

  const groups = groupDocs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const bars = barDocs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const groupIds = new Set(groups.map((g: any) => g.id as string));
  const submissions = allSubs.filter(
    (s) => s.eventId === eventId || (!s.eventId && groupIds.has(s.groupId)),
  );
  const memberIds = Array.from(new Set(groups.flatMap((g: any) => (g.members as string[]) ?? [])));

  await setDoc(doc(db, 'crawlArchives', eventId), {
    eventId,
    eventName,
    endedAt: new Date().toISOString(),
    memberIds,
    groups: groups.map((g: any) => ({
      id: g.id,
      name: g.name,
      color: g.color ?? null,
      score: g.score ?? 0,
      members: g.members ?? [],
    })),
    submissions: submissions.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      groupName: s.groupName ?? null,
      barId: s.barId,
      challengeId: s.challengeId,
      photoUrl: s.photoUrl ?? null,
      status: s.status,
      pointsAwarded: s.pointsAwarded ?? null,
    })),
    bars: bars.map((b: any) => ({
      id: b.id,
      name: b.name,
      order: b.order ?? 0,
    })),
  });

  await updateDoc(doc(db, 'events', eventId), { status: 'ended' });

  // Clear the ended crawl's live groups/bars/challenges — they're preserved above in
  // the archive, so leaving them in the live collections would only leak into the next crawl.
  const batch = writeBatch(db);
  groupDocs.forEach((d) => batch.delete(d.ref));
  barDocs.forEach((d) => batch.delete(d.ref));
  challengeDocs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function getCrawlArchive(id: string): Promise<CrawlArchive | null> {
  const snap = await getDoc(doc(db, 'crawlArchives', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<CrawlArchive, 'id'>) };
}

export async function getUserCrawlArchives(userId: string): Promise<CrawlArchive[]> {
  const snap = await getDocs(
    query(collection(db, 'crawlArchives'), where('memberIds', 'array-contains', userId)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<CrawlArchive, 'id'>) }))
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
}
