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

export interface GroupDocType {
  id: string;
  name: string;
  color: string;
  members: string[];
  score: number;
  currentBarId?: string;
  routeProgress: number;
  routeId?: string;
  pictureUrl?: string;
}

export interface BarDoc {
  id: string;
  name: string;
  address: string;
  description: string;
  imageUrl?: string;
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
}

export interface SubmissionDoc {
  id: string;
  groupId: string;
  barId: string;
  challengeId: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  comment?: string;
}
