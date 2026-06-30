export type UserRole = 'group' | 'admin';

export interface EventDoc {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'ended';
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
}

// TeamDoc removed; groups are represented by `GroupDoc` in src/lib/group.ts

export interface BarDoc {
  id: string;
  name: string;
  address: string;
  description: string;
  imageUrl?: string;
  eventId?: string;
  order: number;
}

export interface ChallengeDoc {
  id: string;
  barId: string;
  title: string;
  description: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  requiresPhoto: boolean;
  timeLimit?: number;
  eventId?: string;
}

export interface SubmissionDoc {
  id: string;
  userId: string;
  groupId: string;
  barId: string;
  challengeId: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  comment?: string;
}
