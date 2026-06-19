import { NextRequest, NextResponse } from "next/server";
import { normalizeStoredProject } from "@/lib/storage";
import { isProjectStorageConfigured, projectShareUrl, saveProjectEnvelope } from "@/lib/projects";

export async function POST(request: NextRequest) {
  if (!isProjectStorageConfigured()) {
    return NextResponse.json({ error: "Project sharing is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { project?: unknown } | null;
  const project = normalizeStoredProject(body?.project);
  if (!project) {
    return NextResponse.json({ error: "Project payload is invalid" }, { status: 400 });
  }

  const { id } = await saveProjectEnvelope(project);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  return NextResponse.json({ id, url: projectShareUrl(id, appUrl) });
}
