"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  FileText,
  Loader2,
  User,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = {
  id: string;
  name: string;
  unit: string;
  rent: number;
  createdAtMillis: number;
};

type Payment = {
  id: string;
  tenantId: string;
  tenantName: string;
  unit: string;
  amount: number;
  method: string;
  monthKey: string;
  paymentDate: string | null;
  createdAtMillis: number;
};

const tabs = ["All", "Paid", "Due"] as const;

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyFromMillis(millis: number) {
  if (!millis) return currentMonthKey();
  const d = new Date(millis);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyNMonthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function firstMonthKeyOfYear() {
  return `${new Date().getFullYear()}-01`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

/** How many calendar months a tenant has owed rent for, counting the month
 * they moved in through the current month, inclusive. A tenant who started
 * in May and it's now July owes 3 months of rent (May, June, July) even if
 * they've only ever made one payment. */
function monthsElapsedInclusive(startMillis: number): number {
  if (!startMillis) return 1;
  const start = new Date(startMillis);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return Math.max(months, 1);
}

/**
 * Arrears, not just this month's shortfall. Total owed is rent × every
 * month the tenant has been on the ledger; total paid is EVERY payment
 * they've ever made, not just this month's. The difference is what's
 * actually outstanding — a missed month from three months ago still shows
 * up here even though "this month" on its own would look fully paid.
 */
function arrearsFor(tenant: Tenant, lifetimePaid: number) {
  const totalOwed = tenant.rent * monthsElapsedInclusive(tenant.createdAtMillis);
  const arrears = Math.max(totalOwed - lifetimePaid, 0);
  return { totalOwed, arrears };
}

/** Report modal — pick a period (or a tenant's full lifetime), download a
 * PDF statement of every payment in it. */
function ReportModal({
  propertyName,
  tenants,
  payments,
  onClose,
}: {
  propertyName: string;
  tenants: Tenant[];
  payments: Payment[];
  onClose: () => void;
}) {
  const [tenantId, setTenantId] = useState(""); // "" = all tenants combined
  const [startMonth, setStartMonth] = useState(currentMonthKey());
  const [endMonth, setEndMonth] = useState(currentMonthKey());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTenant = tenants.find((t) => t.id === tenantId) ?? null;

  function applyPreset(preset: "this" | "last3" | "ytd" | "lifetime") {
    const now = currentMonthKey();
    if (preset === "this") {
      setStartMonth(now);
      setEndMonth(now);
    } else if (preset === "last3") {
      setStartMonth(monthKeyNMonthsAgo(2));
      setEndMonth(now);
    } else if (preset === "ytd") {
      setStartMonth(firstMonthKeyOfYear());
      setEndMonth(now);
    } else {
      // Lifetime: from whichever is earlier — the tenant's move-in month
      // (if one is selected) or the earliest payment on record — through now.
      const earliestPaymentKey = payments.map((p) => p.monthKey).filter(Boolean).sort()[0];
      const startKey = selectedTenant
        ? monthKeyFromMillis(selectedTenant.createdAtMillis)
        : earliestPaymentKey ?? now;
      setStartMonth(startKey);
      setEndMonth(now);
    }
  }

  const scopedPayments = payments.filter((p) => (tenantId ? p.tenantId === tenantId : true));
  const inRange = scopedPayments
    .filter((p) => p.monthKey >= startMonth && p.monthKey <= endMonth)
    .sort((a, b) => a.createdAtMillis - b.createdAtMillis);
  const total = inRange.reduce((sum, p) => sum + p.amount, 0);

  async function handleDownload() {
    if (startMonth > endMonth) {
      setError("Start month has to be before the end month.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      // Loaded on demand — a PDF library has no business being in the
      // main bundle for pages that never generate a report.
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const periodLabel =
        startMonth === endMonth ? monthLabel(startMonth) : `${monthLabel(startMonth)} – ${monthLabel(endMonth)}`;

      doc.setFontSize(16);
      doc.text("RentFile — Payment Statement", 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(
        selectedTenant ? `${selectedTenant.name} — Unit ${selectedTenant.unit}, ${propertyName}` : propertyName,
        14,
        26
      );
      doc.text(periodLabel, 14, 32);
      doc.text(`Generated ${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}`, 14, 38);

      autoTable(doc, {
        startY: 46,
        head: [["Date", "Unit", "Tenant", "Method", "Amount (KES)"]],
        body: inRange.map((p) => [
          p.paymentDate ?? new Date(p.createdAtMillis).toLocaleDateString("en-KE"),
          p.unit,
          p.tenantName,
          p.method,
          p.amount.toLocaleString(),
        ]),
        foot: [["", "", "", "Total", total.toLocaleString()]],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [192, 138, 46] },
        footStyles: { fillColor: [246, 247, 249], textColor: 20, fontStyle: "bold" },
      });

      const namePart = selectedTenant ? `-${selectedTenant.name.replace(/\s+/g, "-")}` : "";
      const filename = `${propertyName.replace(/\s+/g, "-")}${namePart}-statement-${startMonth}${
        startMonth !== endMonth ? `_to_${endMonth}` : ""
      }.pdf`;
      doc.save(filename);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the PDF.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-bg p-6 shadow-xl sm:rounded-3xl sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
              <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
              Payment statement
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">
              Generate report
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-fg"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-fg">Tenant</label>
          <div className="relative flex items-center">
            <User className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            >
              <option value="">All tenants (combined)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.unit} — {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => applyPreset("this")} className={presetClass}>This month</button>
          <button type="button" onClick={() => applyPreset("last3")} className={presetClass}>Last 3 months</button>
          <button type="button" onClick={() => applyPreset("ytd")} className={presetClass}>Year to date</button>
          <button type="button" onClick={() => applyPreset("lifetime")} className={presetClass}>
            {selectedTenant ? "Lifetime (since move-in)" : "Lifetime (all records)"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">From</label>
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">To</label>
            <div className="relative flex items-center">
              <Calendar className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
              <input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-bg-alt px-4 py-3.5">
          <span className="text-sm text-muted">{inRange.length} payment{inRange.length === 1 ? "" : "s"} in range</span>
          <span className="font-mono text-sm font-semibold text-fg">KES {total.toLocaleString()}</span>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          onClick={handleDownload}
          disabled={generating || inRange.length === 0}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {generating ? "Generating…" : "Download PDF"}
        </button>
        {inRange.length === 0 && (
          <p className="mt-2 text-center text-xs text-muted">No payments recorded in this range.</p>
        )}
      </div>
    </div>
  );
}

const presetClass =
  "rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-accent-ink";

export default function LedgerPage() {
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tab, setTab] = useState<typeof tabs[number]>("All");
  const [reportOpen, setReportOpen] = useState(false);

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
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name ?? "",
              unit: data.unit ?? "",
              rent: Number(data.rent) || 0,
              createdAtMillis: data.createdAt?.toMillis?.() ?? 0,
            };
          })
        )
    );

    // Full payment history for this property — needed for lifetime arrears
    // AND the report generator, not just the current month. No orderBy, for
    // the same composite-index reason as the Tenants/Collect pages; sorted
    // client-side instead.
    const unsubP = onSnapshot(
      query(collection(db, "payments"), where("propertyId", "==", selected.id)),
      (snap) =>
        setPayments(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              tenantId: data.tenantId ?? "",
              tenantName: data.tenantName ?? "",
              unit: data.unit ?? "",
              amount: Number(data.amount) || 0,
              method: data.method ?? "",
              monthKey: data.monthKey ?? "",
              paymentDate: data.paymentDate ?? null,
              createdAtMillis: data.createdAt?.toMillis?.() ?? 0,
            };
          })
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

  const thisMonth = currentMonthKey();

  const paidByTenantLifetime = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.tenantId] = (acc[p.tenantId] ?? 0) + p.amount;
    return acc;
  }, {});
  const paidByTenantThisMonth = payments
    .filter((p) => p.monthKey === thisMonth)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.tenantId] = (acc[p.tenantId] ?? 0) + p.amount;
      return acc;
    }, {});

  const rows = tenants.map((t) => {
    const lifetimePaid = paidByTenantLifetime[t.id] ?? 0;
    const paidThisMonth = paidByTenantThisMonth[t.id] ?? 0;
    const { totalOwed, arrears } = arrearsFor(t, lifetimePaid);
    const status: "Paid" | "Partial" | "Due" =
      arrears <= 0 ? "Paid" : paidThisMonth > 0 ? "Partial" : "Due";
    return { ...t, paidThisMonth, lifetimePaid, totalOwed, arrears, status };
  });

  const filtered = rows.filter(
    (r) => tab === "All" || (tab === "Paid" ? r.status === "Paid" : r.status !== "Paid")
  );

  // Every tenant's arrears, summed — this is the fix. A tenant who missed
  // last month and paid nothing yet this month still counts, even though
  // "this month" in isolation would show them as merely "Due" for one
  // month's rent rather than however many months have actually piled up.
  const outstanding = rows.reduce((sum, r) => sum + r.arrears, 0);

  const recentPayments = payments
    .filter((p) => p.monthKey === thisMonth)
    .sort((a, b) => b.createdAtMillis - a.createdAtMillis);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Ledger</h1>
            <p className="mt-1 text-sm text-muted">{selected.name}.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink"
            >
              <FileText className="h-4 w-4" />
              Generate report
            </button>
            <div className="rounded-2xl bg-accent-soft px-4 py-2.5 text-right">
              <p className="text-xs text-accent-ink">Outstanding (all arrears)</p>
              <p className="font-mono text-sm font-semibold text-accent-ink">
                KES {outstanding.toLocaleString()}
              </p>
            </div>
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
          {filtered.map((r) => {
            const monthsBehind = r.rent > 0 ? Math.ceil(r.arrears / r.rent) : 0;
            return (
              <div key={r.id} className="bg-bg-alt px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg font-mono text-xs text-muted">
                      {r.unit}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-fg">{r.name}</p>
                      <p className="text-xs text-muted">
                        KES {r.paidThisMonth.toLocaleString()} of {r.rent.toLocaleString()} this month
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      r.status === "Paid"
                        ? "bg-good-soft text-good"
                        : r.status === "Partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-accent-soft text-accent-ink"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.arrears > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span>
                      Total arrears: <span className="font-mono font-semibold">KES {r.arrears.toLocaleString()}</span>
                      {monthsBehind >= 1 && ` — roughly ${monthsBehind} month${monthsBehind === 1 ? "" : "s"} of unpaid rent`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="bg-bg-alt p-6 text-center text-sm text-muted">Nothing here yet.</p>
          )}
        </div>

        {recentPayments.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Recent payments (this month)
            </p>
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-sm"
                >
                  <span className="text-fg">
                    {p.unit} — {p.tenantName}
                  </span>
                  <span className="font-mono text-muted">
                    KES {p.amount.toLocaleString()} · {p.method}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {reportOpen && (
        <ReportModal
          propertyName={selected.name}
          tenants={tenants}
          payments={payments}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
