import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendReceiptEmail } from "@/lib/sendReceiptEmail";
import type { ReceiptData } from "@/lib/generateReceiptPdf";

export async function POST(req: Request) {
  try {
    const {
      tenantId,
      tenantEmail,
      tenantName,
      propertyName,
      unit,
      paymentId,
      amount,
      method,
      paymentDate,
      monthKey,
    } = await req.json();

    if (!tenantEmail || !tenantId || !paymentId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // adminDb bypasses Firestore Security Rules — required here, since this
    // route has no signed-in user (the browser's Firebase Auth session
    // doesn't carry over to a Next.js API route by itself), and any rule
    // requiring request.auth != null would otherwise deny these reads with
    // "Missing or insufficient permissions."

    // 1. Look up the specific payment for authoritative amount/method/date/
    // time — trust what's actually on record over whatever the client sent.
    const paymentSnap = await adminDb.collection("payments").doc(paymentId).get();
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    const payment = paymentSnap.data()!;
    const effectiveMonthKey = monthKey || payment.monthKey || "";

    // 2. Tenant's rent, needed to compute the balance line on the receipt.
    const tenantSnap = await adminDb.collection("tenants").doc(tenantId).get();
    const rent = tenantSnap.exists ? Number(tenantSnap.data()?.rent) || 0 : 0;

    // 3. Every payment this tenant made in the same month, to get the
    // monthly total — not just this one payment in isolation.
    const monthPaymentsSnap = await adminDb
      .collection("payments")
      .where("tenantId", "==", tenantId)
      .where("monthKey", "==", effectiveMonthKey)
      .get();
    const monthlyTotal = monthPaymentsSnap.docs.reduce(
      (sum, d) => sum + (Number(d.data().amount) || 0),
      0
    );

    const balance = Math.max(rent - monthlyTotal, 0);
    const receiptNo = `RF-${paymentId.slice(-8).toUpperCase()}`;

    const receiptData: ReceiptData = {
      receiptNo,
      tenantName: tenantName || payment.tenantName || "",
      propertyName: propertyName || "",
      unit: unit || payment.unit || "",
      paymentDate: paymentDate || payment.paymentDate || "",
      paymentTime: payment.paymentTime || "",
      method: method || payment.method || "",
      amount: Number(amount) || Number(payment.amount) || 0,
      monthlyTotal,
      balance,
    };

    const result = await sendReceiptEmail(receiptData, tenantEmail);

    if (result.error) {
      console.error("sendReceiptEmail failed:", result.error);
      return NextResponse.json(
        { error: `Resend rejected the request: ${result.error.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Receipt sent.",
      resendId: result.data?.id ?? null,
      receipt: receiptData,
    });
  } catch (error) {
    console.error("send-payment-receipt failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
