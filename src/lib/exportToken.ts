import { createHmac, timingSafeEqual } from "node:crypto";
import type { ExportEntitlement } from "./export";

const tokenTtlMs = 24 * 60 * 60 * 1000;

export function createExportToken(sessionId: string, secret: string, now = new Date()): string {
  if (!secret) throw new Error("EXPORT_TOKEN_SECRET is required");
  const paidAt = now.toISOString();
  const entitlement: ExportEntitlement = {
    sessionId,
    paidAt,
    expiresAt: new Date(now.getTime() + tokenTtlMs).toISOString()
  };
  const payload = base64UrlEncode(JSON.stringify(entitlement));
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyExportToken(token: string, secret: string, now = new Date()): ExportEntitlement | null {
  if (!secret) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = signPayload(payload, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const entitlement = JSON.parse(base64UrlDecode(payload)) as unknown;
    if (!isExportEntitlement(entitlement)) return null;
    if (Date.parse(entitlement.expiresAt) <= now.getTime()) return null;
    return entitlement;
  } catch {
    return null;
  }
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function isExportEntitlement(value: unknown): value is ExportEntitlement {
  if (!value || typeof value !== "object") return false;
  const entitlement = value as Partial<ExportEntitlement>;
  return (
    typeof entitlement.sessionId === "string" &&
    typeof entitlement.paidAt === "string" &&
    typeof entitlement.expiresAt === "string" &&
    Number.isFinite(Date.parse(entitlement.paidAt)) &&
    Number.isFinite(Date.parse(entitlement.expiresAt))
  );
}
