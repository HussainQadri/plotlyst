import { NextRequest, NextResponse } from "next/server";
import { verifyExportToken } from "@/lib/exportToken";

export async function POST(request: NextRequest) {
  const tokenSecret = process.env.EXPORT_TOKEN_SECRET;
  if (!tokenSecret) {
    return NextResponse.json({ error: "Paid export is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const entitlement = verifyExportToken(token, tokenSecret);

  if (!entitlement) {
    return NextResponse.json({ error: "Clean export is locked" }, { status: 401 });
  }

  return NextResponse.json({ entitlement });
}
