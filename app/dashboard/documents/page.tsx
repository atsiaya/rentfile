"use client";

import { FileText, Upload } from "lucide-react";

type Doc = {
  id: string;
  name: string;
  tenant: string;
  type: string;
  date: string;
};

const documents: Doc[] = [
  { id: "1", name: "Lease agreement — A1", tenant: "N. Wanjiru", type: "Lease", date: "2 Jan 2026" },
  { id: "2", name: "Lease agreement — A2", tenant: "J. Otieno", type: "Lease", date: "14 Feb 2026" },
  { id: "3", name: "Rent increase notice — B3", tenant: "M. Njoroge", type: "Notice", date: "1 Jun 2026" },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
              Documents
            </h1>
            <p className="mt-1 text-sm text-muted">
              Leases, notices, and receipts — attached to the right tenant.
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105">
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-alt p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg">
                  <FileText className="h-4 w-4 text-muted" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{d.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {d.tenant} · {d.date}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-muted">
                {d.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
