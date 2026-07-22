"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

type Row = { id: string; label: string; rent: string; enabled: boolean };

const initial: Row[] = [
  { id: "1", label: "A1 — N. Wanjiru", rent: "KES 28,000", enabled: true },
  { id: "2", label: "A2 — J. Otieno", rent: "KES 25,000", enabled: true },
  { id: "3", label: "B3 — M. Njoroge", rent: "KES 30,000", enabled: false },
];

export default function AutopayPage() {
  const [rows, setRows] = useState(initial);

  function toggle(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
            <Zap className="h-5 w-5 text-accent-ink" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
              Autopay
            </h1>
            <p className="mt-1 text-sm text-muted">
              Tenants with autopay on are charged automatically on their due
              date, and the ledger files itself the moment it clears.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-2xl border border-line bg-bg-alt p-4"
            >
              <div>
                <p className="text-sm font-semibold text-fg">{r.label}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{r.rent} / month</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(r.id)}
                aria-pressed={r.enabled}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  r.enabled ? "bg-accent" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    r.enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
