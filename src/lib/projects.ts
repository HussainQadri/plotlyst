import { randomUUID } from "node:crypto";
import type { ChartProject } from "./types";
import { normalizeStoredProject } from "./storage";

export type ProjectEnvelope = {
  schemaVersion: 1;
  project: ChartProject;
  createdAt: string;
  updatedAt: string;
};

type KvResponse<T> = {
  result?: T;
  error?: string;
};

const schemaVersion = 1;
const projectPrefix = "plotlyst:project:";

export function createProjectEnvelope(project: ChartProject, now = new Date()): ProjectEnvelope {
  return {
    schemaVersion,
    project,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function normalizeProjectEnvelope(raw: unknown): ProjectEnvelope | null {
  if (!isRecord(raw) || raw.schemaVersion !== schemaVersion) return null;
  const project = normalizeStoredProject(raw.project);
  if (!project) return null;
  const createdAt = typeof raw.createdAt === "string" && Number.isFinite(Date.parse(raw.createdAt)) ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === "string" && Number.isFinite(Date.parse(raw.updatedAt)) ? raw.updatedAt : createdAt;
  return { schemaVersion, project, createdAt, updatedAt };
}

export function isProjectStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

export async function saveProjectEnvelope(project: ChartProject, env: NodeJS.ProcessEnv = process.env): Promise<{ id: string; envelope: ProjectEnvelope }> {
  ensureConfigured(env);
  const id = createProjectId();
  const envelope = createProjectEnvelope(project);
  await kvRequest(["set", `${projectPrefix}${id}`, JSON.stringify(envelope)], env);
  return { id, envelope };
}

export async function loadProjectEnvelope(id: string, env: NodeJS.ProcessEnv = process.env): Promise<ProjectEnvelope | null> {
  ensureConfigured(env);
  if (!isProjectId(id)) return null;
  const stored = await kvRequest<string | null>(["get", `${projectPrefix}${id}`], env);
  if (!stored) return null;
  return normalizeProjectEnvelope(JSON.parse(stored));
}

export function projectShareUrl(id: string, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/p/${id}`;
}

function ensureConfigured(env: NodeJS.ProcessEnv) {
  if (!isProjectStorageConfigured(env)) {
    throw new Error("Project storage is not configured");
  }
}

async function kvRequest<T>(command: unknown[], env: NodeJS.ProcessEnv): Promise<T> {
  const response = await fetch(`${env.KV_REST_API_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command])
  });

  if (!response.ok) {
    throw new Error("Project storage request failed");
  }

  const payload = (await response.json()) as KvResponse<T>[];
  const first = payload[0];
  if (first?.error) throw new Error(first.error);
  return first?.result as T;
}

function createProjectId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

function isProjectId(value: string): boolean {
  return /^[a-f0-9]{16}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
