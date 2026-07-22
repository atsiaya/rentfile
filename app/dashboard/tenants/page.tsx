"use client";

import { useState } from "react";
import { Mail, Phone, Plus, Search } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  unit: string;
  phone: string;
  email: string;
  status: "Current" | "Arrears";
};

const tenants: Tenant[] = [
  { id: "1", name: "N. Wanjiru", unit: "A1", phone: "0722 111 222", email: "n.wanjiru@example.com", status: "Current" },
  { id: "2", name: "J. Otieno", unit: "A2", phone: "0733 222 333", email: "j.otieno@example.com", status: "Current" },
  { id: "3", name: "M. Njoroge", unit: "B3", phone: "0711 333 444", email: "m.njoroge@example.com", status: "Arrears" },
];

export default function TenantsPage() {
  const [query, setQuery] = useState("");
  const filtered = tenants.filter((t) =>
    `${t.name} ${t.unit}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
              Tenants
            </h1>
            <p className="mt-1 text-sm text-muted">
              Everyone currently on your ledger, across every property.
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105">
            <Plus className="h-4 w-4" />
            Invite tenant
          </button>
        </div>

        <div className="relative mt-6 flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or unit"
            className="w-full rounded-2xl border border-line bg-bg-alt py-3 pl-11 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
          />
        </div>

        <div className="mt-5 space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-bg-alt p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-mono text-xs font-semibold text-accent-ink">
                  {t.unit}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{t.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" strokeWidth={1.75} />
                      {t.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" strokeWidth={1.75} />
                      {t.email}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`self-start rounded-full px-2.5 py-1 text-xs font-medium sm:self-auto ${
                  t.status === "Current" ? "bg-good-soft text-good" : "bg-accent-soft text-accent-ink"
                }`}
              >
                {t.status}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              No tenants match "{query}".
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
