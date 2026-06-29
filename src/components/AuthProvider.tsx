'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { createGroup, joinGroup } from '@/lib/group';

export type DbUser = {
  uid: string;
  email: string | null;
  displayName: string;
  role: 'group' | 'admin';
  updatedAt: string;
} | null;

type AuthContextValue = {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  signIn: (displayName?: string, role?: 'group' | 'admin', mode?: 'create' | 'join', groupName?: string, code?: string) => Promise<{ createdGroupCode?: string } | undefined>;
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
      if (nextUser) {
        // Listen to changes in the user's Firestore document
        const userRef = doc(db, 'users', nextUser.uid);
        unsubscribeDbUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setDbUser(snapshot.data() as DbUser);
          } else {
            setDbUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          setLoading(false);
        });
      } else {
        setDbUser(null);
        setLoading(false);
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
    code?: string
  ) => {
    const result = await signInWithPopup(auth, googleProvider);
    const nextUser = result.user;

    await setDoc(doc(db, 'users', nextUser.uid), {
      uid: nextUser.uid,
      email: nextUser.email,
      displayName: displayName || nextUser.displayName || 'Traveler',
      role: role,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (role === 'admin') {
      return undefined;
    }

    if (mode === 'create' && groupName) {
      const createdGroup = await createGroup({ name: groupName, ownerId: nextUser.uid });
      return { createdGroupCode: createdGroup.code };
    }

    if (mode === 'join' && code) {
      await joinGroup({ code, userId: nextUser.uid });
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
