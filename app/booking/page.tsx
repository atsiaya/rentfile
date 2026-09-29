"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * TEST PAGE — not part of RentFile's own product surface or design system.
 * Built to visually clone a reference booking UI screenshot exactly, for
 * one-off testing. Safe to delete: just remove /app/booking entirely and
 * nothing else in the app references this route.
 *
 * Firestore layout:
 *   applications/{applicationId}
 *   applications/{applicationId}/appointments/{appointmentId}
 *     - uid: "/application/{applicationId}/appointments/{appointmentId}/edit-appointment"
 *   appointmentSlots/{date}_{hour}   ← one doc per taken slot, capacity 1,
 *     created inside a transaction so two testers can never double-book
 *     the same date+hour even if they click at the same instant.
 */

const HOURS = [8, 9, 10, 11, 12, 14, 15]; // 1pm (13) deliberately skipped — lunch
const LOCATION = "Nairobi KE Nyayo Hse GR fl";

type Appointment = {
  id: string;
  applicationId: string;
  refNumber: string;
  date: string; // YYYY-MM-DD
  hour: number;
  status: "SUBMITTED" | "PAID";
  submittedAt: number;
  uid: string;
};

function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

function formatDateLong(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function randomDigits(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function randomRef() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `EPP1-${s}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Persists a stable per-device "applicationId" (the {15367282}-style
 * numeric id in the endpoint example) across reloads, so "recent
 * applications" survives a refresh during testing. */
function getOrCreateApplicationId(): string {
  const key = "rentfile_test_applicationId";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = randomDigits(8);
    if (typeof window !== "undefined") localStorage.setItem(key, id);
  }
  return id;
}

export default function BookingTestPage() {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");

  const [date, setDate] = useState("");
  const [dateChecked, setDateChecked] = useState(false);
  const [dateFull, setDateFull] = useState(false);
  const [takenHours, setTakenHours] = useState<Set<number>>(new Set());
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApplicationId(getOrCreateApplicationId());
  }, []);

  // Live list of this test "user"'s appointments.
  useEffect(() => {
    if (!applicationId) return;
    const q = query(collection(db, "appointments"), where("applicationId", "==", applicationId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => d.data() as Appointment);
      rows.sort((a, b) => b.submittedAt - a.submittedAt);
      setAppointments(rows);
    });
    return () => unsub();
  }, [applicationId]);

  async function checkDate(chosen: string) {
    setDate(chosen);
    setSelectedHour(null);
    setDateChecked(false);
    setDateFull(false);
    setTakenHours(new Set());
    setError(null);
    if (!chosen) return;

    const snap = await getDocs(query(collection(db, "appointmentSlots"), where("date", "==", chosen)));
    const taken = new Set<number>();
    snap.forEach((d) => taken.add(Number(d.data().hour)));
    setTakenHours(taken);
    setDateFull(HOURS.every((h) => taken.has(h)));
    setDateChecked(true);
  }

  async function handleBook() {
    if (!applicationId || !date || selectedHour == null) return;
    setBooking(true);
    setError(null);

    const slotId = `${date}_${selectedHour}`;
    const slotRef = doc(db, "appointmentSlots", slotId);
    const appointmentId = randomDigits(7);
    const uid = `/application/${applicationId}/appointments/${appointmentId}/edit-appointment`;

    try {
      await runTransaction(db, async (tx) => {
        const slotSnap = await tx.get(slotRef);
        if (slotSnap.exists()) {
          throw new Error("That slot was just taken — pick another time.");
        }
        tx.set(slotRef, {
          date,
          hour: selectedHour,
          applicationId,
          appointmentId,
          createdAt: serverTimestamp(),
        });

        const appointmentRef = doc(
          db,
          "applications",
          applicationId,
          "appointments",
          appointmentId
        );
        tx.set(appointmentRef, {
          id: appointmentId,
          applicationId,
          refNumber: randomRef(),
          date,
          hour: selectedHour,
          location: LOCATION,
          status: "PAID",
          submittedAt: Date.now(),
          uid,
        });

        // Flat mirror collection for the simple onSnapshot query above —
        // avoids a Firestore collectionGroup index just for this test page.
        const flatRef = doc(db, "appointments", `${applicationId}_${appointmentId}`);
        tx.set(flatRef, {
          id: appointmentId,
          applicationId,
          refNumber: randomRef(),
          date,
          hour: selectedHour,
          status: "PAID" as const,
          submittedAt: Date.now(),
          uid,
        });
      });

      setDate("");
      setDateChecked(false);
      setSelectedHour(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't book that slot.");
    } finally {
      setBooking(false);
    }
  }

  const filtered = appointments.filter((a) =>
    a.refNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "-apple-system, Helvetica, Arial, sans-serif", color: "#111" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Your recent applications</h1>
          <button
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: "#374151",
              background: "#fff",
            }}
          >
            VIEW ALL
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ref number"
          style={{
            width: "100%",
            marginTop: 20,
            padding: "16px 20px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 17,
            color: "#111",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Booking form */}
        <div style={{ marginTop: 24, background: "#f7f7f8", borderRadius: 16, padding: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Book biometric appointment
          </p>

          <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
            Date
          </label>
          <input
            type="date"
            min={todayStr()}
            value={date}
            onChange={(e) => checkDate(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 15,
              boxSizing: "border-box",
              background: "#fff",
            }}
          />

          {dateChecked && dateFull && (
            <p style={{ marginTop: 10, fontSize: 13.5, color: "#b91c1c" }}>
              This date is fully booked — please choose another date.
            </p>
          )}

          {dateChecked && !dateFull && (
            <>
              <label style={{ display: "block", fontSize: 13, color: "#6b7280", margin: "16px 0 8px" }}>
                Time
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {HOURS.map((h) => {
                  const taken = takenHours.has(h);
                  const selected = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={taken}
                      onClick={() => setSelectedHour(h)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        border: selected ? "1.5px solid #2563eb" : "1px solid #d1d5db",
                        background: taken ? "#f3f4f6" : selected ? "#eff6ff" : "#fff",
                        color: taken ? "#9ca3af" : selected ? "#2563eb" : "#111",
                        textDecoration: taken ? "line-through" : "none",
                        cursor: taken ? "not-allowed" : "pointer",
                      }}
                    >
                      {hourLabel(h)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {error && <p style={{ marginTop: 12, fontSize: 13.5, color: "#b91c1c" }}>{error}</p>}

          {dateChecked && !dateFull && (
            <button
              type="button"
              onClick={handleBook}
              disabled={selectedHour == null || booking}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "14px",
                borderRadius: 999,
                border: "none",
                background: selectedHour == null || booking ? "#9ca3af" : "#111827",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: selectedHour == null || booking ? "not-allowed" : "pointer",
              }}
            >
              {booking ? "Booking…" : "Confirm appointment"}
            </button>
          )}
        </div>

        {/* Recent applications list */}
        <div style={{ marginTop: 24, background: "#f7f7f8", borderRadius: 16, padding: 24 }}>
          {filtered.length === 0 && (
            <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
              No appointments booked yet — use the form above.
            </p>
          )}

          {filtered.map((a, i) => (
            <div key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>{a.refNumber}</p>
                  <div style={{ display: "inline-flex", marginTop: 10, borderRadius: 8, overflow: "hidden" }}>
                    <span style={{ background: "#1f2937", color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 12px" }}>
                      STAGE
                    </span>
                    <span style={{ background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 12px" }}>
                      {a.status}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Passport Application</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
                    Submitted{" "}
                    {new Date(a.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {new Date(a.submittedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 16, border: "1.5px solid #14b8a6", borderRadius: 10, padding: 20 }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Passport Biometric Capture</p>
                <button
                  type="button"
                  style={{
                    marginTop: 14,
                    padding: "12px 20px",
                    border: "1.5px solid #2563eb",
                    borderRadius: 6,
                    background: "#fff",
                    color: "#2563eb",
                    fontSize: 13.5,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  RESCHEDULE
                </button>
                <p style={{ marginTop: 16, fontSize: 17, lineHeight: 1.5, color: "#111" }}>
                  Your appointment has been set for{" "}
                  <span style={{ color: "#2563eb", fontWeight: 700 }}>
                    {formatDateLong(a.date)} at {hourLabel(a.hour)}, {LOCATION}
                  </span>
                </p>
              </div>

              {i < filtered.length - 1 && <div style={{ margin: "24px 0", borderTop: "1px solid #e5e7eb" }} />}
            </div>
          ))}
        </div>

        {applicationId && (
          <p style={{ marginTop: 20, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
            Test application ID: {applicationId} — delete /app/booking to remove this page.
          </p>
        )}
      </div>
    </div>
  );
}
