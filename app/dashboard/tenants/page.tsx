"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  Search,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = {
  id: string;
  name: string;
  unit: string;
  phone: string;
  email: string;
  rent: number; // rent due for the current month
  amountPaid: number; // amount paid so far this month
  status: "Current" | "Arrears";
  createdAt: number; // millis, for client-side sorting
};

// Accepts Kenyan mobile formats: 07xx/01xx (10 digits), +254 7xx/1xx,
// or 254 7xx/1xx — with optional spaces/dashes in between.
function isValidKenyanPhone(phone: string) {
  const digits = phone.replace(/[\s-]/g, "");
  return /^(?:\+254|254|0)(7|1)\d{8}$/.test(digits);
}

function paymentInfo(t: Tenant) {
  const balance = Math.max(t.rent - t.amountPaid, 0);
  const label =
    balance <= 0 ? "Paid" : t.amountPaid > 0 ? "Partial" : "Unpaid";
  const className =
    label === "Paid"
      ? "bg-good-soft text-good"
      : label === "Partial"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-50 text-red-700";
  return { balance, label, className };
}

/** Turns a tenant's phone number into a tap-to-choose Call / WhatsApp / SMS menu. */
function ContactMenu({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // wa.me needs a country code with no leading zero or "+". Kenyan numbers
  // typically arrive as 07xx/01xx locally, so normalize those to 254.
  const digits = phone.replace(/\D/g, "");
  const waNumber = digits.startsWith("0")
    ? `254${digits.slice(1)}`
    : digits.startsWith("254")
    ? digits
    : `254${digits}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md hover:text-accent-ink"
      >
        <Phone className="h-3 w-3" strokeWidth={1.75} />
        {phone}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-line bg-bg shadow-lg">
          <a
            href={`tel:${phone}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-fg transition hover:bg-bg-alt"
          >
            <PhoneCall className="h-3.5 w-3.5 text-accent-ink" strokeWidth={1.75} />
            Call
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-fg transition hover:bg-bg-alt"
          >
            <MessageCircle className="h-3.5 w-3.5 text-good" strokeWidth={1.75} />
            WhatsApp
          </a>
          <a
            href={`sms:${phone}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-fg transition hover:bg-bg-alt"
          >
            <MessageSquare className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
            SMS
          </a>
        </div>
      )}
    </div>
  );
}

function NoPropertySelected() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-line bg-bg p-10 text-center shadow-sm sm:p-14">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
        <Building2 className="h-6 w-6 text-accent-ink" strokeWidth={1.75} />
      </span>
      <h2 className="mt-5 font-display text-xl font-bold text-fg">
        Select a property first
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Pick a property from the sidebar (or add one) to see and manage its
        tenants.
      </p>
    </div>
  );
}

/** Invite-tenant modal — its own component so form state resets cleanly each time it opens. */
function InviteTenantModal({
  propertyId,
  unitLabels,
  occupiedUnits,
  onClose,
}: {
  propertyId: string;
  unitLabels: string[];
  occupiedUnits: string[];
  onClose: () => void;
}) {
  const availableUnits = unitLabels.filter((u) => !occupiedUnits.includes(u));
  const allUnitsOccupied = unitLabels.length > 0 && availableUnits.length === 0;

  const [name, setName] = useState("");
  const [unit, setUnit] = useState(availableUnits[0] ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [rent, setRent] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ name: string; unit: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Belt-and-braces: the <select> already disables occupied options, but
    // never trust client-side selection state alone — re-check right before
    // the write goes to Firestore.
    if (!unit || occupiedUnits.includes(unit)) {
      setError("That unit is already occupied — pick a different one.");
      return;
    }

    if (!isValidKenyanPhone(phone)) {
      setPhoneError("Enter a valid phone number, e.g. 0722 123 456 or +254 722 123 456.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "tenants"), {
        propertyId,
        name,
        unit,
        phone,
        email,
        rent: Number(rent) || 0,
        amountPaid: Number(amountPaid) || 0,
        status: "Current",
        autopayEnabled: false,
        createdAt: serverTimestamp(),
      });
      setAdded({ name, unit });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that tenant.");
    } finally {
      setSaving(false);
    }
  }

  if (added) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
        <div className="relative w-full max-w-md rounded-t-3xl border border-line bg-bg p-6 text-center shadow-xl sm:rounded-3xl sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-good-soft">
            <CheckCircle2 className="h-7 w-7 text-good" strokeWidth={1.75} />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-fg">
            Tenant added successfully
          </h2>
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-fg">{added.name}</span> is now
            on unit <span className="font-medium text-fg">{added.unit}</span>.
          </p>
          <button
            onClick={onClose}
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-t-3xl border border-line bg-bg p-6 shadow-xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              New tenant
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">
              Invite tenant
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={fieldClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Unit</label>
              {unitLabels.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-bg-alt px-4 py-2.5 text-xs text-muted">
                  No units on this property yet — add some from Add Property first.
                </p>
              ) : allUnitsOccupied ? (
                <p className="rounded-xl border border-dashed border-line bg-bg-alt px-4 py-2.5 text-xs text-muted">
                  Every unit is occupied — add more units to this property first.
                </p>
              ) : (
                <select
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={fieldClass}
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Monthly rent (KES)</label>
              <input required inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="e.g. 28000" className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">Amount already paid this month (KES)</label>
            <input inputMode="numeric" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" className={fieldClass} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">Phone</label>
            <div className="relative flex items-center">
              <Phone className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
              <input
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError(null);
                }}
                onBlur={() => {
                  if (phone && !isValidKenyanPhone(phone)) {
                    setPhoneError("Enter a valid phone number, e.g. 0722 123 456 or +254 722 123 456.");
                  }
                }}
                placeholder="0722 123 456"
                aria-invalid={!!phoneError}
                className={`${fieldClass} pl-12 ${phoneError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
              />
            </div>
            {phoneError && <p className="mt-1.5 text-xs text-red-600">{phoneError}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">Email</label>
            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tenant@example.com" className={`${fieldClass} pl-12`} />
            </div>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving || unitLabels.length === 0 || allUnitsOccupied}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Add tenant
        </button>
      </form>
    </div>
  );
}

export default function TenantsPage() {
  const router = useRouter();
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      setTenantsLoading(false);
      return;
    }

    setTenantsLoading(true);
    setLoadError(null);

    // NOTE: no orderBy here on purpose. where() + orderBy() on different
    // fields needs a Firestore composite index — if that index doesn't
    // exist, onSnapshot never fires and never errors (without an error
    // handler), so the UI is stuck on the loading spinner forever with no
    // tenants and no error. We sort client-side instead, and we always
    // pass an error handler so a real failure (rules, network, etc.)
    // surfaces instead of spinning silently.
    const q = query(
      collection(db, "tenants"),
      where("propertyId", "==", selected.id)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data();
          const rent = Number(data.rent) || 0;
          const amountPaid = Number(data.amountPaid) || 0;
          const createdAt =
            data.createdAt?.toMillis?.() ?? (data.createdAt ? Date.parse(data.createdAt) : 0);
          return {
            id: d.id,
            name: data.name ?? "",
            unit: data.unit ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            rent,
            amountPaid,
            status:
              (data.status as Tenant["status"]) ??
              (amountPaid >= rent ? "Current" : "Arrears"),
            createdAt,
          } as Tenant;
        });
        rows.sort((a, b) => b.createdAt - a.createdAt);
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

  if (!selected) return <NoPropertySelected />;

  const filtered = tenants.filter((t) =>
    `${t.name} ${t.unit}`.toLowerCase().includes(search.toLowerCase())
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
              Everyone currently on {selected.name}'s ledger.
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Invite tenant
          </button>
        </div>

        <div className="relative mt-6 flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or unit"
            className="w-full rounded-2xl border border-line bg-bg-alt py-3 pl-11 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
          />
        </div>

        <div className="mt-5 space-y-3">
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
          ) : (
            <>
              {filtered.map((t) => {
                const { balance, label, className } = paymentInfo(t);
                return (
                  <div
                    key={t.id}
                    className="flex flex-col gap-4 rounded-2xl border border-line bg-bg-alt p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-mono text-xs font-semibold text-accent-ink">
                          {t.unit}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-fg">{t.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                            <ContactMenu phone={t.phone} />
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" strokeWidth={1.75} />
                              {t.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`self-start rounded-full px-2.5 py-1 text-xs font-medium sm:self-auto ${className}`}
                      >
                        {label}
                      </span>
                    </div>

                    {/* House / unit details */}
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-bg px-3 py-2 text-xs text-muted">
                      <Home className="h-3.5 w-3.5 text-accent-ink" strokeWidth={1.75} />
                      <span className="font-medium text-fg">{selected.name}</span>
                      <span>·</span>
                      <span>Unit {t.unit}</span>
                    </div>

                    {/* Rent for the month: due / paid / balance */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-bg px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted">Rent</p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-fg">
                          {t.rent.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-bg px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted">Paid</p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-good">
                          {t.amountPaid.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-bg px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted">Unpaid</p>
                        <p
                          className={`mt-0.5 font-mono text-sm font-semibold ${
                            balance > 0 ? "text-red-600" : "text-good"
                          }`}
                        >
                          {balance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Deep-links into the /collect route, which reads the
                        `tenant` query param and opens the payment-collection
                        modal pre-scoped to this tenant. */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => router.push(`/collect?tenant=${t.id}`)}
                        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:bg-accent-soft"
                      >
                        Record payment
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                  {tenants.length === 0 ? "No tenants added yet." : `No tenants match "${search}".`}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {showInvite && (
        <InviteTenantModal
          propertyId={selected.id}
          unitLabels={selected.unitLabels}
          occupiedUnits={tenants.map((t) => t.unit)}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
