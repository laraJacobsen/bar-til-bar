'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { createGroup, joinGroup } from '@/lib/group';
import { getEventByJoinCode } from '@/lib/firestore';

export type DbUser = {
  uid: string;
  email: string | null;
  /** The editable screen name shown on the leaderboard/gallery/profile. */
  displayName: string;
  /** The real Google account name, kept separate so it never clobbers the screen name. */
  accountName?: string | null;
  role?: 'group' | 'admin';
  /** True once the user has finished the onboarding flow (chosen a role + set up a group). */
  onboardingComplete?: boolean;
  updatedAt: string;
} | null;

/** Everything the final onboarding step needs to create/join a group and mark the user done. */
export type CompleteOnboardingArgs = {
  displayName: string;
  role: 'group' | 'admin';
  mode?: 'create' | 'join';
  groupName?: string;
  code?: string;
  crawlCode?: string;
};

type AuthContextValue = {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  /** Step 1: run the Google popup and write a minimal user doc. Onboarding is still incomplete. */
  authenticate: () => Promise<{ suggestedName: string }>;
  /** Final step: resolve the crawl code, create/join the group, and mark onboarding complete. */
  completeOnboarding: (args: CompleteOnboardingArgs) => Promise<{ createdGroupCode?: string }>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDbUser = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      // The auth state is now known — render immediately instead of blocking the
      // whole app on the extra user-document read. `dbUser` (role) fills in async;
      // all consumers read it null-safely (`dbUser?.role`).
      setLoading(false);
      if (nextUser) {
        // Listen to changes in the user's Firestore document
        const userRef = doc(db, 'users', nextUser.uid);
        unsubscribeDbUser = onSnapshot(userRef, (snapshot) => {
          setDbUser(snapshot.exists() ? (snapshot.data() as DbUser) : null);
        }, (error) => {
          console.error("Error listening to user document:", error);
        });
      } else {
        setDbUser(null);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDbUser();
    };
  }, []);

  // Step 1 of onboarding: run the Google popup and write a *minimal* user doc.
  // The user is authenticated afterwards but onboarding is still incomplete —
  // no role/group yet. That happens in completeOnboarding().
  const authenticate = async (): Promise<{ suggestedName: string }> => {
    const result = await signInWithPopup(auth, googleProvider);
    const nextUser = result.user;
    const userRef = doc(db, 'users', nextUser.uid);

    const existingSnap = await getDoc(userRef);
    const existing = existingSnap.exists() ? (existingSnap.data() as Record<string, unknown>) : {};
    const googleName = nextUser.displayName || '';

    const userData: Record<string, unknown> = {
      uid: nextUser.uid,
      email: nextUser.email,
      accountName: googleName || null,
      updatedAt: new Date().toISOString(),
    };
    // Seed the screen name from the Google name only if one isn't already stored —
    // never clobber a screen name the user edited on a previous visit.
    if (!existing.displayName) {
      userData.displayName = googleName || 'Traveler';
    }
    await setDoc(userRef, userData, { merge: true });

    const suggestedName = (existing.displayName as string) || googleName || '';
    return { suggestedName };
  };

  // Final step: resolve the crawl code, create/join the group, and mark onboarding
  // complete. Admin is self-serve and skips the crawl-code/group entirely.
  const completeOnboarding = async ({
    displayName,
    role,
    mode,
    groupName,
    code,
    crawlCode,
  }: CompleteOnboardingArgs): Promise<{ createdGroupCode?: string }> => {
    const current = auth.currentUser;
    if (!current) throw new Error('Please sign in before finishing setup.');
    const userRef = doc(db, 'users', current.uid);

    if (role === 'admin') {
      await setDoc(
        userRef,
        {
          displayName: displayName || 'Admin',
          role: 'admin',
          onboardingComplete: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return {};
    }

    let eventId: string | undefined;
    if (crawlCode) {
      const event = await getEventByJoinCode(crawlCode);
      if (!event) throw new Error('Invalid crawl code. Check with your organiser.');
      eventId = event.id;
    }

    // Create/join first — if the "one group per crawl" check throws, we leave
    // onboarding incomplete so the user can correct and retry.
    let createdGroupCode: string | undefined;
    if (mode === 'create' && groupName) {
      const createdGroup = await createGroup({ name: groupName, ownerId: current.uid, eventId });
      createdGroupCode = createdGroup.code;
    } else if (mode === 'join' && code) {
      await joinGroup({ code, userId: current.uid, eventId });
    }

    await setDoc(
      userRef,
      {
        displayName: displayName || 'Traveler',
        role: 'group',
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return { createdGroupCode };
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({ user, dbUser, loading, authenticate, completeOnboarding, signOutUser }),
    [user, dbUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
