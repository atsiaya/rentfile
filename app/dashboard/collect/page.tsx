"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Home,
  Loader2,
  Phone,
  Plus,
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
  phone: string;
};

type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  monthKey: string;
};

type Extracted = {
  name: string;
  phone: string;
  email: string;
  amount: string;
  date: string;
  time: string;
};

type MatchMethod = "phone" | "name" | null;

const methods = ["M-Pesa", "Bank transfer", "Cash"] as const;

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

/** Formats a Date as the local calendar day (YYYY-MM-DD) for an <input
 * type="date">. NEVER use Date.toISOString() for this — it converts to UTC
 * first, so for Kenya (UTC+3) local midnight on the 24th becomes 21:00 UTC
 * on the 23rd, and the date silently shifts back a day. */
function toLocalDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** DD/MM/YY or DD/MM/YYYY → a real Date, for computing the correct monthKey
 * and for pre-filling the date field. */
function parseDate(d: string): Date | null {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, day, month, yearRaw] = m;
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const parsed = new Date(year, Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Converts a 12-hour time like "3:35 PM" into the 24-hour "HH:MM" format
 * <input type="time"> actually requires. Without this, the extracted time
 * is silently rejected by the browser and the field just stays empty —
 * it looks like extraction failed when it actually succeeded. */
function to24HourTime(raw: string): string | null {
  const m = raw.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return null;
  const [, hh, mm, apRaw] = m;
  let hour = parseInt(hh, 10);
  const ap = apRaw.toUpperCase();
  if (ap === "PM" && hour !== 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${mm}`;
}

/**
 * Reduces any phone representation — full ("0722111222", "+254722111222")
 * or Safaricom's privacy-masked SMS format ("0710***565") — down to a
 * 9-character local string with the leading 0/254 stripped, keeping any
 * "*" characters as-is. Both a stored tenant number and a masked SMS
 * number normalize to the same shape, which is what makes comparing them
 * possible at all.
 */
function normalizeLocal9(raw: string): string {
  let d = raw.replace(/[^\d*]/g, "");
  if (d.startsWith("254")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return d.slice(-9);
}

/**
 * Compares a tenant's on-file phone number against a phone number pulled
 * from an SMS, tolerating masked digits. A "*" in the SMS number matches
 * any digit; every other position must match exactly. This is the only way
 * to verify a masked number at all — Safaricom's own confirmation SMS
 * never reveals the middle digits, so exact string equality would never
 * succeed on a real message.
 */
function phoneMatches(tenantPhone: string, extractedPhone: string): boolean {
  if (!tenantPhone || !extractedPhone) return false;
  const a = normalizeLocal9(tenantPhone);
  const b = normalizeLocal9(extractedPhone);
  if (a.length !== 9 || b.length !== 9) return false;
  for (let i = 0; i < 9; i++) {
    if (b[i] === "*") continue;
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Pulls sender name, phone, amount, date, and time out of a pasted payment
 * confirmation message. Safaricom's actual format masks the middle of the
 * phone number ("0710***565") and sometimes has a double space between
 * first and last name — both patterns below account for that; a plain
 * digit-only assumption (no asterisks) misses real M-Pesa messages
 * entirely, which is what was happening before.
 */
function extractFromMessage(text: string): Extracted {
  const amountMatch = text.match(/(?:Ksh|KES|KSH)\s?([\d,]+(?:\.\d{1,2})?)/i);

  // Name ends where a phone-like token (digits and/or mask asterisks, 6+
  // chars) or the word "on" begins — not "9+ pure digits", which a masked
  // number like "0710***565" never satisfies.
  const nameMatch = text.match(
    /(?:received from|from)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})\s+(?:[\d*]{6,}|on\b)/i
  );

  // Matches both a full number ("0722123456") and Safaricom's masked SMS
  // format ("0710***565" / "254710***565").
  const phoneMatch = text.match(
    /(?:\+?254|0)7\d{8}|(?:\+?254|0)\d{1,3}\*{2,6}\d{1,4}/
  );

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const dateMatch = text.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const timeMatch = text.match(/at\s+(\d{1,2}:\d{2}\s?[APap]\.?[Mm]\.?)/i);

  return {
    // Collapse the double space Safaricom sometimes puts between names.
    name: nameMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "",
    phone: phoneMatch?.[0] ?? "",
    email: emailMatch?.[0] ?? "",
    amount: amountMatch?.[1]?.replace(/,/g, "") ?? "",
    date: dateMatch?.[1] ?? "",
    time: timeMatch?.[1]?.replace(/\./g, "").toUpperCase() ?? "",
  };
}

/** Add-payment modal, scoped to one tenant. Paste an SMS to auto-fill amount
 * /date/time, or just type them in by hand — both feed the same fields. */
function AddPaymentModal({
  propertyId,
  tenant,
  monthKey,
  onClose,
  onSaved,
}: {
  propertyId: string;
  tenant: Tenant;
  monthKey: string;
  onClose: () => void;
  onSaved: (amount: number) => void;
}) {
  const [message, setMessage] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [matchMethod, setMatchMethod] = useState<MatchMethod>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toLocalDateInputValue(new Date()));
  const [time, setTime] = useState("");
  const [method, setMethod] = useState<typeof methods[number]>("M-Pesa");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExtract() {
    if (!message.trim()) return;
    const result = extractFromMessage(message);
    setExtracted(result);
    if (result.amount) setAmount(result.amount);
    if (/m-?pesa/i.test(message)) setMethod("M-Pesa");

    const parsed = result.date ? parseDate(result.date) : null;
    if (parsed) setDate(toLocalDateInputValue(parsed));
    if (result.time) {
      const t24 = to24HourTime(result.time);
      if (t24) setTime(t24);
    }

    // Actually verify the SMS against THIS tenant's on-file phone/name —
    // masked-aware for phone, fuzzy substring for name — rather than just
    // checking that some phone number was present at all.
    let via: MatchMethod = null;
    if (result.phone && phoneMatches(tenant.phone, result.phone)) {
      via = "phone";
    } else if (result.name) {
      const needle = result.name.toLowerCase();
      const tenantName = tenant.name.toLowerCase();
      if (tenantName === needle || needle.includes(tenantName) || tenantName.includes(needle)) {
        via = "name";
      }
    }
    setMatchMethod(via);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const parsedDate = new Date(date);
      const effectiveMonthKey = Number.isNaN(parsedDate.getTime())
        ? monthKey
        : currentMonthKey(parsedDate);

      await addDoc(collection(db, "payments"), {
        propertyId,
        tenantId: tenant.id,
        tenantName: tenant.name,
        unit: tenant.unit,
        amount: Number(amount) || 0,
        method,
        status: "Paid",
        monthKey: effectiveMonthKey,
        matchMethod,
        extractedName: extracted?.name ?? null,
        extractedPhone: extracted?.phone ?? null,
        extractedEmail: extracted?.email ?? null,
        paymentDate: date || null,
        paymentTime: time || null,
        rawMessage: message || null,
        createdAt: serverTimestamp(),
      });
      onSaved(Number(amount) || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record that payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-bg p-6 shadow-xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {monthLabel(monthKey)}
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">
              Add payment
            </h2>
            <p className="mt-1 text-sm text-muted">
              {tenant.unit} — {tenant.name} · rent KES {tenant.rent.toLocaleString()}
            </p>
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

        {/* Paste + extract */}
        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-fg">
            Paste payment SMS (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="e.g. “QFH3XXXXXX Confirmed. You have received Ksh2,500.00 from JACK WACHANA 0710***565 on 24/7/26 at 3:35 PM…”"
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

        {extracted && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-line bg-bg-alt p-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="truncate text-sm text-fg">{extracted.name || "Name not found"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="truncate text-sm text-fg">{extracted.phone || "Phone not found"}</span>
              </div>
            </div>
            {matchMethod ? (
              <div className="flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-2.5 text-sm text-good">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                SMS {matchMethod === "phone" ? "phone number" : "name"} matches {tenant.name}.
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent-ink">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Couldn't confirm this SMS belongs to {tenant.name} — double-check before saving.
              </div>
            )}
          </div>
        )}

        {/* Manual / confirmed fields */}
        <div className="mt-6 space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Date paid</label>
              <div className="relative flex items-center">
                <Calendar className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Time paid</label>
              <div className="relative flex items-center">
                <Clock className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-2xl border border-line bg-bg-alt py-3.5 pl-12 pr-4 text-sm text-fg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                />
              </div>
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
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving || !amount}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save payment
        </button>
      </form>
    </div>
  );
}

export default function CollectRentPage() {
  const { selected } = useProperty();
  const monthKey = currentMonthKey();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [justRecorded, setJustRecorded] = useState<string | null>(null);

  // Tenants for the selected property. No orderBy here on purpose — see the
  // Tenants page for why (avoids needing a Firestore composite index, which
  // otherwise leaves onSnapshot never firing and the UI stuck loading).
  useEffect(() => {
    if (!selected) {
      setTenants([]);
      setTenantsLoading(false);
      return;
    }
    setTenantsLoading(true);
    setLoadError(null);
    const q = query(collection(db, "tenants"), where("propertyId", "==", selected.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({
            id: d.id,
            name: d.data().name ?? "",
            unit: d.data().unit ?? "",
            rent: Number(d.data().rent) || 0,
            phone: d.data().phone ?? "",
          }))
          .sort((a, b) => a.unit.localeCompare(b.unit));
        setTenants(rows);
        setTenantsLoading(false);
      },
      (err) => {
        setLoadError(err.message || "Couldn't load tenants.");
        setTenantsLoading(false);
      }
    );
    return () => unsub();
  }, [selected]);

  // All payments for this property — filtered to the current month client-side
  // rather than adding a second where() clause, to sidestep index requirements.
  useEffect(() => {
    if (!selected) {
      setPayments([]);
      return;
    }
    const q = query(collection(db, "payments"), where("propertyId", "==", selected.id));
    const unsub = onSnapshot(q, (snap) => {
      setPayments(
        snap.docs.map((d) => ({
          id: d.id,
          tenantId: d.data().tenantId ?? "",
          amount: Number(d.data().amount) || 0,
          monthKey: d.data().monthKey ?? "",
        }))
      );
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
          Pick a property from the sidebar to collect rent against it.
        </p>
      </div>
    );
  }

  const paidByTenant = payments
    .filter((p) => p.monthKey === monthKey)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.tenantId] = (acc[p.tenantId] ?? 0) + p.amount;
      return acc;
    }, {});

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Collect Rent</h1>
          <p className="mt-1 text-sm text-muted">
            {selected.name} · {monthLabel(monthKey)}
          </p>
        </div>

        {justRecorded && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-good-soft px-4 py-3.5 text-sm text-good">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {justRecorded}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <div>
                <p className="font-semibold">Couldn't load tenants</p>
                <p className="mt-0.5 text-red-600">{loadError}</p>
              </div>
            </div>
          ) : tenants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              No tenants on {selected.name} yet — add one from the Tenants page first.
            </p>
          ) : (
            tenants.map((t) => {
              const paid = paidByTenant[t.id] ?? 0;
              const balance = Math.max(t.rent - paid, 0);
              const label = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Overdue";
              const badgeClass =
                label === "Paid"
                  ? "bg-good-soft text-good"
                  : label === "Partial"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-50 text-red-700";

              return (
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
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Home className="h-3 w-3" strokeWidth={1.75} />
                        Rent KES {t.rent.toLocaleString()}/mo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="rounded-xl bg-bg px-3 py-1.5 text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted">Paid</p>
                      <p className="font-mono text-sm font-semibold text-good">{paid.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-bg px-3 py-1.5 text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        {label === "Overdue" ? "Overdue" : "Balance"}
                      </p>
                      <p className={`font-mono text-sm font-semibold ${balance > 0 ? "text-red-600" : "text-good"}`}>
                        {balance.toLocaleString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>{label}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTenant(t)}
                      aria-label={`Add payment for ${t.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:brightness-105"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {activeTenant && (
        <AddPaymentModal
          propertyId={selected.id}
          tenant={activeTenant}
          monthKey={monthKey}
          onClose={() => setActiveTenant(null)}
          onSaved={(amount) => {
            setJustRecorded(`${activeTenant.unit} — ${activeTenant.name} — KES ${amount.toLocaleString()} recorded.`);
            setActiveTenant(null);
          }}
        />
      )}
    </div>
  );
}
