import { describe, expect, it } from "vitest";
import { exportDimensions, safeExportName, watermarkText } from "./export";

describe("export helpers", () => {
  it("sanitizes filenames", () => {
    expect(safeExportName("Revenue Bridge / FY26")).toBe("revenue-bridge-fy26");
    expect(safeExportName("   ")).toBe("chart");
  });

  it("scales export dimensions", () => {
    expect(exportDimensions(2)).toEqual({ width: 3840, height: 2160 });
  });

  it("builds draft watermark text", () => {
    expect(watermarkText("Revenue Mix")).toBe("Revenue Mix - draft");
  });
});
