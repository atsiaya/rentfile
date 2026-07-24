"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRecord } from "@/lib/useUserRecord";

export type Property = {
  id: string;
  name: string;
  area: string;
  units: number;
  unitLabels: string[];
};

type PropertyContextValue = {
  properties: Property[];
  loading: boolean;
  error: string | null;
  selected: Property | null;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
};

const PropertyContext = createContext<PropertyContextValue | null>(null);

/**
 * Loads properties from Firestore, scoped by role — this is the part that
 * was silently wrong before: a landlord's properties are matched by
 * `ownerId`, but an agent never owns a property, so the same `ownerId`
 * query always came back empty for them regardless of what a landlord had
 * actually granted. Agents are matched by `agentIds` array-contains instead.
 */
export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useUserRecord();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      setProperties([]);
      setLoading(false);
      return;
    }

    // Tenants don't browse a property list here at all (they land on /units).
    if (profile.role === "tenant") {
      setProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q =
      profile.role === "landlord"
        ? query(
            collection(db, "properties"),
            where("ownerId", "==", user.uid),
            orderBy("createdAt", "desc")
          )
        : // agent — only properties a landlord has explicitly granted them
          query(
            collection(db, "properties"),
            where("agentIds", "array-contains", user.uid),
            orderBy("createdAt", "desc")
          );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "Untitled property",
          area: d.data().area ?? "",
          units: d.data().units ?? 0,
          unitLabels: Array.isArray(d.data().unitLabels) ? d.data().unitLabels : [],
        }));
        setProperties(rows);
        setLoading(false);
        setSelectedId((prev) =>
          prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? null
        );
      },
      (err) => {
        // Surface it instead of failing silently into a permanently-empty list —
        // a missing composite index throws exactly this kind of error.
        console.error("properties listener failed:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, profile]);

  const selected = properties.find((p) => p.id === selectedId) ?? null;

  return (
    <PropertyContext.Provider
      value={{ properties, loading, error, selected, selectedId, setSelectedId }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return ctx;
}
