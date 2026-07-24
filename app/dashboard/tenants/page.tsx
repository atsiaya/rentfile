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
import { Building2, Loader2, Mail, Phone, Plus, Search, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = {
  id: string;
  name: string;
  unit: string;
  phone: string;
  email: string;
  rent: number;
  status: "Current" | "Arrears";
};

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
  onClose,
}: {
  propertyId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [rent, setRent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addDoc(collection(db, "tenants"), {
        propertyId,
        name,
        unit,
        phone,
        email,
        rent: Number(rent) || 0,
        status: "Current",
        autopayEnabled: false,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that tenant.");
    } finally {
      setSaving(false);
    }
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
              <input required value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. A1" className={fieldClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg">Monthly rent (KES)</label>
              <input required inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="e.g. 28000" className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">Phone</label>
            <div className="relative flex items-center">
              <Phone className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0722 123 456" className={`${fieldClass} pl-12`} />
            </div>
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
          disabled={saving}
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
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      setTenantsLoading(false);
      return;
    }
    setTenantsLoading(true);
    const q = query(collection(db, "tenants"), where("propertyId", "==", selected.id), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTenants(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "",
          unit: d.data().unit ?? "",
          phone: d.data().phone ?? "",
          email: d.data().email ?? "",
          rent: Number(d.data().rent) || 0,
          status: (d.data().status as Tenant["status"]) ?? "Current",
        }))
      );
      setTenantsLoading(false);
    });
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
          ) : (
            <>
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
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="rounded-full bg-bg px-2.5 py-1 font-mono text-xs font-medium text-muted">
                      KES {t.rent.toLocaleString()}/mo
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        t.status === "Current" ? "bg-good-soft text-good" : "bg-accent-soft text-accent-ink"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
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
        <InviteTenantModal propertyId={selected.id} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";
