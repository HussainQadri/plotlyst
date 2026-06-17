import { describe, expect, it } from "vitest";
import { pieLabelPoint, rectLabelPoint, waterfallLabelPoint } from "./labelPlacement";

describe("label placement", () => {
  it("returns different pie coordinates for inside and outside labels", () => {
    const inside = pieLabelPoint({
      cx: 100,
      cy: 100,
      radius: 80,
      midAngle: 90,
      percentage: 0.2,
      placement: "inside",
      foreground: "#111"
    });
    const outside = pieLabelPoint({
      cx: 100,
      cy: 100,
      radius: 80,
      midAngle: 90,
      percentage: 0.2,
      placement: "outside",
      foreground: "#111"
    });

    expect(outside.x).toBeGreaterThan(inside.x);
  });

  it("uses callouts for small Marimekko rectangles in auto mode", () => {
    const point = rectLabelPoint({
      rect: { x: 10, y: 10, width: 42, height: 20 },
      placement: "auto",
      chartWidth: 500,
      chartHeight: 300,
      foreground: "#111"
    });

    expect(point.leader).toBeDefined();
    expect(point.x).toBeGreaterThan(52);
  });

  it("places waterfall outside labels above positive and below negative bars", () => {
    const positive = waterfallLabelPoint({
      rect: { x: 40, y: 120, width: 60, height: 12 },
      placement: "outside",
      positive: true,
      foreground: "#111"
    });
    const negative = waterfallLabelPoint({
      rect: { x: 40, y: 120, width: 60, height: 12 },
      placement: "outside",
      positive: false,
      foreground: "#111"
    });

    expect(positive.y).toBeLessThan(120);
    expect(negative.y).toBeGreaterThan(132);
  });
});
