import { describe, expect, it } from "vitest";
import { normalizeWaterfallKind, parseMarimekkoMatrix, parsePieSheet, parseWaterfallSheet } from "./datasheet";

const makeId = (prefix: string) => `${prefix}-id`;

describe("datasheet parsing", () => {
  it("maps two-column pie data", () => {
    const data = parsePieSheet("Enterprise\t42\nSMB\t18", makeId);

    expect(data?.rows).toEqual([
      { id: "pie-0-id", label: "Enterprise", value: 42 },
      { id: "pie-1-id", label: "SMB", value: 18 }
    ]);
  });

  it("maps waterfall rows and calculated kinds", () => {
    const data = parseWaterfallSheet("2025\t128\tstart\nNew\t34\tchange\nGross\t0\t=\n2026\t0\ttotal", makeId);

    expect(data?.rows.map((row) => row.kind)).toEqual(["start", "change", "subtotal", "total"]);
    expect(data?.rows[2].amount).toBe(0);
    expect(normalizeWaterfallKind("subtotal")).toBe("subtotal");
  });

  it("maps Marimekko matrix data", () => {
    const data = parseMarimekkoMatrix("Segment\tNA\tEMEA\nSoftware\t56\t38\nServices\t27\t35", makeId);

    expect(data?.columns).toHaveLength(2);
    expect(data?.columns[0].label).toBe("NA");
    expect(data?.columns[1].segments[0]).toMatchObject({ label: "Software", value: 38 });
  });
});
