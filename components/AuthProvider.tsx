"use client";

import {
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/friends";

const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  changeName: (name: string) => Promise<void>;
}>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  changeName: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const signingIn = useRef(false);

  useEffect(() => {
    const auth = firebaseAuth();
    void setPersistence(auth, browserLocalPersistence).catch(() => {});
    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        signingIn.current = false;
        setUser(nextUser);
        setLoading(false);
        void ensureUserProfile(nextUser).catch(() => {});
      } else if (!signingIn.current) {
        signingIn.current = true;
        signInAnonymously(auth).catch(() => {
          signingIn.current = false;
          setLoading(false);
        });
      }
    });
  }, []);

  const signInWithGoogle = async () => {
    const auth = firebaseAuth();
    if (auth.currentUser?.isAnonymous) {
      try {
        const credential = await linkWithPopup(auth.currentUser, googleProvider);
        await ensureUserProfile(credential.user);
        return;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "auth/credential-already-in-use" && code !== "auth/email-already-in-use") {
          throw error;
        }
      }
    }
    const credential = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(credential.user);
  };

  const changeName = async (name: string) => {
    const auth = firebaseAuth();
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name.trim() });
    setUser(auth.currentUser);
  };

  return <AuthContext value={{ user, loading, signInWithGoogle, changeName }}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
