'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { createGroup, joinGroup } from '@/lib/group';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (displayName?: string, mode?: 'create' | 'join', groupName?: string, code?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (displayName?: string, mode?: 'create' | 'join', groupName?: string, code?: string) => {
    const result = await signInWithPopup(auth, googleProvider);
    const nextUser = result.user;

    await setDoc(doc(db, 'users', nextUser.uid), {
      uid: nextUser.uid,
      email: nextUser.email,
      displayName: displayName || nextUser.displayName || 'Traveler',
      role: 'team',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (mode === 'create' && groupName) {
      await createGroup({ name: groupName, ownerId: nextUser.uid });
    }

    if (mode === 'join' && code) {
      await joinGroup({ code, userId: nextUser.uid });
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const value = useMemo(() => ({ user, loading, signIn, signOutUser }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
