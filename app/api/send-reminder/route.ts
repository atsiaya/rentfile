import { NextResponse } from "next/server";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    const {
      tenantEmail,
      tenantName,
      unit,
      propertyName,
      balance,
      senderEmail,
    } = await req.json();

    // Validate required fields
    if (!tenantEmail || !propertyName || balance === undefined || balance === null) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: tenantEmail, propertyName or balance.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "RESEND_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    if (!fromAddress) {
      return NextResponse.json(
        {
          error: "RESEND_FROM_EMAIL is missing.",
        },
        { status: 500 }
      );
    }

    const amount = Number(balance);

    if (Number.isNaN(amount)) {
      return NextResponse.json(
        {
          error: "Balance must be a valid number.",
        },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [tenantEmail],
        subject: `Rent Reminder — Unit ${unit} (${propertyName})`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;font-size:16px">
            <h2>Rent Reminder</h2>

            <p>Hello ${escapeHtml(tenantName || "Tenant")},</p>

            <p>
              This is a friendly reminder that your outstanding rent balance is:
            </p>

            <h3 style="color:#b7791f">
              KES ${amount.toLocaleString()}
            </h3>

            <table cellpadding="6">
              <tr>
                <td><strong>Property</strong></td>
                <td>${escapeHtml(propertyName)}</td>
              </tr>
              <tr>
                <td><strong>Unit</strong></td>
                <td>${escapeHtml(unit || "-")}</td>
              </tr>
            </table>

            <p>
              If you have already made payment, kindly disregard this email.
            </p>

            <p>Thank you.</p>
          </div>
        `,
        ...(senderEmail ? { reply_to: senderEmail } : {}),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", result);

      return NextResponse.json(
        {
          error: result?.message || result?.error || "Failed to send email.",
          resend: result,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
    });
  } catch (error) {
    console.error("Send reminder failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
