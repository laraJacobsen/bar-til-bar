import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GroupDoc {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: string[];
  createdAt: string;
}

export async function createGroup({ name, ownerId }: { name: string; ownerId: string }) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const groupRef = doc(collection(db, 'groups'));
  const group: GroupDoc = {
    id: groupRef.id,
    name,
    code,
    ownerId,
    members: [ownerId],
    createdAt: new Date().toISOString(),
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
  return { id: groupDoc.id, name: group.name, code: group.code, ownerId: group.ownerId, members, createdAt: group.createdAt };
}

export async function getUserGroup(userId: string) {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const groupDoc = snapshot.docs[0];
  const group = groupDoc.data() as GroupDoc;
  return { id: groupDoc.id, name: group.name, code: group.code, ownerId: group.ownerId, members: group.members, createdAt: group.createdAt };
}

export async function getGroups(): Promise<GroupDoc[]> {
  const snapshot = await getDocs(collection(db, 'groups'));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<GroupDoc, 'id'>) }));
}

export function buildBarMeetups(groupNames: string[]) {
  const labels = groupNames.length >= 4
    ? groupNames.slice(0, 4)
    : [
        ...groupNames,
        ...Array.from({ length: 4 - groupNames.length }, (_, idx) => `Group ${groupNames.length + idx + 1}`),
      ];

  return [
    { name: 'North Star', groups: [labels[0], labels[1]] },
    { name: 'Velvet Room', groups: [labels[0], labels[2]] },
    { name: 'Neon Tunnel', groups: [labels[1], labels[3]] },
    { name: 'Golden Hour', groups: [labels[2], labels[3]] },
  ];
}
