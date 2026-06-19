import type Stripe from "stripe";

export type StripeSessionReader = {
  checkout: {
    sessions: {
      retrieve: (sessionId: string) => Promise<Pick<Stripe.Checkout.Session, "id" | "payment_status" | "created">>;
    };
  };
};

export async function verifyPaidCheckoutSession(stripe: StripeSessionReader, sessionId: unknown): Promise<{ sessionId: string; paidAt: Date }> {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new Error("Missing checkout session");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new Error("Checkout session is not paid");
  }

  return {
    sessionId: session.id,
    paidAt: session.created ? new Date(session.created * 1000) : new Date()
  };
}
