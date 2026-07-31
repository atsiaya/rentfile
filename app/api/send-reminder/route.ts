import { NextResponse } from "next/server";

/**
 * Sends a rent-reminder email to one tenant via Resend. Requires
 * RESEND_API_KEY and RESEND_FROM_EMAIL — see .env.local.example and the
 * setup notes wherever this route is documented.
 */
export async function POST(req: Request) {
  try {
    const { tenantEmail, tenantName, unit, propertyName, balance, senderEmail } =
      await req.json();

    if (!tenantEmail || !propertyName || balance == null) {
      return NextResponse.json(
        { error: "Missing tenantEmail, propertyName, or balance." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromAddress) {
      return NextResponse.json(
        { error: "Email isn't configured yet (missing RESEND_API_KEY or RESEND_FROM_EMAIL)." },
        { status: 500 }
      );
    }

    const amount = Number(balance).toLocaleString();

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [tenantEmail],
        subject: `Rent reminder — Unit ${unit}, ${propertyName}`,
        html: `
          <p>Hi ${tenantName || "there"},</p>
          <p>This is a reminder that <strong>KES ${amount}</strong> is still due for
          Unit ${unit} at <strong>${propertyName}</strong>.</p>
          <p>If you've already paid, please disregard this message — reply directly
          if you'd like to confirm it's been received.</p>
        `,
        ...(senderEmail ? { reply_to: senderEmail } : {}),
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      console.error("Resend error:", detail);
      return NextResponse.json({ error: "The email service rejected the request." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-reminder failed:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
