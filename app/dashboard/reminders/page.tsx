"use client";

import { useState } from "react";
import { Bell, Plus } from "lucide-react";

type Reminder = {
  id: string;
  title: string;
  detail: string;
  enabled: boolean;
};

const initial: Reminder[] = [
  { id: "1", title: "Rent due", detail: "Sent 3 days before the 1st, to every tenant", enabled: true },
  { id: "2", title: "Rent overdue", detail: "Sent the day after rent is unpaid", enabled: true },
  { id: "3", title: "Water bill due", detail: "Sent 1 day before the 5th", enabled: false },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState(initial);

  function toggle(id: string) {
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
              <Bell className="h-5 w-5 text-accent-ink" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
                Reminders
              </h1>
              <p className="mt-1 text-sm text-muted">
                SMS and push nudges, sent before rent is due — not after.
              </p>
            </div>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105">
            <Plus className="h-4 w-4" />
            New reminder
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-2xl border border-line bg-bg-alt p-4"
            >
              <div>
                <p className="text-sm font-semibold text-fg">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted">{r.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(r.id)}
                aria-pressed={r.enabled}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  r.enabled ? "bg-accent" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    r.enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
