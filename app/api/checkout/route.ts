import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!secretKey || !priceId || !appUrl) {
    return NextResponse.json({ error: "Checkout is not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl.replace(/\/$/, "")}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl.replace(/\/$/, "")}?checkout=cancelled`
  });

  return NextResponse.json({ url: session.url });
}
