"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type Role = "tenant" | "landlord" | "agent";

export type UserProfile = {
  fullName: string;
  email: string;
  role: Role;
  /** Which dashboard sections an agent may see. Ignored for landlord (full access) and tenant. */
  accessRights?: string[];
};

/**
 * Combines Firebase Auth state with the matching Firestore `users/{uid}` doc.
 * `loading` stays true until both auth and the profile doc have resolved.
 */
export function useUserRecord() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { user, profile, loading };
}

/** Full set of dashboard section keys, used to grant landlords everything. */
export const ALL_ACCESS_KEYS = [
  "home",
  "tenants",
  "collectRent",
  "autopay",
  "ledger",
  "reminders",
  "maintenance",
  "messages",
  "documents",
] as const;

export function accessKeysFor(profile: UserProfile | null): string[] {
  if (!profile) return [];
  if (profile.role === "landlord") return [...ALL_ACCESS_KEYS];
  if (profile.role === "agent") return profile.accessRights ?? ["home"];
  return [];
}
