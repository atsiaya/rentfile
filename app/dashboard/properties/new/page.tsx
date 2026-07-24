"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, MapPin, Hash } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRecord } from "@/lib/useUserRecord";

export default function AddPropertyPage() {
  const router = useRouter();
  const { user, profile, loading } = useUserRecord();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [units, setUnits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ name: string; area: string; units: string } | null>(null);

  // Only the landlord who owns the workspace can add properties.
  useEffect(() => {
    if (loading) return;
    if (!user || !profile || profile.role !== "landlord") {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      await addDoc(collection(db, "properties"), {
        name,
        area,
        units: Number(units) || 0,
        ownerId: user.uid,
        agentIds: [],
        createdAt: serverTimestamp(),
      });
      // Show a confirmation instead of redirecting immediately — the
      // dashboard's property list is fed by a live Firestore listener
      // (lib/propertyContext.tsx), so by the time someone taps through
      // it's already there without needing a manual refresh.
      setSaved({ name, area, units });
      setName("");
      setArea("");
      setUnits("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save that property. Try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile || profile.role !== "landlord") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="space-y-4">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-bg p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-good-soft">
            <CheckCircle2 className="h-7 w-7 text-good" strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-fg">
            Property added
          </h1>
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-fg">{saved.name}</span> is now
            on your dashboard with {saved.units || 0} unit
            {Number(saved.units) === 1 ? "" : "s"} in {saved.area}.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Go to dashboard
            </Link>
            <button
              onClick={() => setSaved(null)}
              className="inline-flex items-center justify-center rounded-xl border border-line px-6 py-3 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink"
            >
              Add another property
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-lg rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          New property
        </span>

        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-fg">
          Add a property
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Once it's saved, you can invite tenants and start filing rent
          against it.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-fg">
            Property name
          </label>
          <div className="relative flex items-center">
            <Building2 className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kilimani Court"
              className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-fg">
            Area
          </label>
          <div className="relative flex items-center">
            <MapPin className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
            <input
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Kilimani, Nairobi"
              className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-fg">
            Number of units
          </label>
          <div className="relative flex items-center">
            <Hash className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
            <input
              required
              inputMode="numeric"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="e.g. 10"
              className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save property
        </button>
      </form>
    </div>
  );
}
