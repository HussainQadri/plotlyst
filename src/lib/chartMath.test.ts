import { describe, expect, it } from "vitest";
import { layoutMarimekko, layoutPie, layoutWaterfall } from "./chartMath";
import { sampleMarimekkoData, samplePieData, sampleWaterfallData } from "./samples";
import { defaultTheme } from "./themes";

describe("chart layout math", () => {
  it("calculates pie angles that cover a full circle", () => {
    const slices = layoutPie(samplePieData, defaultTheme.palette);
    expect(slices[0].startAngle).toBe(-90);
    expect(slices.at(-1)?.endAngle).toBeCloseTo(270, 5);
    expect(slices.reduce((sum, slice) => sum + slice.percentage, 0)).toBeCloseTo(1, 5);
  });

  it("normalizes Marimekko columns and segments", () => {
    const segments = layoutMarimekko(sampleMarimekkoData, defaultTheme.palette, {}, 600, 300);
    const totalWidth = new Map<string, number>();
    segments.forEach((segment) => totalWidth.set(segment.columnLabel, segment.width));

    const widthSum = Array.from(totalWidth.values()).reduce((sum, width) => sum + width, 0);
    expect(widthSum).toBeCloseTo(600, 5);

    const firstColumnHeight = segments
      .filter((segment) => segment.columnLabel === "North America")
      .reduce((sum, segment) => sum + segment.height, 0);
    expect(firstColumnHeight).toBeCloseTo(300, 5);
  });

  it("calculates waterfall cumulative totals and negative changes", () => {
    const bars = layoutWaterfall(sampleWaterfallData, defaultTheme.palette, {}, 600, 300);
    const total = bars.at(-1);

    expect(total?.kind).toBe("total");
    expect(total?.displayValue).toBe(158);
    expect(bars.find((bar) => bar.id === "wf-churn")?.displayValue).toBe(-16);
  });
});
