"use client";

import { Plus, Wrench } from "lucide-react";

type Request = {
  id: string;
  unit: string;
  tenant: string;
  issue: string;
  status: "Open" | "In progress" | "Resolved";
  date: string;
};

const requests: Request[] = [
  { id: "1", unit: "A2", tenant: "J. Otieno", issue: "Leaking kitchen tap", status: "Open", date: "18 Jul" },
  { id: "2", unit: "B3", tenant: "M. Njoroge", issue: "Bedroom door lock stuck", status: "In progress", date: "15 Jul" },
  { id: "3", unit: "A1", tenant: "N. Wanjiru", issue: "Broken window latch", status: "Resolved", date: "9 Jul" },
];

const statusStyles: Record<Request["status"], string> = {
  Open: "bg-accent-soft text-accent-ink",
  "In progress": "bg-bg-alt text-muted border border-line",
  Resolved: "bg-good-soft text-good",
};

export default function MaintenancePage() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
              <Wrench className="h-5 w-5 text-accent-ink" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
                Maintenance
              </h1>
              <p className="mt-1 text-sm text-muted">
                What tenants have reported, and where each one stands.
              </p>
            </div>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105">
            <Plus className="h-4 w-4" />
            Log request
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-bg-alt p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg font-mono text-xs text-muted">
                  {r.unit}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{r.issue}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.tenant} · reported {r.date}
                  </p>
                </div>
              </div>
              <span
                className={`self-start rounded-full px-2.5 py-1 text-xs font-medium sm:self-auto ${statusStyles[r.status]}`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
