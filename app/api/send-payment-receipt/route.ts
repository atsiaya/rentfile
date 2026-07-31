import { NextResponse } from "next/server";

/**
 * Skeleton API route for sending a payment receipt.
 * Replace TODOs with your project-specific Firestore and Resend logic.
 */
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

    // TODO:
    // 1. Query Firestore for all payments for this tenant/month.
    // 2. Calculate monthly total.
    // 3. Generate PDF using lib/generateReceiptPdf.ts.
    // 4. Email using lib/sendReceiptEmail.ts.
    // 5. Log email delivery status.

    return NextResponse.json({
      success: true,
      message: "Receipt request accepted.",
      receipt: {
        paymentId,
        tenantName,
        tenantEmail,
        propertyName,
        unit,
        amount,
        method,
        paymentDate,
        monthKey,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
