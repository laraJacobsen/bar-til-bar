'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { createGroup, joinGroup } from '@/lib/group';
import { getEventByJoinCode } from '@/lib/firestore';
import { uploadToR2 } from '@/lib/upload';

export type DbUser = {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL?: string | null;
  role: 'group' | 'admin';
  updatedAt: string;
} | null;

type AuthContextValue = {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  signIn: (displayName?: string, role?: 'group' | 'admin', mode?: 'create' | 'join', groupName?: string, code?: string, crawlCode?: string, photoFile?: File) => Promise<{ createdGroupCode?: string } | undefined>;
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

  const signIn = async (
    displayName?: string,
    role: 'group' | 'admin' = 'group',
    mode?: 'create' | 'join',
    groupName?: string,
    code?: string,
    crawlCode?: string,
    photoFile?: File
  ) => {
    const result = await signInWithPopup(auth, googleProvider);
    const nextUser = result.user;

    // Upload the chosen profile image (if any) now that we have a uid. Fall back
    // to Google's avatar so the profile is never empty.
    let photoURL: string | null = nextUser.photoURL ?? null;
    if (photoFile) {
      try {
        photoURL = await uploadToR2(photoFile, { kind: 'profile-picture', userId: nextUser.uid });
      } catch (err) {
        console.error('Profile image upload failed:', err);
      }
    }

    const userData: Record<string, unknown> = {
      uid: nextUser.uid,
      email: nextUser.email,
      displayName: displayName || nextUser.displayName || 'Traveler',
      photoURL,
      updatedAt: new Date().toISOString(),
    };
    if (role === 'admin') userData.role = 'admin';
    await setDoc(doc(db, 'users', nextUser.uid), userData, { merge: true });

    if (role === 'admin') {
      return undefined;
    }

    let eventId: string | undefined;
    if (crawlCode) {
      const event = await getEventByJoinCode(crawlCode);
      if (!event) throw new Error('Invalid crawl code. Check with your organiser.');
      eventId = event.id;
    }

    if (mode === 'create' && groupName) {
      const createdGroup = await createGroup({ name: groupName, ownerId: nextUser.uid, eventId });
      return { createdGroupCode: createdGroup.code };
    }

    if (mode === 'join' && code) {
      await joinGroup({ code, userId: nextUser.uid, eventId });
    }

    return undefined;
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const value = useMemo(() => ({ user, dbUser, loading, signIn, signOutUser }), [user, dbUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
