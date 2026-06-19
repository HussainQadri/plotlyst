import { describe, expect, it } from "vitest";
import { decodeExportEntitlementToken } from "./export";
import { createExportToken, verifyExportToken } from "./exportToken";

describe("export tokens", () => {
  it("signs and verifies a paid export entitlement", () => {
    const now = new Date("2026-06-19T10:00:00.000Z");
    const token = createExportToken("cs_test_123", "secret", now);

    expect(verifyExportToken(token, "secret", now)?.sessionId).toBe("cs_test_123");
    expect(decodeExportEntitlementToken(token, now)?.sessionId).toBe("cs_test_123");
  });

  it("rejects tampered, wrongly signed, and expired tokens", () => {
    const now = new Date("2026-06-19T10:00:00.000Z");
    const token = createExportToken("cs_test_123", "secret", now);
    const [payload, signature] = token.split(".");

    expect(verifyExportToken(`${payload}.${signature}x`, "secret", now)).toBeNull();
    expect(verifyExportToken(token, "other-secret", now)).toBeNull();
    expect(verifyExportToken(token, "secret", new Date("2026-06-20T10:00:01.000Z"))).toBeNull();
  });
});
