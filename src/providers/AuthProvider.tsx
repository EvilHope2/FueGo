"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { DriverProfile, Role, UserProfile } from "@/types";
import { buildGeoPoint } from "@/lib/geohash";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  register: (params: {
    email: string;
    password: string;
    name: string;
    role: Exclude<Role, "admin">;
    phone?: string;
  }) => Promise<void>;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function setRoleCookie(role: Role | null) {
  if (!role) {
    document.cookie = "fuego_role=; path=/; max-age=0";
    return;
  }
  document.cookie = `fuego_role=${role}; path=/; max-age=604800`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setRoleCookie(null);
        setLoading(false);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", nextUser.uid));
      if (userSnap.exists()) {
        const userProfile = userSnap.data() as UserProfile;
        setProfile(userProfile);
        setRoleCookie(userProfile.role);
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      register: async ({ email, password, name, role, phone }) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const now = Date.now();
        const userProfile: UserProfile = {
          role,
          name,
          phone,
          createdAt: now,
        };

        await setDoc(doc(db, "users", cred.user.uid), userProfile);

        if (role === "driver") {
          const driverProfile: DriverProfile = {
            status: "pending",
            vehicleType: "auto",
            isOnline: false,
            lastLocation: buildGeoPoint(-53.7878, -67.7095),
            lastSeenAt: now,
          };
          await setDoc(doc(db, "drivers", cred.user.uid), driverProfile);
        }
      },
      login: async ({ email, password }) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        await signOut(auth);
        setRoleCookie(null);
      },
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

