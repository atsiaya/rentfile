"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type DashboardStats = {
  occupiedUnits: number;
  totalUnits: number;
  collectedThisMonth: number;
  outstanding: number;
  openMaintenance: number;
  loading: boolean;
};

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Reads real Firestore data scoped to one property:
 *  - tenants/{propertyId}       → occupied units
 *  - payments (this month)      → collected vs outstanding
 *  - maintenanceRequests        → open count
 *
 * These collections are only ever written to once the Tenants, Ledger, and
 * Maintenance pages are wired up for real — until then every count here is
 * genuinely 0, not a stand-in. That's intentional: an honest zero beats a
 * fake number.
 */
export function useDashboardStats(propertyId: string | null, totalUnits: number) {
  const [stats, setStats] = useState<DashboardStats>({
    occupiedUnits: 0,
    totalUnits,
    collectedThisMonth: 0,
    outstanding: 0,
    openMaintenance: 0,
    loading: true,
  });

  useEffect(() => {
    if (!propertyId) {
      setStats((s) => ({ ...s, loading: false, occupiedUnits: 0, collectedThisMonth: 0, outstanding: 0, openMaintenance: 0 }));
      return;
    }

    setStats((s) => ({ ...s, loading: true, totalUnits }));

    const unsubTenants = onSnapshot(
      query(collection(db, "tenants"), where("propertyId", "==", propertyId)),
      (snap) => setStats((s) => ({ ...s, occupiedUnits: snap.size, loading: false })),
      () => setStats((s) => ({ ...s, loading: false }))
    );

    const unsubPayments = onSnapshot(
      query(
        collection(db, "payments"),
        where("propertyId", "==", propertyId),
        where("monthKey", "==", currentMonthKey())
      ),
      (snap) => {
        let collected = 0;
        let outstanding = 0;
        snap.forEach((doc) => {
          const d = doc.data();
          const amount = Number(d.amount) || 0;
          if (d.status === "Paid") collected += amount;
          else outstanding += amount;
        });
        setStats((s) => ({ ...s, collectedThisMonth: collected, outstanding }));
      },
      () => {}
    );

    const unsubMaintenance = onSnapshot(
      query(
        collection(db, "maintenanceRequests"),
        where("propertyId", "==", propertyId),
        where("status", "!=", "Resolved")
      ),
      (snap) => setStats((s) => ({ ...s, openMaintenance: snap.size })),
      () => {}
    );

    return () => {
      unsubTenants();
      unsubPayments();
      unsubMaintenance();
    };
  }, [propertyId, totalUnits]);

  return stats;
}
