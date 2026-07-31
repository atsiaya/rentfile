import { Resend } from "resend";
import { generateReceiptPdf, ReceiptData } from "./generateReceiptPdf";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReceiptEmail(
  receipt: ReceiptData,
  recipientEmail: string
) {
  const pdf = await generateReceiptPdf(receipt);

  const filename = `Receipt-${receipt.receiptNo}.pdf`;

  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "RentFile <noreply@example.com>",
    to: recipientEmail,
    subject: `Payment Receipt - ${receipt.propertyName}`,
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Payment Receipt</h2>
        <p>Hello ${receipt.tenantName},</p>
        <p>Thank you for your payment.</p>

        <table cellpadding="6">
          <tr><td><strong>Property</strong></td><td>${receipt.propertyName}</td></tr>
          <tr><td><strong>Unit</strong></td><td>${receipt.unit}</td></tr>
          <tr><td><strong>Date</strong></td><td>${receipt.paymentDate}</td></tr>
          <tr><td><strong>Time</strong></td><td>${receipt.paymentTime}</td></tr>
          <tr><td><strong>Method</strong></td><td>${receipt.method}</td></tr>
          <tr><td><strong>Amount Paid</strong></td><td>KES ${receipt.amount.toLocaleString()}</td></tr>
          <tr><td><strong>Total Paid This Month</strong></td><td>KES ${receipt.monthlyTotal.toLocaleString()}</td></tr>
          <tr><td><strong>Outstanding Balance</strong></td><td>KES ${receipt.balance.toLocaleString()}</td></tr>
        </table>

        <p>Your official PDF receipt is attached to this email.</p>

        <p>Regards,<br/>RentFile</p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(pdf).toString("base64"),
      },
    ],
  });
}
