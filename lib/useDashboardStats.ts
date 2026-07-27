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
 *  - tenants/{propertyId}       → occupied units and rent due
 *  - payments (this month)      → collected amount
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

    let monthlyRentDue = 0;
    let collectedThisMonth = 0;

    // Keep the calculation in step with Collect Rent: both listen to all
    // payments for the selected property and apply the month filter locally.
    // A propertyId + monthKey Firestore query needs a composite index and can
    // otherwise fail before the dashboard receives any payment records.
    function updateRentStats() {
      setStats((s) => ({
        ...s,
        collectedThisMonth,
        outstanding: Math.max(monthlyRentDue - collectedThisMonth, 0),
      }));
    }

    const unsubTenants = onSnapshot(
      query(collection(db, "tenants"), where("propertyId", "==", propertyId)),
      (snap) => {
        monthlyRentDue = snap.docs.reduce(
          (total, doc) => total + (Number(doc.data().rent) || 0),
          0
        );
        setStats((s) => ({ ...s, occupiedUnits: snap.size, loading: false }));
        updateRentStats();
      },
      () => setStats((s) => ({ ...s, loading: false }))
    );

    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("propertyId", "==", propertyId)),
      (snap) => {
        collectedThisMonth = snap.docs
          .filter((doc) => doc.data().monthKey === currentMonthKey())
          .reduce((total, doc) => total + (Number(doc.data().amount) || 0), 0);
        updateRentStats();
      },
      () => {}
    );

    const unsubMaintenance = onSnapshot(
      // Filter the status locally. Combining the property filter with a
      // `!=` filter requires an index and causes the dashboard total to stay
      // blank when that index has not been created yet.
      query(collection(db, "maintenanceRequests"), where("propertyId", "==", propertyId)),
      (snap) =>
        setStats((s) => ({
          ...s,
          openMaintenance: snap.docs.filter((request) => request.data().status !== "Resolved").length,
        })),
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
