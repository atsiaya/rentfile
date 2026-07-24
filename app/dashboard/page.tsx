"use client";

import Link from "next/link";
import { Building2, MapPin, Plus } from "lucide-react";
import { useUserRecord } from "@/lib/useUserRecord";
import { useProperty } from "@/lib/propertyContext";
import { useDashboardStats } from "@/lib/useDashboardStats";

function firstName(name: string) {
  if (!name) return "there";
  return name.trim().split(" ")[0];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

export default function DashboardPage() {
  const { profile } = useUserRecord();
  const { properties, loading, selected, setSelectedId } = useProperty();
  const canManageProperties = profile?.role === "landlord";

  const stats = useDashboardStats(selected?.id ?? null, selected?.units ?? 0);

  const statCards = [
    {
      label: "Units occupied",
      value: selected ? `${stats.occupiedUnits} / ${stats.totalUnits}` : "—",
    },
    { label: "Collected this month", value: selected ? formatKES(stats.collectedThisMonth) : "—" },
    { label: "Outstanding", value: selected ? formatKES(stats.outstanding) : "—" },
    { label: "Open maintenance", value: selected ? String(stats.openMaintenance) : "—" },
  ];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {greeting()}, {firstName(profile?.fullName ?? "")}.
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {selected
            ? `Here's where ${selected.name} stands right now.`
            : "Here's where things stand across your properties."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-bg-alt p-4">
              <p className="font-display text-xl font-bold text-fg sm:text-2xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs leading-snug text-muted">{s.label}</p>
            </div>
          ))}
        </div>
        {selected && stats.occupiedUnits === 0 && stats.openMaintenance === 0 && stats.collectedThisMonth === 0 && (
          <p className="mt-4 text-xs text-muted">
            No tenants, payments, or maintenance requests are on record for{" "}
            {selected.name} yet — these numbers will fill in as you add them.
          </p>
        )}
      </div>

      {loading ? null : properties.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-line bg-bg p-10 text-center shadow-sm sm:p-14">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
            <Building2 className="h-6 w-6 text-accent-ink" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 font-display text-xl font-bold text-fg">
            {canManageProperties ? "Add your first property" : "No property assigned yet"}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            {canManageProperties
              ? "Once a property is set up, its ledger, tenants, and reminders will show up right here."
              : "Ask the landlord to assign you to a property so it shows up here."}
          </p>
          {canManageProperties && (
            <Link
              href="/dashboard/properties/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-fg">
              Your properties
            </h2>
            {canManageProperties && (
              <Link
                href="/dashboard/properties/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add another
              </Link>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                  selected?.id === p.id
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-bg-alt hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg">
                    <Building2 className="h-4 w-4 text-muted" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">{p.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" strokeWidth={1.75} />
                      {p.area}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-muted">
                  {p.units} unit{p.units === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
