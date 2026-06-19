import { describe, expect, it } from "vitest";
import { verifyPaidCheckoutSession, type StripeSessionReader } from "./stripeCheckout";

describe("checkout session verification", () => {
  it("accepts paid checkout sessions", async () => {
    const stripe = mockStripe({ id: "cs_paid", payment_status: "paid", created: 1781863200 });

    await expect(verifyPaidCheckoutSession(stripe, "cs_paid")).resolves.toEqual({
      sessionId: "cs_paid",
      paidAt: new Date("2026-06-19T10:00:00.000Z")
    });
  });

  it("rejects missing or unpaid sessions", async () => {
    await expect(verifyPaidCheckoutSession(mockStripe({ id: "cs_unpaid", payment_status: "unpaid", created: 1781863200 }), "cs_unpaid")).rejects.toThrow("not paid");
    await expect(verifyPaidCheckoutSession(mockStripe({ id: "cs_paid", payment_status: "paid", created: 1781863200 }), "")).rejects.toThrow("Missing");
  });
});

function mockStripe(session: { id: string; payment_status: "paid" | "unpaid" | "no_payment_required"; created: number }): StripeSessionReader {
  return {
    checkout: {
      sessions: {
        retrieve: async () => session
      }
    }
  };
}
