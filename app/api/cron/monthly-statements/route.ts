import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic"; // never cache a cron endpoint
export const maxDuration = 60; // this can touch many properties/tenants — give it room

type Property = { id: string; name: string; area: string };
type Tenant = { id: string; name: string; unit: string; rent: number; email: string };
type Payment = { tenantId: string; amount: number; method: string; paymentDate: string | null };

/** The month that JUST ENDED — this route is meant to run on the 1st of the
 * following month, so "this month" from the cron's perspective is last
 * month's statement period. */
function previousMonthKey(): { key: string; label: string } {
  const d = new Date();
  d.setDate(1); // avoid month-length edge cases (e.g. running on the 31st)
  d.setMonth(d.getMonth() - 1);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  return { key, label };
}

async function buildStatementPdf(
  propertyName: string,
  periodLabel: string,
  tenant: Tenant,
  payments: Payment[],
  totalPaid: number
): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const balance = Math.max(tenant.rent - totalPaid, 0);

  doc.setFontSize(16);
  doc.text("RentFile — Monthly Statement", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`${tenant.name} — Unit ${tenant.unit}, ${propertyName}`, 14, 26);
  doc.text(periodLabel, 14, 32);

  autoTable(doc, {
    startY: 42,
    head: [["Date", "Method", "Amount (KES)"]],
    body: payments.length
      ? payments.map((p) => [p.paymentDate ?? "—", p.method, p.amount.toLocaleString()])
      : [["—", "No payments recorded", "0"]],
    foot: [
      ["", "Rent due", tenant.rent.toLocaleString()],
      ["", "Total paid", totalPaid.toLocaleString()],
      ["", "Balance", balance.toLocaleString()],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [192, 138, 46] },
    footStyles: { fillColor: [246, 247, 249], textColor: 20, fontStyle: "bold" },
  });

  // jsPDF's Node output path — base64 string, ready to hand straight to
  // Resend's `attachments[].content`.
  return doc.output("datauristring").split(",")[1];
}

async function sendStatementEmail(
  apiKey: string,
  fromAddress: string,
  tenant: Tenant,
  propertyName: string,
  periodLabel: string,
  totalPaid: number,
  pdfBase64: string
) {
  const balance = Math.max(tenant.rent - totalPaid, 0);
  const filename = `${propertyName.replace(/\s+/g, "-")}-${tenant.unit}-statement.pdf`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [tenant.email],
      subject: `Your ${periodLabel} statement — Unit ${tenant.unit}, ${propertyName}`,
      html: `
        <p>Hi ${tenant.name},</p>
        <p>Attached is your rent statement for <strong>${periodLabel}</strong> at
        ${propertyName}, Unit ${tenant.unit}.</p>
        <p>Paid this period: <strong>KES ${totalPaid.toLocaleString()}</strong><br/>
        Balance: <strong>KES ${balance.toLocaleString()}</strong></p>
      `,
      attachments: [{ filename, content: pdfBase64 }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend rejected ${tenant.email}: ${res.status} ${detail}`);
  }
}

export async function GET(req: Request) {
  // Vercel injects this header automatically when CRON_SECRET is set as a
  // project env var — see the setup notes for how that's wired up.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_STATEMENTS;
  if (!apiKey || !fromAddress) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or RESEND_FROM_STATEMENTS." },
      { status: 500 }
    );
  }

  const { key: monthKey, label: periodLabel } = previousMonthKey();

  const results: { tenant: string; property: string; status: "sent" | "skipped" | "failed"; detail?: string }[] = [];

  try {
    const propsSnap = await adminDb.collection("properties").get();
    const properties: Property[] = propsSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? "Untitled property",
      area: d.data().area ?? "",
    }));

    for (const property of properties) {
      const tenantsSnap = await adminDb
  .collection("tenants")
  .where("propertyId", "==", property.id)
  .get();
      const tenants: Tenant[] = tenantsSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? "",
        unit: d.data().unit ?? "",
        rent: Number(d.data().rent) || 0,
        email: d.data().email ?? "",
      }));

      const paymentsSnap = await adminDb
  .collection("payments")
  .where("propertyId", "==", property.id)
  .where("monthKey", "==", monthKey)
  .get();
      
      const allPayments: (Payment & { tenantId: string })[] = paymentsSnap.docs.map((d) => ({
        tenantId: d.data().tenantId ?? "",
        amount: Number(d.data().amount) || 0,
        method: d.data().method ?? "",
        paymentDate: d.data().paymentDate ?? null,
      }));

      for (const tenant of tenants) {
        if (!tenant.email) {
          results.push({ tenant: tenant.name, property: property.name, status: "skipped", detail: "no email on record" });
          continue;
        }
        try {
          const tenantPayments = allPayments.filter((p) => p.tenantId === tenant.id);
          const totalPaid = tenantPayments.reduce((sum, p) => sum + p.amount, 0);

          const pdfBase64 = await buildStatementPdf(property.name, periodLabel, tenant, tenantPayments, totalPaid);
          await sendStatementEmail(apiKey, fromAddress, tenant, property.name, periodLabel, totalPaid, pdfBase64);

          results.push({ tenant: tenant.name, property: property.name, status: "sent" });
        } catch (err) {
          results.push({
            tenant: tenant.name,
            property: property.name,
            status: "failed",
            detail: err instanceof Error ? err.message : "unknown error",
          });
        }
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({ period: periodLabel, sent, failed, skipped, results });
  } catch (err) {
    console.error("monthly-statements cron failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
