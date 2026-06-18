import { parseDelimited, toNumber } from "./csv";
import type { MarimekkoColumn, MarimekkoData, PieData, WaterfallData, WaterfallKind } from "./types";

export type IdFactory = (prefix: string) => string;

export function parsePieSheet(text: string, makeId: IdFactory): PieData | null {
  const rows = parseDelimited(text);
  if (rows.length === 0) return null;

  return {
    rows: rows.map((row, index) => ({
      id: makeId(`pie-${index}`),
      label: row[0] || `Slice ${index + 1}`,
      value: toNumber(row[1] ?? "0")
    }))
  };
}

export function parseWaterfallSheet(text: string, makeId: IdFactory): WaterfallData | null {
  const rows = parseDelimited(text);
  if (rows.length === 0) return null;

  return {
    rows: rows.map((row, index) => {
      const kind = normalizeWaterfallKind(row[2]) ?? (index === 0 ? "start" : index === rows.length - 1 ? "total" : "change");
      return {
        id: makeId(`wf-${index}`),
        label: row[0] || `Bar ${index + 1}`,
        amount: kind === "subtotal" || kind === "total" ? 0 : toNumber(row[1] ?? "0"),
        kind
      };
    })
  };
}

export function parseMarimekkoMatrix(text: string, makeId: IdFactory): MarimekkoData | null {
  const rows = parseDelimited(text);
  if (rows.length < 2) return null;

  const hasHeader = rows[0][0] === "" || /segment|category/i.test(rows[0][0]);
  const headers = hasHeader ? rows[0].slice(1) : rows[0].slice(1).map((_, index) => `Column ${index + 1}`);
  const body = hasHeader ? rows.slice(1) : rows;
  if (headers.length === 0 || body.length === 0) return null;

  const columns: MarimekkoColumn[] = headers.map((header, columnIndex) => ({
    id: makeId(`mekko-col-${columnIndex}`),
    label: header || `Column ${columnIndex + 1}`,
    segments: body.map((row, rowIndex) => ({
      id: makeId(`mekko-seg-${columnIndex}-${rowIndex}`),
      label: row[0] || `Segment ${rowIndex + 1}`,
      value: toNumber(row[columnIndex + 1] ?? "0")
    }))
  }));

  return { columns };
}

export function normalizeWaterfallKind(value: string | undefined): WaterfallKind | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("start")) return "start";
  if (normalized.startsWith("sub") || normalized === "=") return "subtotal";
  if (normalized.startsWith("total")) return "total";
  if (normalized.startsWith("change") || normalized.startsWith("delta")) return "change";
  return null;
}

export function isCalculatedWaterfallKind(kind: WaterfallKind): boolean {
  return kind === "subtotal" || kind === "total";
}
