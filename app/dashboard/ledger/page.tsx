"use client";

import { useState } from "react";

type Row = {
  id: string;
  unit: string;
  tenant: string;
  type: string;
  amount: string;
  status: "Paid" | "Due";
  date: string;
};

const rows: Row[] = [
  { id: "1", unit: "A1", tenant: "N. Wanjiru", type: "Rent", amount: "KES 28,000", status: "Paid", date: "1 Jul" },
  { id: "2", unit: "A2", tenant: "J. Otieno", type: "Rent", amount: "KES 25,000", status: "Paid", date: "1 Jul" },
  { id: "3", unit: "A2", tenant: "J. Otieno", type: "Water", amount: "KES 900", status: "Paid", date: "3 Jul" },
  { id: "4", unit: "B3", tenant: "M. Njoroge", type: "Rent", amount: "KES 30,000", status: "Due", date: "1 Jul" },
];

const tabs = ["All", "Paid", "Due"] as const;

export default function LedgerPage() {
  const [tab, setTab] = useState<typeof tabs[number]>("All");
  const filtered = rows.filter((r) => tab === "All" || r.status === tab);
  const outstanding = rows
    .filter((r) => r.status === "Due")
    .reduce((sum, r) => sum + Number(r.amount.replace(/[^\d]/g, "")), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
              Ledger
            </h1>
            <p className="mt-1 text-sm text-muted">
              Every rent and bill line, filed the day it moves.
            </p>
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
                tab === t
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line bg-bg text-muted hover:border-accent/50"
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
                  <p className="text-sm font-medium text-fg">{r.tenant}</p>
                  <p className="text-xs text-muted">{r.type} · {r.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-fg">{r.amount}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    r.status === "Paid" ? "bg-good-soft text-good" : "bg-accent-soft text-accent-ink"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="bg-bg-alt p-6 text-center text-sm text-muted">
              Nothing here yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
