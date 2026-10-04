import { describe, expect, it } from "vitest";
import { resolveAnnotationAnchor, resolveAnnotations } from "./annotations";
import { scatterPlotFrame } from "./chartMath";
import { createSampleProject } from "./samples";
import type { WaterfallData } from "./types";

describe("annotation anchors", () => {
  it("resolves a callout to the selected waterfall mark", () => {
    const project = {
      ...createSampleProject("waterfall"),
      annotations: [{ id: "ann-1", type: "callout" as const, anchorIds: ["wf-new"], label: "Growth", visible: true }]
    };

    const resolved = resolveAnnotations(project);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].anchor.id).toBe("wf-new");
    expect(resolved[0].label).toBe("Growth");
  });

  it("moves value-line anchors when source data changes", () => {
    const base = createSampleProject("waterfall");
    const first = resolveAnnotationAnchor(base, "wf-churn");
    const changed = {
      ...base,
      data: {
        rows: (base.data as WaterfallData).rows.map((row) => (row.id === "wf-new" ? { ...row, amount: 90 } : row))
      }
    };
    const second = resolveAnnotationAnchor(changed, "wf-churn");

    expect(first?.valueLine?.y).not.toBe(second?.valueLine?.y);
  });

  it("resolves scatter callouts without falling through to waterfall data", () => {
    const project = {
      ...createSampleProject("scatter"),
      annotations: [{ id: "ann-scatter", type: "callout" as const, anchorIds: ["sc-cloud"], label: "Priority", visible: true }]
    };

    const resolved = resolveAnnotations(project);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].anchor.id).toBe("sc-cloud");
    expect(resolved[0].anchor.x).toBeGreaterThan(scatterPlotFrame.x);
    expect(resolved[0].anchor.x).toBeLessThan(scatterPlotFrame.x + scatterPlotFrame.width);
    expect(resolved[0].anchor.y).toBeGreaterThan(scatterPlotFrame.y);
    expect(resolved[0].anchor.y).toBeLessThan(scatterPlotFrame.y + scatterPlotFrame.height);
  });
});
