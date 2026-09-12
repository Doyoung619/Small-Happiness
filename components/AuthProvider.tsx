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
import { auth } from "@/lib/firebase";

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
    void setPersistence(auth, browserLocalPersistence);
    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        signingIn.current = false;
        setUser(nextUser);
        setLoading(false);
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
    if (auth.currentUser?.isAnonymous) {
      try {
        await linkWithPopup(auth.currentUser, googleProvider);
        return;
      } catch {
        // If this Google account already exists, just switch to it.
      }
    }
    await signInWithPopup(auth, googleProvider);
  };

  const changeName = async (name: string) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name.trim() });
    setUser(auth.currentUser);
  };

  return <AuthContext value={{ user, loading, signInWithGoogle, changeName }}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
