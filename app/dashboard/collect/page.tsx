"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  User,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = { id: string; name: string; unit: string; rent: number };

type Extracted = {
  name: string;
  amount: string;
  date: string;
  time: string;
};

const methods = ["M-Pesa", "Bank transfer", "Cash"] as const;

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Pulls sender name, amount, date, and time out of a pasted payment
 * confirmation message (M-Pesa's format is the primary target, but the
 * patterns are loose enough to catch similar bank/SMS confirmations).
 * Anything it can't find is left blank for the landlord to fill in by hand.
 */
function extractFromMessage(text: string): Extracted {
  const amountMatch = text.match(/(?:Ksh|KES|KSH)\s?([\d,]+(?:\.\d{1,2})?)/i);
  const nameMatch = text.match(
    /(?:received from|from)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})\s+(?:\d{9,}|on\b)/i
  );
  const dateMatch = text.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const timeMatch = text.match(/at\s+(\d{1,2}:\d{2}\s?[APap]\.?[Mm]\.?)/i);

  return {
    name: nameMatch?.[1]?.trim() ?? "",
    amount: amountMatch?.[1]?.replace(/,/g, "") ?? "",
    date: dateMatch?.[1] ?? "",
    time: timeMatch?.[1]?.replace(/\./g, "").toUpperCase() ?? "",
  };
}

/** DD/MM/YY or DD/MM/YYYY → a real Date, for computing the correct monthKey. */
function parseDate(d: string): Date | null {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, day, month, yearRaw] = m;
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const parsed = new Date(year, Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function CollectRentPage() {
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");

  const [message, setMessage] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<typeof methods[number]>("M-Pesa");
  const [recorded, setRecorded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      return;
    }
    const q = query(collection(db, "tenants"), where("propertyId", "==", selected.id), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? "",
        unit: d.data().unit ?? "",
        rent: Number(d.data().rent) || 0,
      }));
      setTenants(rows);
      setTenantId((prev) => prev || rows[0]?.id || "");
    });
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
          Pick a property from the sidebar to record a payment against it.
        </p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-line bg-bg p-10 text-center shadow-sm sm:p-14">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <Banknote className="h-6 w-6 text-accent-ink" strokeWidth={1.75} />
        </span>
        <h2 className="mt-5 font-display text-xl font-bold text-fg">No tenants yet</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Add a tenant to {selected.name} first, then come back here to record their rent.
        </p>
      </div>
    );
  }

  function handleExtract() {
    if (!message.trim()) return;
    const result = extractFromMessage(message);
    setExtracted(result);
    if (result.amount) setAmount(result.amount);
    if (/m-?pesa/i.test(message)) setMethod("M-Pesa");

    // Try to match the extracted sender to a tenant already on this property.
    if (result.name) {
      const needle = result.name.toLowerCase();
      const match = tenants.find(
        (t) =>
          t.name.toLowerCase() === needle ||
          needle.includes(t.name.toLowerCase()) ||
          t.name.toLowerCase().includes(needle)
      );
      if (match) setTenantId(match.id);
    }
  }

  const tenant = tenants.find((t) => t.id === tenantId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !tenant) return;
    setError(null);
    setSaving(true);
    try {
      const parsedDate = extracted?.date ? parseDate(extracted.date) : null;
      await addDoc(collection(db, "payments"), {
        propertyId: selected.id,
        tenantId: tenant.id,
        tenantName: tenant.name,
        unit: tenant.unit,
        amount: Number(amount) || 0,
        method,
        status: "Paid",
        monthKey: parsedDate ? currentMonthKey(parsedDate) : currentMonthKey(),
        extractedName: extracted?.name ?? null,
        paymentDate: extracted?.date ?? null,
        paymentTime: extracted?.time ?? null,
        rawMessage: message || null,
        createdAt: serverTimestamp(),
      });
      setRecorded(`${tenant.unit} — ${tenant.name} — KES ${amount || "0"} via ${method}`);
      setMessage("");
      setExtracted(null);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record that payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Collect Rent</h1>
          <p className="mt-1 text-sm text-muted">
            Paste a payment confirmation for {selected.name} and we'll pull out the details.
          </p>

          {/* Paste + extract */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-fg">
              Payment message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Paste the M-Pesa or bank SMS here — e.g. “QFH3XXXXXX Confirmed. Ksh28,000.00 received from JANE WANJIRU 0722123456 on 21/7/26 at 2:45 PM…”"
              className="w-full rounded-2xl border border-line bg-bg-alt px-4 py-3.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
            <button
              type="button"
              onClick={handleExtract}
              disabled={!message.trim()}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink disabled:opacity-50"
            >
              <ClipboardPaste className="h-4 w-4" />
              Extract details
            </button>
          </div>

          {/* What we found */}
          {extracted && (
            <div className="mt-5 grid grid-cols-1 gap-2.5 rounded-2xl border border-line bg-bg-alt p-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="truncate text-sm text-fg">
                  {extracted.name || "Name not found"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="truncate text-sm text-fg">
                  {extracted.date || "Date not found"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="truncate text-sm text-fg">
                  {extracted.time || "Time not found"}
                </span>
              </div>
            </div>
          )}

          {/* Confirm / edit before saving */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Tenant</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-2xl border border-line bg-bg-alt px-4 py-3.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.unit} — {t.name} · rent KES {t.rent.toLocaleString()}
                  </option>
                ))}
              </select>
              {extracted?.name && !tenants.some((t) => t.id === tenantId && t.name.toLowerCase() === extracted.name.toLowerCase()) && (
                <p className="mt-1.5 text-xs text-muted">
                  Couldn't confidently match "{extracted.name}" to a tenant — double-check the selection above.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Amount (KES)</label>
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
                      method === m ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-bg text-muted hover:border-accent/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={saving || !amount}
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              Save payment
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
    </div>
  );
}
