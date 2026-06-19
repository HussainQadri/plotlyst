import { NextRequest, NextResponse } from "next/server";
import { isProjectStorageConfigured, loadProjectEnvelope } from "@/lib/projects";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isProjectStorageConfigured()) {
    return NextResponse.json({ error: "Project sharing is not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  const envelope = await loadProjectEnvelope(id);

  if (!envelope) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(envelope);
}
