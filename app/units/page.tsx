"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Bell,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Receipt,
  Wrench,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useUserRecord } from "@/lib/useUserRecord";

type Unit = {
  id: string;
  property: string;
  unit: string;
  area: string;
  rent: string;
  status: "Available" | "Occupied";
};

const units: Unit[] = [
  { id: "1", property: "Kilimani Court", unit: "B3", area: "Kilimani, Nairobi", rent: "KES 30,000 / mo", status: "Available" },
  { id: "2", property: "Riverside Apartments", unit: "C1", area: "Kileleshwa, Nairobi", rent: "KES 42,000 / mo", status: "Available" },
  { id: "3", property: "Kilimani Court", unit: "A1", area: "Kilimani, Nairobi", rent: "KES 28,000 / mo", status: "Occupied" },
];

export default function UnitsPage() {
  const router = useRouter();
  const { user, profile, loading } = useUserRecord();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace("/login?role=tenant");
      return;
    }
    // Landlords and agents manage properties from the dashboard, not here.
    if (profile.role !== "tenant") {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/");
  }

  if (loading || !profile || profile.role !== "tenant") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const available = units.filter((u) => u.status === "Available");

  return (
    <div className="min-h-screen bg-bg-alt pb-24">
      <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between rounded-3xl border border-line bg-bg px-5 py-3.5 shadow-sm">
          <span className="font-display text-lg font-bold tracking-tight text-fg">
            RentFile
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-medium text-muted transition hover:text-fg"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>

        {/* Greeting */}
        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Welcome, {profile.fullName.split(" ")[0]}.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            You're not linked to a unit yet — browse what's available or ask
            your landlord for an invite code.
          </p>
        </div>

        {/* Available units */}
        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-lg font-semibold text-fg">
            Available units
          </h2>
          <div className="mt-5 space-y-3">
            {available.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-alt p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-mono text-xs font-semibold text-accent-ink">
                    {u.unit}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">
                      {u.property}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" strokeWidth={1.75} />
                      {u.area}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-fg">
                    {u.rent}
                  </p>
                  <button className="mt-1 text-xs font-semibold text-accent-ink hover:underline">
                    Request unit
                  </button>
                </div>
              </div>
            ))}
            {available.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                No units are listed as available right now — check back soon.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-line bg-bg/95 px-2 py-2 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-around">
          <button className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-accent-ink">
            <Home className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-muted">
            <Receipt className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Payments</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-muted">
            <Wrench className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Requests</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-muted">
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Alerts</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
