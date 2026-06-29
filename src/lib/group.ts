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
}

export async function createGroup({ name, ownerId, color }: { name: string; ownerId: string; color?: string }) {
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
  };
  await setDoc(groupRef, group);
  return group;
}

export async function joinGroup({ code, userId }: { code: string; userId: string }) {
  const q = query(collection(db, 'groups'), where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error('Group not found.');
  }

  const groupDoc = snapshot.docs[0];
  const group = groupDoc.data() as GroupDoc;
  const members = group.members.includes(userId) ? group.members : [...group.members, userId];
  await setDoc(doc(db, 'groups', groupDoc.id), { ...group, members }, { merge: true });
  return { ...group, id: groupDoc.id, members } as GroupDoc;
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

export function buildBarMeetups(groupNames: string[], barNames: string[]) {
  const labels = groupNames.length >= 4 ? groupNames.slice(0, 4) : [
    ...groupNames,
    ...Array.from({ length: 4 - groupNames.length }, (_, idx) => `Group ${groupNames.length + idx + 1}`),
  ];

  const bars = barNames.length >= 4 ? barNames.slice(0, 4) : [
    ...barNames,
    ...Array.from({ length: 4 - barNames.length }, (_, idx) => `Bar ${barNames.length + idx + 1}`),
  ];

  return [
    { name: bars[0], groups: [labels[0], labels[1]] },
    { name: bars[1], groups: [labels[0], labels[2]] },
    { name: bars[2], groups: [labels[1], labels[3]] },
    { name: bars[3], groups: [labels[2], labels[3]] },
  ];
}

export async function updateGroupScore(groupId: string, newScore: number) {
  await setDoc(doc(db, 'groups', groupId), { score: newScore }, { merge: true });
}

export async function incrementGroupScore(groupId: string, points: number) {
  await updateDoc(doc(db, 'groups', groupId), { score: increment(points) });
}

export async function updateGroupPicture(groupId: string, pictureUrl: string) {
  await setDoc(doc(db, 'groups', groupId), { pictureUrl }, { merge: true });
}
