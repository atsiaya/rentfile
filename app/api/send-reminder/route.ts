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

    const today = new Date();
const asOfDate = today.toLocaleDateString("en-KE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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
      <div style="margin:0;padding:24px 12px;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background-color:#111827;padding:20px 28px;">
              <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                ${escapeHtml(propertyName)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;">
                Rent Payment Reminder
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Hello ${escapeHtml(tenantName || "Tenant")},
              </p>

              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">
                This is a reminder that the following balance is currently outstanding
                on your account as of <strong>${asOfDate}</strong>.
              </p>

              <!-- Amount callout -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.4px;">
                      Balance Due as of ${asOfDate}
                    </p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#b45309;">
                      KES ${amount.toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Property</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${escapeHtml(propertyName)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Unit</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${escapeHtml(unit || "-")}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:14px;color:#6b7280;">Statement Date</td>
                  <td style="padding:10px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${asOfDate}</td>
                </tr>
              </table>

              <p style="margin:0 0 4px 0;font-size:14px;line-height:1.6;color:#6b7280;">
                If you have already made this payment, please disregard this notice.
                For any questions regarding your balance, kindly reach out to your property manager.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px 28px 28px;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                Thank you,<br />${escapeHtml(propertyName)} Management
              </p>
            </td>
          </tr>

        </table>

        <p style="max-width:520px;margin:16px auto 0 auto;font-size:11px;color:#9ca3af;text-align:center;">
          This is an automated reminder. Please do not reply directly to this email.
        </p>
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
