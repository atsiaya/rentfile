"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Building2, Plus, Wrench, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";

type Tenant = { id: string; name: string; unit: string };
type Request = {
  id: string;
  unit: string;
  tenant: string;
  issue: string;
  status: "Open" | "In progress" | "Resolved";
};

const nextStatus: Record<Request["status"], Request["status"]> = {
  Open: "In progress",
  "In progress": "Resolved",
  Resolved: "Open",
};

const statusStyles: Record<Request["status"], string> = {
  Open: "bg-accent-soft text-accent-ink",
  "In progress": "bg-bg-alt text-muted border border-line",
  Resolved: "bg-good-soft text-good",
};

export default function MaintenancePage() {
  const { selected } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [issue, setIssue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      setRequests([]);
      return;
    }
    const unsubT = onSnapshot(
      query(collection(db, "tenants"), where("propertyId", "==", selected.id)),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, name: d.data().name ?? "", unit: d.data().unit ?? "" }));
        setTenants(rows);
        setTenantId((prev) => prev || rows[0]?.id || "");
      }
    );
    const unsubR = onSnapshot(
      // Sort after reading so the page works without a composite Firestore
      // index for propertyId + createdAt.
      query(collection(db, "maintenanceRequests"), where("propertyId", "==", selected.id)),
      (snap) => {
        const rows = snap.docs.map((d) => ({
            id: d.id,
            unit: d.data().unit ?? "",
            tenant: d.data().tenant ?? "",
            issue: d.data().issue ?? "",
            status: d.data().status ?? "Open",
            createdAt: d.data().createdAt?.toMillis?.() ?? 0,
          }));
        rows.sort((a, b) => b.createdAt - a.createdAt);
        setRequests(rows);
      }
    );
    return () => {
      unsubT();
      unsubR();
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
          Pick a property from the sidebar to see and log maintenance requests.
        </p>
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "maintenanceRequests"), {
        propertyId: selected.id,
        unit: tenant.unit,
        tenant: tenant.name,
        issue,
        status: "Open",
        createdAt: serverTimestamp(),
      });
      setIssue("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function cycleStatus(r: Request) {
    await updateDoc(doc(db, "maintenanceRequests", r.id), { status: nextStatus[r.status] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
              <Wrench className="h-5 w-5 text-accent-ink" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Maintenance</h1>
              <p className="mt-1 text-sm text-muted">{selected.name} — tap a status to move it forward.</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            disabled={tenants.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Log request"}
          </button>
        </div>

        {tenants.length === 0 && (
          <p className="mt-4 text-sm text-muted">Add a tenant to {selected.name} before logging a request.</p>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="mt-6 space-y-3 rounded-2xl border border-line bg-bg-alt p-4">
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.unit} — {t.name}</option>
              ))}
            </select>
            <textarea
              required
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="What's the issue?"
              rows={3}
              className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg placeholder:text-muted/70 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              Log it
            </button>
          </form>
        )}

        <div className="mt-6 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-bg-alt p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg font-mono text-xs text-muted">
                  {r.unit}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{r.issue}</p>
                  <p className="mt-0.5 text-xs text-muted">{r.tenant}</p>
                </div>
              </div>
              <button
                onClick={() => cycleStatus(r)}
                className={`self-start rounded-full px-2.5 py-1 text-xs font-medium transition sm:self-auto ${statusStyles[r.status]}`}
              >
                {r.status}
              </button>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              No maintenance requests logged for {selected.name} yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
