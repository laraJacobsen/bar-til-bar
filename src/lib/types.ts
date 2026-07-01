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
  barId: string;
  challengeId: string;
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
