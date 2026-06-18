import { describe, expect, it } from "vitest";
import { layoutMarimekko, layoutPie, layoutWaterfall } from "./chartMath";
import { defaultWaterfallSettings } from "./labels";
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

  it("returns Mekko totals and percentages", () => {
    const segments = layoutMarimekko(sampleMarimekkoData, defaultTheme.palette, {}, 600, 300, {
      mode: "percent",
      showColumnTotals: true,
      showColumnPercentages: true,
      showSegmentPercentages: true,
      showAxis: true,
      showTicks: true,
      showRidge: false,
      segmentOrder: "sheet"
    });
    const northAmerica = segments.filter((segment) => segment.columnLabel === "North America");

    expect(northAmerica[0].columnTotal).toBe(100);
    expect(northAmerica[0].columnPercentage).toBeCloseTo(1 / 3, 5);
    expect(northAmerica[0].segmentPercentage).toBeCloseTo(0.56, 5);
    expect(northAmerica[0].grandPercentage).toBeCloseTo(56 / 300, 5);
    expect(northAmerica[0].percentage).toBeCloseTo(0.56, 5);
  });

  it("sorts Mekko segments without mutating source order", () => {
    const segments = layoutMarimekko(sampleMarimekkoData, defaultTheme.palette, {}, 600, 300, {
      mode: "absolute",
      showColumnTotals: true,
      showColumnPercentages: true,
      showSegmentPercentages: false,
      showAxis: true,
      showTicks: true,
      showRidge: false,
      segmentOrder: "ascending"
    }).filter((segment) => segment.columnLabel === "North America");

    expect(segments.map((segment) => segment.label)).toEqual(["Hardware", "Services", "Software"]);
    expect(sampleMarimekkoData.columns[0].segments.map((segment) => segment.label)).toEqual(["Software", "Services", "Hardware"]);
  });

  it("groups small Mekko segments into Other", () => {
    const data = {
      columns: [
        {
          id: "c1",
          label: "Market",
          segments: [
            { id: "a", label: "A", value: 90 },
            { id: "b", label: "B", value: 5 },
            { id: "c", label: "C", value: 5 }
          ]
        }
      ]
    };
    const segments = layoutMarimekko(data, defaultTheme.palette, {}, 600, 300, {
      mode: "absolute",
      showColumnTotals: true,
      showColumnPercentages: true,
      showSegmentPercentages: false,
      showAxis: true,
      showTicks: true,
      showRidge: false,
      segmentOrder: "sheet",
      otherThreshold: 0.1
    });

    expect(segments.map((segment) => segment.label)).toEqual(["A", "Other"]);
    expect(segments.find((segment) => segment.label === "Other")?.value).toBe(10);
  });

  it("calculates waterfall cumulative totals and negative changes", () => {
    const bars = layoutWaterfall(sampleWaterfallData, defaultTheme.palette, {}, 600, 300);
    const subtotal = bars.find((bar) => bar.kind === "subtotal");
    const total = bars.at(-1);

    expect(subtotal?.displayValue).toBe(181);
    expect(subtotal?.endValue).toBe(181);
    expect(total?.kind).toBe("total");
    expect(total?.displayValue).toBe(158);
    expect(bars.find((bar) => bar.id === "wf-churn")?.displayValue).toBe(-16);
  });

  it("supports build-down waterfall changes without changing displayed signs", () => {
    const bars = layoutWaterfall(sampleWaterfallData, defaultTheme.palette, {}, 600, 300, {
      ...defaultWaterfallSettings(),
      buildMode: "buildDown"
    });
    const newBusiness = bars.find((bar) => bar.id === "wf-new");
    const total = bars.at(-1);

    expect(newBusiness?.displayValue).toBe(34);
    expect(newBusiness?.endValue).toBeLessThan(newBusiness?.startValue ?? 0);
    expect(total?.displayValue).toBe(98);
  });

  it("returns connector anchors for changes and calculated totals", () => {
    const bars = layoutWaterfall(sampleWaterfallData, defaultTheme.palette, {}, 600, 300);
    const expansion = bars.find((bar) => bar.id === "wf-expansion");
    const subtotal = bars.find((bar) => bar.kind === "subtotal");

    expect(expansion?.connectorInY).toBe(expansion?.startY);
    expect(expansion?.connectorOutY).toBe(expansion?.endY);
    expect(subtotal?.connectorInY).toBe(subtotal?.endY);
  });
});
