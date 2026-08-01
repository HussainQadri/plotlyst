import { describe, expect, it } from "vitest";
import { clampZoom, fitZoom, formatZoom, maxZoom, minZoom, slideBaseWidth, slideFrameVars, stepZoom } from "./zoom";

describe("clampZoom", () => {
  it("keeps values inside the stop range", () => {
    expect(clampZoom(0.1)).toBe(minZoom);
    expect(clampZoom(9)).toBe(maxZoom);
    expect(clampZoom(1.25)).toBe(1.25);
  });

  it("falls back to 100% for non-finite input", () => {
    expect(clampZoom(Number.NaN)).toBe(1);
  });
});

describe("stepZoom", () => {
  it("moves to the next stop in each direction", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.8);
  });

  it("treats fit as 100% so the first step is predictable", () => {
    expect(stepZoom(fitZoom, 1)).toBe(1.25);
    expect(stepZoom(fitZoom, -1)).toBe(0.8);
  });

  it("stays put at the ends of the range", () => {
    expect(stepZoom(maxZoom, 1)).toBe(maxZoom);
    expect(stepZoom(minZoom, -1)).toBe(minZoom);
  });
});

describe("formatZoom", () => {
  it("labels fit mode and percentages", () => {
    expect(formatZoom(fitZoom)).toBe("Fit");
    expect(formatZoom(0.67)).toBe("67%");
    expect(formatZoom(2)).toBe("200%");
  });
});

describe("slideFrameVars", () => {
  it("fills the stage up to the nominal width in fit mode", () => {
    expect(slideFrameVars(fitZoom)).toEqual({ "--slide-w": "100%", "--slide-max": `${slideBaseWidth}px` });
  });

  it("pins an exact width when zoomed", () => {
    expect(slideFrameVars(2)).toEqual({ "--slide-w": `${slideBaseWidth * 2}px`, "--slide-max": "none" });
  });
});
