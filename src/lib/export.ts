export type ExportScale = 1 | 2 | 3;

export type ExportBackground = "theme" | "transparent";

export type ExportMode = "draft" | "clean";

export type ExportSettings = {
  mode: ExportMode;
  scale: ExportScale;
  background: ExportBackground;
  filename: string;
};

export type ExportEntitlement = {
  sessionId: string;
  paidAt: string;
  expiresAt: string;
};

export const baseExportSize = { width: 1920, height: 1080 };

export function exportDimensions(scale: ExportScale) {
  return {
    width: baseExportSize.width * scale,
    height: baseExportSize.height * scale
  };
}

export function safeExportName(value: string, fallback = "chart"): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

export function watermarkText(title: string): string {
  return `${title.trim() || "Plotlyst"} - draft`;
}

export function decodeExportEntitlementToken(token: string, now = new Date()): ExportEntitlement | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[0])) as unknown;
    if (!isExportEntitlement(payload)) return null;
    if (Date.parse(payload.expiresAt) <= now.getTime()) return null;
    return payload;
  } catch {
    return null;
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
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
