"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Loader2, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { useProperty } from "@/lib/propertyContext";
import { useUserRecord } from "@/lib/useUserRecord";

type Tenant = {
  id: string;
  name: string;
  unit: string;
  email: string;
};

type Message = {
  id: string;
  tenantId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
};

function formatTime(timestamp: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const { selected } = useProperty();
  const { user, profile } = useUserRecord();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setTenants([]);
      setMessages([]);
      setActiveId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubTenants = onSnapshot(
      query(collection(db, "tenants"), where("propertyId", "==", selected.id)),
      (snap) => {
        const rows = snap.docs
          .map((entry) => ({
            id: entry.id,
            name: entry.data().name ?? "Unnamed tenant",
            unit: entry.data().unit ?? "",
            email: entry.data().email ?? "",
          }))
          .sort((a, b) => a.unit.localeCompare(b.unit));
        setTenants(rows);
        setActiveId((current) =>
          current && rows.some((tenant) => tenant.id === current)
            ? current
            : rows[0]?.id ?? null
        );
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Couldn't load tenants.");
        setLoading(false);
      }
    );

    // Read all property messages then sort/filter in the browser. This avoids
    // requiring a composite Firestore index for propertyId + createdAt.
    const unsubMessages = onSnapshot(
      query(collection(db, "messages"), where("propertyId", "==", selected.id)),
      (snap) =>
        setMessages(
          snap.docs
            .map((entry) => ({
              id: entry.id,
              tenantId: entry.data().tenantId ?? "",
              text: entry.data().text ?? "",
              senderId: entry.data().senderId ?? "",
              senderName: entry.data().senderName ?? "",
              createdAt: entry.data().createdAt?.toMillis?.() ?? 0,
            }))
            .sort((a, b) => a.createdAt - b.createdAt)
        ),
      (err) => setError(err.message || "Couldn't load messages.")
    );

    return () => {
      unsubTenants();
      unsubMessages();
    };
  }, [selected]);

  const active = tenants.find((tenant) => tenant.id === activeId) ?? null;
  const activeMessages = useMemo(
    () => messages.filter((message) => message.tenantId === activeId),
    [messages, activeId]
  );
  const latestByTenant = useMemo(() => {
    const latest: Record<string, Message> = {};
    for (const message of messages) latest[message.tenantId] = message;
    return latest;
  }, [messages]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !active || !selected || !user) return;

    setSending(true);
    setError(null);
    try {
      await addDoc(collection(db, "messages"), {
        propertyId: selected.id,
        tenantId: active.id,
        tenantName: active.name,
        tenantEmail: active.email,
        text,
        senderId: user.uid,
        senderName: profile?.fullName || user.displayName || "Property manager",
        senderRole: profile?.role ?? "landlord",
        createdAt: serverTimestamp(),
      });
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the message.");
    } finally {
      setSending(false);
    }
  }

  if (!selected) {
    return (
      <div className="rounded-3xl border border-line bg-bg p-10 text-center text-sm text-muted shadow-sm">
        Select a property first to message its tenants.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-bg shadow-sm">
      <div className="grid sm:grid-cols-[280px_1fr]">
        <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
          <h1 className="px-2 pb-3 font-display text-lg font-bold text-fg">Messages</h1>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
          ) : tenants.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted">No tenants on {selected.name} yet.</p>
          ) : (
            <div className="space-y-1">
              {tenants.map((tenant) => {
                const latest = latestByTenant[tenant.id];
                return (
                  <button
                    key={tenant.id}
                    onClick={() => setActiveId(tenant.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition ${tenant.id === activeId ? "bg-accent-soft" : "hover:bg-bg-alt"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{tenant.name} · {tenant.unit}</p>
                      <p className="truncate text-xs text-muted">{latest?.text || tenant.email || "Start a conversation"}</p>
                    </div>
                    {latest && <span className="shrink-0 text-[11px] text-muted">{formatTime(latest.createdAt)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex min-h-[420px] flex-col p-4 sm:p-6">
          {active ? (
            <>
              <div className="border-b border-line pb-4">
                <p className="font-display text-base font-semibold text-fg">{active.name} · Unit {active.unit}</p>
              </div>
              <div className="flex-1 space-y-3 py-4">
                {activeMessages.length === 0 ? (
                  <p className="text-sm text-muted">No messages yet. Start the conversation.</p>
                ) : activeMessages.map((message) => {
                  const mine = message.senderId === user?.uid;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-tr-sm bg-accent text-white" : "rounded-tl-sm bg-bg-alt text-fg"}`}>
                        {!mine && message.senderName && <p className="mb-1 text-xs font-semibold text-muted">{message.senderName}</p>}
                        <p>{message.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-white/75" : "text-muted"}`}>{formatTime(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-t border-line pt-4">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }}
                  placeholder="Write a message…"
                  className="flex-1 rounded-2xl border border-line bg-bg-alt px-4 py-3 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || sending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Choose a tenant to start messaging.</div>
          )}
          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
