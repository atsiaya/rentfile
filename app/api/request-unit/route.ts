import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Looks up the property's owner (landlord) and emails them that a tenant
 * has requested a specific unit. Requires RESEND_API_KEY — see
 * .env.local.example. Uses Resend's shared sandbox sender
 * (onboarding@resend.dev) so it works before you've verified a domain;
 * swap the `from` address once you have one set up in Resend.
 */
export async function POST(req: Request) {
  try {
    const { propertyId, unit, tenantName, tenantEmail } = await req.json();

    if (!propertyId || !unit || !tenantEmail) {
      return NextResponse.json({ error: "Missing propertyId, unit, or tenantEmail." }, { status: 400 });
    }

    const propertySnap = await getDoc(doc(db, "properties", propertyId));
    if (!propertySnap.exists()) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    const property = propertySnap.data();
    const ownerId = property.ownerId as string | undefined;
    if (!ownerId) {
      return NextResponse.json({ error: "This property has no owner on record." }, { status: 404 });
    }

    const ownerSnap = await getDoc(doc(db, "users", ownerId));
    const ownerEmail = ownerSnap.exists() ? (ownerSnap.data().email as string | undefined) : undefined;
    if (!ownerEmail) {
      return NextResponse.json({ error: "Couldn't find the landlord's email on record." }, { status: 404 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Email isn't configured yet (missing RESEND_API_KEY)." }, { status: 500 });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentFile <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `Unit request — ${unit} at ${property.name}`,
        html: `
          <p><strong>${tenantName || "A tenant"}</strong> (${tenantEmail}) has requested unit <strong>${unit}</strong> at <strong>${property.name}</strong>, ${property.area ?? ""}.</p>
          <p>Reply directly to this email or reach them at ${tenantEmail} to follow up.</p>
        `,
        reply_to: tenantEmail,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      console.error("Resend error:", detail);
      return NextResponse.json({ error: "The email service rejected the request." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request-unit failed:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
