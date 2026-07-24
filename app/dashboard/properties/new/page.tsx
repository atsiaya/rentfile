"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, MapPin, Plus, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRecord } from "@/lib/useUserRecord";

export default function AddPropertyPage() {
  const router = useRouter();
  const { user, profile, loading } = useUserRecord();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [unitInput, setUnitInput] = useState("");
  const [unitLabels, setUnitLabels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ name: string; area: string; unitLabels: string[] } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile || profile.role !== "landlord") {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  function addUnit() {
    const label = unitInput.trim();
    if (!label) return;
    if (unitLabels.some((u) => u.toLowerCase() === label.toLowerCase())) {
      setUnitInput("");
      return;
    }
    setUnitLabels((u) => [...u, label]);
    setUnitInput("");
  }

  function removeUnit(label: string) {
    setUnitLabels((u) => u.filter((x) => x !== label));
  }

  function handleUnitKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addUnit();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (unitLabels.length === 0) {
      setError("Add at least one unit before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await addDoc(collection(db, "properties"), {
        name,
        area,
        units: unitLabels.length,
        unitLabels,
        ownerId: user.uid,
        agentIds: [],
        createdAt: serverTimestamp(),
      });
      setSaved({ name, area, unitLabels });
      setName("");
      setArea("");
      setUnitLabels([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that property. Try again.");
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
            on your dashboard with {saved.unitLabels.length} unit
            {saved.unitLabels.length === 1 ? "" : "s"} in {saved.area}.
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
          Name each unit here — this is the list tenants get assigned from
          later, so it's worth getting the labels right now.
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
            Units
          </label>
          <div className="flex gap-2">
            <input
              value={unitInput}
              onChange={(e) => setUnitInput(e.target.value)}
              onKeyDown={handleUnitKeyDown}
              placeholder="e.g. A1 — press Enter to add"
              className="flex-1 rounded-2xl border border-line bg-bg-alt px-4 py-3.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
            <button
              type="button"
              onClick={addUnit}
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-line text-fg transition hover:border-accent hover:text-accent-ink"
              aria-label="Add unit"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {unitLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {unitLabels.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1.5 pl-3 pr-2 text-sm font-medium text-accent-ink"
                >
                  {u}
                  <button
                    type="button"
                    onClick={() => removeUnit(u)}
                    aria-label={`Remove ${u}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">
            {unitLabels.length === 0
              ? "No units added yet."
              : `${unitLabels.length} unit${unitLabels.length === 1 ? "" : "s"} added.`}
          </p>
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
