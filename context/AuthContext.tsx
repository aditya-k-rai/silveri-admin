'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { consumeGoogleRedirectResult } from '@/lib/firebase/auth';
import { User } from '@/types';

// Admin AuthContext — stripped of cart/wishlist logic (admin has no storefront).
// All Firebase auth state management and Firestore userDoc fetching is identical
// to the storefront version.

interface AuthContextType {
  user: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!auth);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    // Guard: if Firebase isn't initialized (missing keys), skip auth
    if (!auth) return;

    // If the user just returned from a Google sign-in redirect, finish that
    // first so the server session cookie is created before the auth listener
    // fires its first event. Failures are logged inside the helper.
    consumeGoogleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const prevUid = prevUidRef.current;
      const newUid = firebaseUser?.uid ?? null;
      console.log('[ctx] auth state ->', newUid ?? 'null', '(prev=', prevUid ?? 'null' + ')');

      prevUidRef.current = newUid;

      setUser(firebaseUser);

      try {
        if (firebaseUser && db) {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const data = userSnap.data() as User;
              console.log('[ctx] userDoc loaded role=', data.role, 'blocked=', data.blocked);
              // Auto-sign out blocked users — admin marked them inactive
              if (data.blocked) {
                console.log('[ctx] user blocked, signing out');
                await signOut(auth);
                try {
                  await fetch('/api/auth/session', {
                    method: 'DELETE',
                    cache: 'no-store',
                  });
                } catch {
                  // best-effort cookie cleanup
                }
                setUser(null);
                setUserDoc(null);
                return;
              }
              setUserDoc(data);
            } else {
              console.log('[ctx] no userDoc found in Firestore');
              setUserDoc(null);
            }
          } catch (err) {
            console.error('[ctx] userDoc fetch/create failed:', err);
            setUserDoc(null);
          }
        } else {
          setUserDoc(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userDoc?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
