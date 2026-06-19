import { describe, expect, it } from "vitest";
import { createSampleProject } from "./samples";
import { createProjectEnvelope, isProjectStorageConfigured, normalizeProjectEnvelope, projectShareUrl } from "./projects";

describe("project envelopes", () => {
  it("wraps and normalizes shared project documents", () => {
    const project = createSampleProject("waterfall");
    const envelope = createProjectEnvelope(project, new Date("2026-06-19T10:00:00.000Z"));

    expect(normalizeProjectEnvelope(envelope)).toEqual(envelope);
  });

  it("rejects malformed envelopes", () => {
    expect(normalizeProjectEnvelope({ schemaVersion: 1, project: { type: "bad" } })).toBeNull();
    expect(normalizeProjectEnvelope({ schemaVersion: 2, project: createSampleProject("pie") })).toBeNull();
  });

  it("detects KV storage configuration and builds share URLs", () => {
    expect(isProjectStorageConfigured({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "token" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isProjectStorageConfigured({ KV_REST_API_URL: "https://kv.example" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(projectShareUrl("abc123", "https://plotlyst.example/")).toBe("https://plotlyst.example/p/abc123");
  });
});
