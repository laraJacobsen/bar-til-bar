import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BarDoc, ChallengeDoc, EventDoc, GroupDocType, SubmissionDoc } from '@/lib/types';

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
    });
  }

  const groups: Array<Omit<GroupDocType, 'id'>> = [
    { name: 'Neon Crew', color: '#f43f5e', members: ['Ari', 'Max'], score: 120, currentBarId: 'north-star', routeProgress: 1, routeId: 'route-a' },
    { name: 'Midnight Mix', color: '#8b5cf6', members: ['Jules', 'Sam'], score: 90, currentBarId: 'velvet-room', routeProgress: 1, routeId: 'route-b' },
  ];

  for (const group of groups) {
    const groupId = group.name.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'groups', groupId), {
      id: groupId,
      ...group,
    });
  }
}

export async function getActiveEvent(): Promise<EventDoc | null> {
  const snapshot = await getDocs(collection(db, 'events'));
  const events = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<EventDoc, 'id'>) }));
  return events.find((event) => event.status === 'active') || events[0] || null;
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

export async function getSubmissionsByGroup(groupId: string): Promise<SubmissionDoc[]> {
  const q = query(collection(db, 'submissions'), where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<SubmissionDoc, 'id'>) }));
}

export async function getAllSubmissions(): Promise<SubmissionDoc[]> {
  const snapshot = await getDocs(collection(db, 'submissions'));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<SubmissionDoc, 'id'>) }));
}

export async function createSubmission(input: { groupId: string; barId: string; challengeId: string; photoUrl: string }) {
  return addDoc(collection(db, 'submissions'), {
    ...input,
    status: 'approved',
    createdAt: new Date().toISOString(),
  });
}
