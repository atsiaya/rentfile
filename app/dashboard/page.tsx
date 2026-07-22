"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useUserRecord } from "@/lib/useUserRecord";

const stats = [
  { label: "Units occupied", value: "9 / 10" },
  { label: "Collected this month", value: "KES 261,000" },
  { label: "Outstanding", value: "KES 30,000" },
  { label: "Open maintenance", value: "2" },
];

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

export default function DashboardPage() {
  const { profile } = useUserRecord();
  const hasProperty = false;
  const canManageProperties = profile?.role === "landlord";

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {greeting()}, {firstName(profile?.fullName ?? "")}.
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Here's where things stand across your properties.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-bg-alt p-4">
              <p className="font-display text-xl font-bold text-fg sm:text-2xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs leading-snug text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {hasProperty ? (
        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
          <p className="text-sm text-muted">Ledger goes here.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
