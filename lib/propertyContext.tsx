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
};

type PropertyContextValue = {
  properties: Property[];
  loading: boolean;
  selected: Property | null;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
};

const PropertyContext = createContext<PropertyContextValue | null>(null);

/**
 * Loads every property owned by the signed-in landlord (live, via onSnapshot)
 * and tracks which one is currently selected across the dashboard.
 * Agents see the same list for now — scoping properties to an agent's
 * specific assignment is a later step once that data model exists.
 */
export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user } = useUserRecord();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProperties([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "properties"),
      where("ownerId", "==", user.uid),
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
        }));
        setProperties(rows);
        setLoading(false);
        // Keep a selection valid: default to the first property, and if the
        // previously selected one was deleted, fall back rather than pointing nowhere.
        setSelectedId((prev) =>
          prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? null
        );
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user]);

  const selected = properties.find((p) => p.id === selectedId) ?? null;

  return (
    <PropertyContext.Provider
      value={{ properties, loading, selected, selectedId, setSelectedId }}
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
