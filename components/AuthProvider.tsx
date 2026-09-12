"use client";

import {
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
} from "firebase/auth";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
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

  return <AuthContext value={{ user, loading }}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
