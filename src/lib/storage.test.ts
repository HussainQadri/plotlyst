import { describe, expect, it } from "vitest";
import { createSampleProject } from "./samples";
import { normalizeStoredProject } from "./storage";

describe("stored project normalization", () => {
  it("restores scatter projects and their settings", () => {
    const project = createSampleProject("scatter");
    project.settings.scatter = {
      ...project.settings.scatter,
      showQuadrants: true
    };

    expect(normalizeStoredProject(project)).toEqual(project);
  });

  it("restores Sankey projects", () => {
    const project = createSampleProject("sankey");
    expect(normalizeStoredProject(project)).toEqual(project);
  });
});
