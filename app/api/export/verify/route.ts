import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createExportToken } from "@/lib/exportToken";
import { verifyPaidCheckoutSession } from "@/lib/stripeCheckout";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const tokenSecret = process.env.EXPORT_TOKEN_SECRET;

  if (!secretKey || !tokenSecret) {
    return NextResponse.json({ error: "Paid export is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const stripe = new Stripe(secretKey);

  try {
    const paid = await verifyPaidCheckoutSession(stripe, body?.sessionId);
    const token = createExportToken(paid.sessionId, tokenSecret, paid.paidAt);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Checkout session could not be verified" }, { status: 402 });
  }
}
