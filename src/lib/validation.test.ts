import { describe, expect, it } from "vitest";
import { createSampleProject } from "./samples";
import { validateProject } from "./validation";
import type { ScatterData } from "./types";

describe("scatter validation", () => {
  it("accepts the sample scatter chart", () => {
    expect(validateProject(createSampleProject("scatter"))).toEqual({ valid: true, errors: [] });
  });

  it("reports missing points and invalid scatter values", () => {
    const project = createSampleProject("scatter");
    project.data = {
      points: [{ id: "bad", label: "", x: Number.NaN, y: 4, size: -1 }]
    } satisfies ScatterData;

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Scatter charts need at least two points.");
    expect(result.errors).toContain("Every scatter point needs a label.");
    expect(result.errors).toContain("A scatter point needs a numeric X value.");
    expect(result.errors).toContain("A scatter point needs a non-negative bubble size.");
  });
});
