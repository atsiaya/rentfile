"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type Thread = {
  id: string;
  name: string;
  unit: string;
  preview: string;
  time: string;
  unread?: boolean;
};

const threads: Thread[] = [
  { id: "1", name: "M. Njoroge", unit: "B3", preview: "I'll clear the balance by Friday, apologies for the delay.", time: "10:42", unread: true },
  { id: "2", name: "J. Otieno", unit: "A2", preview: "Received the receipt, thank you!", time: "Yesterday" },
  { id: "3", name: "N. Wanjiru", unit: "A1", preview: "Is the water bill included this month?", time: "Mon" },
];

export default function MessagesPage() {
  const [activeId, setActiveId] = useState(threads[0].id);
  const [draft, setDraft] = useState("");
  const active = threads.find((t) => t.id === activeId)!;

  return (
    <div className="rounded-3xl border border-line bg-bg shadow-sm">
      <div className="grid sm:grid-cols-[280px_1fr]">
        {/* Threads */}
        <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
          <h1 className="px-2 pb-3 font-display text-lg font-bold text-fg">
            Messages
          </h1>
          <div className="space-y-1">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                  t.id === activeId ? "bg-accent-soft" : "hover:bg-bg-alt"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">
                    {t.name} · {t.unit}
                  </p>
                  <p className="truncate text-xs text-muted">{t.preview}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-muted">{t.time}</span>
                  {t.unread && <span className="h-2 w-2 rounded-full bg-accent" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active thread */}
        <div className="flex min-h-[420px] flex-col p-4 sm:p-6">
          <div className="border-b border-line pb-4">
            <p className="font-display text-base font-semibold text-fg">
              {active.name} · Unit {active.unit}
            </p>
          </div>

          <div className="flex-1 space-y-3 py-4">
            <div className="max-w-xs rounded-2xl rounded-tl-sm bg-bg-alt px-4 py-2.5 text-sm text-fg">
              {active.preview}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-line pt-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a reply…"
              className="flex-1 rounded-2xl border border-line bg-bg-alt px-4 py-3 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
            />
            <button
              onClick={() => setDraft("")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:brightness-105"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
