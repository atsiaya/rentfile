"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Building2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = { id: string; name: string; unit: string; rent: number };
type Payment = { id: string; tenantId: string; tenantName: string; unit: string; amount: number; method: string };

const tabs = ["All", "Paid", "Due"] as const;

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function LedgerPage() {
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tab, setTab] = useState<typeof tabs[number]>("All");

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      setPayments([]);
      return;
    }
    const unsubT = onSnapshot(
      query(collection(db, "tenants"), where("propertyId", "==", selected.id)),
      (snap) =>
        setTenants(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name ?? "",
            unit: d.data().unit ?? "",
            rent: Number(d.data().rent) || 0,
          }))
        )
    );
    const unsubP = onSnapshot(
      query(
        collection(db, "payments"),
        where("propertyId", "==", selected.id),
        where("monthKey", "==", currentMonthKey()),
        orderBy("createdAt", "desc")
      ),
      (snap) =>
        setPayments(
          snap.docs.map((d) => ({
            id: d.id,
            tenantId: d.data().tenantId ?? "",
            tenantName: d.data().tenantName ?? "",
            unit: d.data().unit ?? "",
            amount: Number(d.data().amount) || 0,
            method: d.data().method ?? "",
          }))
        )
    );
    return () => {
      unsubT();
      unsubP();
    };
  }, [selected]);

  if (!selected) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-bg p-10 text-center shadow-sm sm:p-14">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <Building2 className="h-6 w-6 text-accent-ink" strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 font-display text-xl font-bold text-fg">Select a property first</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Pick a property from the sidebar to see its ledger.
        </p>
      </div>
    );
  }

  // Per-tenant status for the current month: paid-so-far vs rent owed.
  const rows = tenants.map((t) => {
    const paid = payments
      .filter((p) => p.tenantId === t.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const status: "Paid" | "Due" = paid >= t.rent && t.rent > 0 ? "Paid" : "Due";
    return { ...t, paid, status };
  });

  const filtered = rows.filter((r) => tab === "All" || r.status === tab);
  const outstanding = rows.reduce((sum, r) => sum + Math.max(r.rent - r.paid, 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Ledger</h1>
            <p className="mt-1 text-sm text-muted">{selected.name} — this month.</p>
          </div>
          <div className="rounded-2xl bg-accent-soft px-4 py-2.5 text-right">
            <p className="text-xs text-accent-ink">Outstanding</p>
            <p className="font-mono text-sm font-semibold text-accent-ink">
              KES {outstanding.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                tab === t ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-bg text-muted hover:border-accent/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-bg-alt px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg font-mono text-xs text-muted">
                  {r.unit}
                </span>
                <div>
                  <p className="text-sm font-medium text-fg">{r.name}</p>
                  <p className="text-xs text-muted">
                    KES {r.paid.toLocaleString()} of {r.rent.toLocaleString()} this month
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  r.status === "Paid" ? "bg-good-soft text-good" : "bg-accent-soft text-accent-ink"
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="bg-bg-alt p-6 text-center text-sm text-muted">Nothing here yet.</p>
          )}
        </div>

        {payments.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Recent payments
            </p>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-sm">
                  <span className="text-fg">{p.unit} — {p.tenantName}</span>
                  <span className="font-mono text-muted">KES {p.amount.toLocaleString()} · {p.method}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
