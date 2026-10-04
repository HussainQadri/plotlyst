import { describe, expect, it } from "vitest";
import { pieLabelPoint, placeScatterLabels, rectLabelPoint, waterfallLabelPoint } from "./labelPlacement";

describe("label placement", () => {
  it("returns different pie coordinates for inside and outside labels", () => {
    const inside = pieLabelPoint({
      cx: 100,
      cy: 100,
      radius: 80,
      midAngle: 90,
      percentage: 0.2,
      placement: "inside",
      foreground: "#111",
      fillColor: "#327277"
    });
    const outside = pieLabelPoint({
      cx: 100,
      cy: 100,
      radius: 80,
      midAngle: 90,
      percentage: 0.2,
      placement: "outside",
      foreground: "#111",
      fillColor: "#327277"
    });

    expect(outside.x).toBeGreaterThan(inside.x);
  });

  it("uses callouts for small Marimekko rectangles in auto mode", () => {
    const point = rectLabelPoint({
      rect: { x: 10, y: 10, width: 42, height: 20 },
      placement: "auto",
      chartWidth: 500,
      chartHeight: 300,
      foreground: "#111",
      fillColor: "#327277"
    });

    expect(point.leader).toBeDefined();
    expect(point.x).toBeGreaterThan(52);
  });

  it("inks inside labels by the fill so they read on light and dark marks", () => {
    const rect = { x: 0, y: 0, width: 200, height: 80 };
    const onDark = rectLabelPoint({ rect, placement: "inside", chartWidth: 400, chartHeight: 300, foreground: "#f5f5f5", fillColor: "#327277" });
    const onLight = rectLabelPoint({ rect, placement: "inside", chartWidth: 400, chartHeight: 300, foreground: "#f5f5f5", fillColor: "#f2c14e" });

    expect(onDark.fill).toBe("#ffffff");
    expect(onLight.fill).toBe("#171717");
    expect(onLight.className).toContain("ink");
  });

  it("places waterfall outside labels above positive and below negative bars", () => {
    const positive = waterfallLabelPoint({
      rect: { x: 40, y: 120, width: 60, height: 12 },
      placement: "outside",
      positive: true,
      foreground: "#111",
      fillColor: "#327277"
    });
    const negative = waterfallLabelPoint({
      rect: { x: 40, y: 120, width: 60, height: 12 },
      placement: "outside",
      positive: false,
      foreground: "#111",
      fillColor: "#327277"
    });

    expect(positive.y).toBeLessThan(120);
    expect(negative.y).toBeGreaterThan(132);
  });

  it("moves auto scatter labels outside a bubble they don't fit in", () => {
    const labels = placeScatterLabels(
      [
        { id: "wide", cx: 200, cy: 100, radius: 30, color: "#327277", lines: ["Cloud Platform"], placement: "auto" },
        { id: "short", cx: 400, cy: 100, radius: 30, color: "#327277", lines: ["ERP"], placement: "auto" }
      ],
      { width: 600, height: 300 },
      "#111"
    );

    expect(labels.get("wide")?.className).toBe("svg-label");
    expect(labels.get("wide")?.y).toBeLessThan(100 - 30);
    expect(labels.get("short")?.className).toContain("light");
    expect(labels.get("short")?.y).toBe(104);
  });

  it("uses dark ink inside light bubbles", () => {
    const labels = placeScatterLabels(
      [{ id: "a", cx: 100, cy: 100, radius: 30, color: "#f2c14e", lines: ["ERP"], placement: "auto" }],
      { width: 300, height: 300 },
      "#f5f5f5"
    );

    expect(labels.get("a")?.className).toContain("ink");
    expect(labels.get("a")?.fill).toBe("#171717");
  });

  it("keeps neighbouring scatter labels from overlapping", () => {
    const labels = placeScatterLabels(
      [
        { id: "a", cx: 100, cy: 100, radius: 6, color: "#327277", lines: ["Security Suite"], placement: "auto" },
        { id: "b", cx: 110, cy: 104, radius: 6, color: "#327277", lines: ["Collaboration"], placement: "auto" }
      ],
      { width: 400, height: 300 },
      "#111"
    );
    const a = labels.get("a")!;
    const b = labels.get("b")!;

    expect(Math.abs(a.x - b.x) > 60 || Math.abs(a.y - b.y) >= 14).toBe(true);
  });

  it("flips labels below points at the top edge and applies manual offsets once", () => {
    const placed = placeScatterLabels(
      [{ id: "a", cx: 100, cy: 8, radius: 7, color: "#327277", lines: ["Top"], placement: "outside" }],
      { width: 200, height: 200 },
      "#111"
    );
    const moved = placeScatterLabels(
      [{ id: "a", cx: 100, cy: 8, radius: 7, color: "#327277", lines: ["Top"], placement: "outside", offset: { dx: 5, dy: -3 } }],
      { width: 200, height: 200 },
      "#111"
    );

    expect(placed.get("a")!.y).toBeGreaterThan(8);
    expect(moved.get("a")!.x).toBe(placed.get("a")!.x + 5);
    expect(moved.get("a")!.y).toBe(placed.get("a")!.y - 3);
  });

  it("draws a leader from the bubble edge for callouts", () => {
    const labels = placeScatterLabels(
      [{ id: "a", cx: 100, cy: 100, radius: 10, color: "#327277", lines: ["Callout"], placement: "callout" }],
      { width: 300, height: 300 },
      "#111"
    );
    const leader = labels.get("a")!.leader!;

    expect(Math.hypot(leader.x1 - 100, leader.y1 - 100)).toBeCloseTo(10, 5);
    expect(leader.y2).toBeLessThan(90);
  });
});
