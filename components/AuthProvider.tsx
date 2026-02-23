"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firebaseAuth, firebaseClientStatus, firestore } from "@/lib/firebaseClient";
import { createDriverProfile, upsertUserProfile } from "@/lib/firestore";
import { Role } from "@/lib/types";

type AuthCtx = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: "client" | "driver") => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseClientStatus.ok) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setLoading(false);
        return;
      }
      const profile = await getDoc(doc(firestore, "users", nextUser.uid));
      setRole((profile.data()?.role || null) as Role | null);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      role,
      loading,
      login: async (email, password) => {
        if (!firebaseClientStatus.ok) throw new Error(firebaseClientStatus.message || "Firebase no configurado");
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      },
      register: async (name, email, password, userRole) => {
        if (!firebaseClientStatus.ok) throw new Error(firebaseClientStatus.message || "Firebase no configurado");
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await upsertUserProfile(cred.user.uid, { name, role: userRole });
        if (userRole === "driver") {
          await createDriverProfile(cred.user.uid);
        }
      },
      logout: async () => {
        if (!firebaseClientStatus.ok) return;
        await signOut(firebaseAuth);
      },
    }),
    [loading, role, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

