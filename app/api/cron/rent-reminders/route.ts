import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { outstandingRentBalance } from "@/lib/rentBalance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Tenant = {
  id: string;
  name: string;
  unit: string;
  rent: number;
  email: string;
  createdAtMillis: number;
};

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getFromAddress(value: string) {
  const configuredValue = value.trim();
  if (configuredValue.includes("@")) return configuredValue;
  const domain = configuredValue.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) {
    throw new Error("RESEND_FROM_REMINDERS must be a valid email address or sending domain.");
  }
  return `RentFile <statements@${domain}>`;
}

async function sendReminder(
  apiKey: string,
  from: string,
  tenant: Tenant,
  propertyName: string,
  balance: number
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [tenant.email],
      subject: `Rent reminder — Unit ${tenant.unit} (${propertyName})`,
      html: `<p>Hello ${tenant.name || "Tenant"},</p><p>Your outstanding rent balance for ${propertyName}, Unit ${tenant.unit}, is <strong>KES ${balance.toLocaleString()}</strong>.</p><p>If you have already paid, please disregard this reminder.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend rejected ${tenant.email}: ${response.status} ${await response.text()}`);
}

/**
 * Runs once a month, on the 10th (see vercel.json — "0 6 10 * *", 06:00 UTC
 * / 09:00 Nairobi). Sends at most one reminder per tenant per calendar
 * month, enforced by a lock doc in `automatedReminders/{monthKey}_{tenantId}`
 * created with .create() (which throws if the doc already exists) — so
 * re-running this route manually, or Vercel retrying a timeout, can never
 * double-send. A failed send deletes its own lock doc so the NEXT scheduled
 * run (next month) or a manual re-trigger can retry it.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const configuredFrom = process.env.RESEND_FROM_REMINDERS;
  if (!apiKey || !configuredFrom) {
    // Fixed: this used to say "RESEND_FROM_EMAIL" here while actually
    // reading RESEND_FROM_REMINDERS above — the message now names the
    // variable the code actually checks.
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or RESEND_FROM_REMINDERS." },
      { status: 500 }
    );
  }

  const monthKey = currentMonthKey();
  const results: { tenant: string; status: "sent" | "skipped" | "failed"; detail?: string }[] = [];

  try {
    const [propertiesSnapshot, paymentsSnapshot] = await Promise.all([
      adminDb.collection("properties").get(),
      adminDb.collection("payments").get(),
    ]);

    const paidByTenant = paymentsSnapshot.docs.reduce<Record<string, number>>((totals, payment) => {
      const data = payment.data();
      const tenantId = typeof data.tenantId === "string" ? data.tenantId : "";
      totals[tenantId] = (totals[tenantId] ?? 0) + (Number(data.amount) || 0);
      return totals;
    }, {});

    for (const propertyDoc of propertiesSnapshot.docs) {
      const property = propertyDoc.data();
      const tenantsSnapshot = await adminDb
        .collection("tenants")
        .where("propertyId", "==", propertyDoc.id)
        .get();

      for (const tenantDoc of tenantsSnapshot.docs) {
        const data = tenantDoc.data();
        const tenant: Tenant = {
          id: tenantDoc.id,
          name: data.name ?? "",
          unit: data.unit ?? "",
          rent: Number(data.rent) || 0,
          email: data.email ?? "",
          createdAtMillis: data.createdAt?.toMillis?.() ?? 0,
        };

        const balance = outstandingRentBalance(
          tenant.rent,
          tenant.createdAtMillis,
          paidByTenant[tenant.id] ?? 0
        ).outstanding;

        if (!tenant.email || balance <= 0) {
          results.push({
            tenant: tenant.name,
            status: "skipped",
            detail: !tenant.email ? "no email" : "no outstanding balance",
          });
          continue;
        }

        const logRef = adminDb.collection("automatedReminders").doc(`${monthKey}_${tenant.id}`);
        try {
          await logRef.create({
            tenantId: tenant.id,
            propertyId: propertyDoc.id,
            monthKey,
            status: "sending",
            createdAt: new Date(),
          });
        } catch (error) {
          if ((error as { code?: number }).code === 6) {
            results.push({ tenant: tenant.name, status: "skipped", detail: "already sent this month" });
            continue;
          }
          throw error;
        }

        try {
          await sendReminder(apiKey, getFromAddress(configuredFrom), tenant, property.name ?? "your property", balance);
          await logRef.update({ status: "sent", sentAt: new Date(), balance });
          results.push({ tenant: tenant.name, status: "sent" });
        } catch (error) {
          // Delete the lock so a later manual re-trigger (or, worst case,
          // next month's scheduled run) can retry a delivery that failed.
          await logRef.delete();
          results.push({
            tenant: tenant.name,
            status: "failed",
            detail: error instanceof Error ? error.message : "unknown error",
          });
        }
      }
    }

    const counts = results.reduce(
      (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
      { sent: 0, skipped: 0, failed: 0 }
    );

    return NextResponse.json({ monthKey, ...counts, results });
  } catch (error) {
    console.error("rent-reminders cron failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed." },
      { status: 500 }
    );
  }
}
