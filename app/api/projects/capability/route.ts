import { NextResponse } from "next/server";
import { isProjectStorageConfigured } from "@/lib/projects";

export async function GET() {
  return NextResponse.json({ enabled: isProjectStorageConfigured() });
}
