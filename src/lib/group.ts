import { collection, doc, getDoc, getDocs, increment, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GroupDoc {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: string[];
  createdAt: string;
  color?: string;
  currentBarIndex?: number;
  score?: number;
  pictureUrl?: string;
  eventId?: string;
  barSequence?: number[];
}

// Standard circle-method round-robin: fix group 0, rotate the rest.
// Returns one barSequence per group — barSequence[slot] = bar index for that time slot.
function generateGroupBarSequences(numGroups: number, numBars: number): number[][] {
  if (numGroups === 0 || numBars === 0) return [];
  if (numGroups === 1) return [Array.from({ length: numBars }, (_, i) => i)];

  const N = numGroups % 2 === 0 ? numGroups : numGroups + 1; // pad to even for clean pairing
  const sequences: number[][] = Array.from({ length: numGroups }, () => []);
  let circle = Array.from({ length: N - 1 }, (_, i) => i + 1);
  const numRounds = Math.min(N - 1, numBars);

  for (let round = 0; round < numRounds; round++) {
    const half = Math.floor((N - 2) / 2);
    const top = [0, ...circle.slice(0, half)];
    const bottom = [...circle.slice(half)].reverse();

    for (let i = 0; i < N / 2; i++) {
      const g0 = top[i];
      const g1 = bottom[i];
      const bar = (round * Math.floor(N / 2) + i) % numBars;
      if (g0 < numGroups) sequences[g0].push(bar);
      if (g1 < numGroups) sequences[g1].push(bar);
    }
    circle = [circle[circle.length - 1], ...circle.slice(0, -1)];
  }

  // Pad remaining slots with unvisited bars, then wrap if needed
  for (let g = 0; g < numGroups; g++) {
    const used = new Set(sequences[g]);
    for (let b = 0; b < numBars && sequences[g].length < numBars; b++) {
      if (!used.has(b)) { sequences[g].push(b); used.add(b); }
    }
    while (sequences[g].length < numBars) sequences[g].push(sequences[g][sequences[g].length % numGroups] ?? 0);
  }

  return sequences;
}

export async function recalculateSchedule(eventId: string): Promise<void> {
  const [groupsSnap, barsSnap] = await Promise.all([
    getDocs(query(collection(db, 'groups'), where('eventId', '==', eventId))),
    getDocs(query(collection(db, 'bars'), where('eventId', '==', eventId))),
  ]);

  const groups = groupsSnap.docs.map((d) => ({ ...(d.data() as GroupDoc), id: d.id }));
  const numBars = barsSnap.size;
  if (groups.length === 0 || numBars === 0) return;

  const sequences = generateGroupBarSequences(groups.length, numBars);
  const batch = writeBatch(db);
  groups.forEach((group, i) => {
    batch.update(doc(db, 'groups', group.id), { barSequence: sequences[i] });
  });
  await batch.commit();
}

// Returns the group (if any) the user already belongs to within a given event.
// Used to enforce one group per participant per crawl.
async function findUserGroupInEvent(userId: string, eventId: string): Promise<GroupDoc | null> {
  const snap = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', userId)));
  const match = snap.docs
    .map((d) => ({ ...(d.data() as GroupDoc), id: d.id }))
    .find((g) => g.eventId === eventId);
  return match ?? null;
}

export async function createGroup({ name, ownerId, color, eventId }: { name: string; ownerId: string; color?: string; eventId?: string }) {
  if (eventId && (await findUserGroupInEvent(ownerId, eventId))) {
    throw new Error("You're already in a group for this crawl.");
  }
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const groupRef = doc(collection(db, 'groups'));
  const group: GroupDoc = {
    id: groupRef.id,
    name,
    code,
    ownerId,
    members: [ownerId],
    createdAt: new Date().toISOString(),
    color: color || '#f43f5e',
    currentBarIndex: 0,
    score: 0,
    ...(eventId ? { eventId } : {}),
  };
  await setDoc(groupRef, group);
  // Routes (barSequence) are assigned authoritatively when the admin starts the crawl
  // (see startCrawl -> recalculateSchedule). We intentionally don't recalculate here:
  // it would batch-write every group in the event, which a non-admin joiner isn't
  // permitted to do, and routes aren't shown until the crawl has started anyway.
  return group;
}

export async function joinGroup({ code, userId, eventId }: { code: string; userId: string; eventId?: string }) {
  const q = query(collection(db, 'groups'), where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error('Group not found.');
  }

  const groupDoc = snapshot.docs[0];
  const group = groupDoc.data() as GroupDoc;

  // Enforce one group per participant per crawl: block joining a different group
  // if the user already belongs to one in this event. Re-joining the same group is a no-op.
  const eventForCheck = eventId ?? group.eventId;
  if (eventForCheck) {
    const existing = await findUserGroupInEvent(userId, eventForCheck);
    if (existing && existing.id !== groupDoc.id) {
      throw new Error("You're already in a group for this crawl.");
    }
  }

  const members = group.members.includes(userId) ? group.members : [...group.members, userId];
  const update = { ...group, members, ...(eventId ? { eventId } : {}) };
  await setDoc(doc(db, 'groups', groupDoc.id), update, { merge: true });
  // No recalculateSchedule here — routes are assigned when the admin starts the crawl.
  // (Recalc batch-writes every group, which a non-admin joiner can't do.)
  return { ...update, id: groupDoc.id } as GroupDoc;
}

export async function getUserGroup(userId: string) {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const groupDoc = snapshot.docs[0];
  const group = groupDoc.data() as GroupDoc;
  return { ...group, id: groupDoc.id };
}

export async function getGroups(): Promise<GroupDoc[]> {
  const snapshot = await getDocs(collection(db, 'groups'));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<GroupDoc, 'id'>) }));
}

export interface GroupMemberInfo {
  uid: string;
  displayName: string;
  email?: string | null;
}

export async function getGroupById(groupId: string): Promise<GroupDoc | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;

  const data = snap.data() as Omit<GroupDoc, 'id'>;
  return { id: snap.id, ...data };
}

export async function getGroupMembers(memberIds: string[]): Promise<GroupMemberInfo[]> {
  if (!memberIds.length) return [];

  const memberDocs = await Promise.all(
    memberIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;

      const data = snap.data() as { displayName?: string; email?: string | null };
      return {
        uid,
        displayName: data.displayName || 'Traveler',
        email: data.email || null,
      };
    }),
  );

  return memberDocs.flatMap((member) => (member ? [member] : []));
}

export async function advanceAllGroupsToNextBar(groupIds: string[], currentBarIndex: number) {
  if (!groupIds.length) return (currentBarIndex + 1) % 4;

  const batch = writeBatch(db);
  const nextBarIndex = (currentBarIndex + 1) % 4;

  groupIds.forEach((groupId) => {
    batch.update(doc(db, 'groups', groupId), { currentBarIndex: nextBarIndex });
  });

  await batch.commit();
  return nextBarIndex;
}

export async function adjustGroupScore(groupId: string, delta: number): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), { score: increment(delta) });
}

export async function updateGroupPicture(groupId: string, pictureUrl: string) {
  await setDoc(doc(db, 'groups', groupId), { pictureUrl }, { merge: true });
}
