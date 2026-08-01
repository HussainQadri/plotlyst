import { describe, expect, it } from "vitest";
import { chartArtifactCss, chartFontStack } from "./chartStyles";

describe("chartArtifactCss", () => {
  it("styles every text class the renderer emits", () => {
    for (const selector of [
      ".svg-title",
      ".svg-label",
      ".svg-axis",
      ".svg-note",
      ".svg-mekko-total",
      ".annotation-label"
    ]) {
      expect(chartArtifactCss).toContain(selector);
    }
  });

  it("declares the font stack so exports do not depend on the app stylesheet", () => {
    expect(chartArtifactCss).toContain(chartFontStack);
  });

  it("uses only weights a real face ships", () => {
    const weights = [...chartArtifactCss.matchAll(/font-weight:(\d+)/g)].map((match) => Number(match[1]));
    expect(weights.length).toBeGreaterThan(0);
    expect(weights.every((weight) => [400, 500, 600, 700].includes(weight))).toBe(true);
  });

  it("drives text halos from --halo so labels suit any slide background", () => {
    expect(chartArtifactCss).toContain("stroke:var(--halo,#ffffff)");
  });

  it("carries no editor-only selection state into the artifact", () => {
    expect(chartArtifactCss).not.toContain("text-decoration");
    expect(chartArtifactCss).not.toContain("cursor");
  });
});
