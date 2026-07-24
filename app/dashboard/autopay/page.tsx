"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { Building2, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = { id: string; name: string; unit: string; rent: number; autopayEnabled: boolean };

export default function AutopayPage() {
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      return;
    }
    const q = query(collection(db, "tenants"), where("propertyId", "==", selected.id));
    const unsub = onSnapshot(q, (snap) =>
      setTenants(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "",
          unit: d.data().unit ?? "",
          rent: Number(d.data().rent) || 0,
          autopayEnabled: Boolean(d.data().autopayEnabled),
        }))
      )
    );
    return () => unsub();
  }, [selected]);

  if (!selected) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-bg p-10 text-center shadow-sm sm:p-14">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <Building2 className="h-6 w-6 text-accent-ink" strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 font-display text-xl font-bold text-fg">Select a property first</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Pick a property from the sidebar to manage Autopay for its tenants.
        </p>
      </div>
    );
  }

  async function toggle(t: Tenant) {
    await updateDoc(doc(db, "tenants", t.id), { autopayEnabled: !t.autopayEnabled });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
            <Zap className="h-5 w-5 text-accent-ink" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Autopay</h1>
            <p className="mt-1 text-sm text-muted">
              {selected.name} — tenants with Autopay on are charged automatically on their due date.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-2xl border border-line bg-bg-alt p-4">
              <div>
                <p className="text-sm font-semibold text-fg">{t.unit} — {t.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">KES {t.rent.toLocaleString()} / month</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(t)}
                aria-pressed={t.autopayEnabled}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${t.autopayEnabled ? "bg-accent" : "bg-line"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${t.autopayEnabled ? "left-6" : "left-1"}`} />
              </button>
            </div>
          ))}
          {tenants.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              No tenants on {selected.name} yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
