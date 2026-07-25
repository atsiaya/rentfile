"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Bell,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Receipt,
  Wrench,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useUserRecord } from "@/lib/useUserRecord";

type Property = { id: string; name: string; area: string; unitLabels: string[] };
type TenantRecord = { id: string; propertyId: string; unit: string; name: string; email: string; rent: number };

type AvailableUnit = {
  key: string;
  propertyId: string;
  propertyName: string;
  area: string;
  unit: string;
};

export default function UnitsPage() {
  const router = useRouter();
  const { user, profile, loading } = useUserRecord();

  const [properties, setProperties] = useState<Property[]>([]);
  const [tenantRecords, setTenantRecords] = useState<TenantRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [requestState, setRequestState] = useState<Record<string, "sending" | "sent" | "error">>({});

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace("/login?role=tenant");
      return;
    }
    if (profile.role !== "tenant") {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  // Every property's real unit list, plus every tenant record — combined,
  // these tell us which units are actually free right now, and whether the
  // signed-in tenant is already assigned to one.
  useEffect(() => {
    if (!user || !profile || profile.role !== "tenant") return;

    const unsubProps = onSnapshot(collection(db, "properties"), (snap) => {
      setProperties(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "Untitled property",
          area: d.data().area ?? "",
          unitLabels: Array.isArray(d.data().unitLabels) ? d.data().unitLabels : [],
        }))
      );
    });

    const unsubTenants = onSnapshot(collection(db, "tenants"), (snap) => {
      setTenantRecords(
        snap.docs.map((d) => ({
          id: d.id,
          propertyId: d.data().propertyId ?? "",
          unit: d.data().unit ?? "",
          name: d.data().name ?? "",
          email: d.data().email ?? "",
          rent: Number(d.data().rent) || 0,
        }))
      );
      setDataLoading(false);
    });

    return () => {
      unsubProps();
      unsubTenants();
    };
  }, [user, profile]);

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

  // Is this signed-in tenant already assigned somewhere? Matched by email,
  // since that's the identifier a landlord's invite form and this Firebase
  // account both share.
  const myTenantRecord = profile.email
    ? tenantRecords.find((t) => t.email.toLowerCase() === profile.email.toLowerCase())
    : undefined;
  const myProperty = myTenantRecord
    ? properties.find((p) => p.id === myTenantRecord.propertyId)
    : undefined;

  async function handleRequest(u: AvailableUnit) {
    if (!profile) return;
    setRequestState((s) => ({ ...s, [u.key]: "sending" }));
    try {
      const res = await fetch("/api/request-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: u.propertyId,
          unit: u.unit,
          tenantName: profile.fullName,
          tenantEmail: profile.email,
        }),
      });
      if (!res.ok) throw new Error();
      setRequestState((s) => ({ ...s, [u.key]: "sent" }));
    } catch {
      setRequestState((s) => ({ ...s, [u.key]: "error" }));
    }
  }

  const availableUnits: AvailableUnit[] = properties.flatMap((p) =>
    p.unitLabels
      .filter((unit) => !tenantRecords.some((t) => t.propertyId === p.id && t.unit === unit))
      .map((unit) => ({
        key: `${p.id}-${unit}`,
        propertyId: p.id,
        propertyName: p.name,
        area: p.area,
        unit,
      }))
  );

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

        {/* Upper section — swaps entirely based on whether this tenant is already assigned */}
        {dataLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-line bg-bg p-10 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : myTenantRecord && myProperty ? (
          <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-good-soft px-3.5 py-1.5 text-xs font-semibold text-good">
              <span className="h-1.5 w-1.5 rounded-full bg-good" />
              Active tenancy
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Welcome back, {profile.fullName.split(" ")[0]}.
            </h1>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-alt p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-mono text-sm font-semibold text-accent-ink">
                  {myTenantRecord.unit}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{myProperty.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3" strokeWidth={1.75} />
                    {myProperty.area}
                  </p>
                </div>
              </div>
              <p className="font-mono text-sm font-semibold text-fg">
                KES {myTenantRecord.rent.toLocaleString()}/mo
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Welcome, {profile.fullName.split(" ")[0]}.
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              You're not linked to a unit yet — browse what's available or
              ask your landlord for an invite code.
            </p>
          </div>
        )}

        {/* Available units — only relevant to someone still looking for a place */}
        {!dataLoading && !myTenantRecord && (
          <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-lg font-semibold text-fg">
              Available units
            </h2>
            <div className="mt-5 space-y-3">
              {availableUnits.map((u) => (
                <div
                  key={u.key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-alt p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-mono text-xs font-semibold text-accent-ink">
                      {u.unit}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg">{u.propertyName}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="h-3 w-3" strokeWidth={1.75} />
                        {u.area}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRequest(u)}
                    disabled={requestState[u.key] === "sending" || requestState[u.key] === "sent"}
                    className="text-xs font-semibold text-accent-ink hover:underline disabled:no-underline disabled:opacity-70"
                  >
                    {requestState[u.key] === "sending" && "Sending…"}
                    {requestState[u.key] === "sent" && "Request sent ✓"}
                    {requestState[u.key] === "error" && "Couldn't send — try again"}
                    {!requestState[u.key] && "Request unit"}
                  </button>
                </div>
              ))}
              {availableUnits.length === 0 && (
                <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                  No units are listed as available right now — check back soon.
                </p>
              )}
            </div>
          </div>
        )}
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
