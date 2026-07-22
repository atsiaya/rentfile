"use client";

import { useState } from "react";
import { Banknote, CheckCircle2 } from "lucide-react";

const tenants = [
  { id: "1", label: "A1 — N. Wanjiru", due: "KES 28,000" },
  { id: "2", label: "A2 — J. Otieno", due: "KES 25,000" },
  { id: "3", label: "B3 — M. Njoroge", due: "KES 30,000" },
];

const methods = ["M-Pesa", "Bank transfer", "Cash"] as const;

export default function CollectRentPage() {
  const [tenantId, setTenantId] = useState(tenants[0].id);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<typeof methods[number]>("M-Pesa");
  const [recorded, setRecorded] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tenant = tenants.find((t) => t.id === tenantId);
    setRecorded(`${tenant?.label} — KES ${amount || "0"} via ${method}`);
    setAmount("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Collect Rent
        </h1>
        <p className="mt-1 text-sm text-muted">
          Record a payment that came in outside Autopay — cash, a bank
          transfer, or an M-Pesa payment you confirmed yourself.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">
              Tenant
            </label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full rounded-2xl border border-line bg-bg-alt px-4 py-3.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} · due {t.due}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">
              Amount (KES)
            </label>
            <div className="relative flex items-center">
              <Banknote className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
              <input
                required
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">Method</p>
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    method === m
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line bg-bg text-muted hover:border-accent/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 sm:w-auto"
          >
            Record payment
          </button>
        </form>

        {recorded && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-good-soft px-4 py-3.5 text-sm text-good">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Recorded: {recorded}
          </div>
        )}
      </div>
    </div>
  );
}
