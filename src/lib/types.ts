export type UserRole = 'group' | 'admin';

export interface EventDoc {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'ended';
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  joinCode?: string;
  started?: boolean;
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
  lat?: number;
  lng?: number;
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
  userId?: string;
  groupId: string;
  groupName?: string;
  // Optional: "just for fun" submissions have no challenge/bar (type === 'fun').
  barId?: string;
  challengeId?: string;
  /** Absent = a challenge submission; 'fun' = a candid photo shared to the gallery. */
  type?: 'challenge' | 'fun';
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  comment?: string;
  pointsAwarded?: number;
  eventId?: string;
}

export interface CrawlArchiveGroup {
  id: string;
  name: string;
  color?: string | null;
  score: number;
  members: string[];
}

export interface CrawlArchiveSubmission {
  id: string;
  groupId: string;
  groupName?: string | null;
  barId: string;
  challengeId: string;
  photoUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded?: number | null;
}

export interface CrawlArchiveBar {
  id: string;
  name: string;
  order: number;
}

export interface CrawlArchive {
  id: string;
  eventId: string;
  eventName: string;
  endedAt: string;
  memberIds: string[];
  groups: CrawlArchiveGroup[];
  submissions: CrawlArchiveSubmission[];
  bars: CrawlArchiveBar[];
}

// One doc per (submissionId, userId) pair — doc id is `${submissionId}_${userId}`,
// so a like is just create/delete of that doc (naturally idempotent, one per user).
export interface ReactionDoc {
  id: string;
  submissionId: string;
  userId: string;
  createdAt: string;
}
