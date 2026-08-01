import { NextResponse } from "next/server";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFromAddress(value: string) {
  const configuredValue = value.trim();

  // Resend requires a complete email address. Allow the environment variable
  // to contain either one (for example, "RentFile <billing@example.com>") or
  // just the verified sending domain.
  if (configuredValue.includes("@")) {
    return configuredValue;
  }

  const domain = configuredValue.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) {
    throw new Error("RESEND_FROM_EMAIL must be a valid email address or sending domain.");
  }

  return `RentFile <statements@${domain}>`;
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
    const configuredFromAddress = process.env.RESEND_FROM_REMINDERS;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "RESEND_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    if (!configuredFromAddress) {
      return NextResponse.json(
        {
          error: "RESEND_FROM_EMAIL is missing. Set it to a verified sending domain or email address.",
        },
        { status: 500 }
      );
    }

    const fromAddress = getFromAddress(configuredFromAddress);

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
