import { parseDelimited, toNumber } from "./csv";
import type { MarimekkoColumn, MarimekkoData, PieData, ScatterData, WaterfallData, WaterfallKind } from "./types";

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

export function parseScatterSheet(text: string, makeId: IdFactory): ScatterData | null {
  const rows = parseDelimited(text);
  if (rows.length === 0) return null;

  // Any first row whose X and Y cells aren't numbers is a header, whatever the columns are called.
  const hasHeader = !isNumericCell(rows[0][1]) && !isNumericCell(rows[0][2]);
  const body = hasHeader ? rows.slice(1) : rows;
  if (body.length === 0) return null;

  return {
    points: body.map((row, index) => {
      const rawSize = row[3]?.trim();
      return {
        id: makeId(`scatter-${index}`),
        label: row[0] || `Point ${index + 1}`,
        x: toNumber(row[1] ?? "0"),
        y: toNumber(row[2] ?? "0"),
        ...(rawSize ? { size: toNumber(rawSize) } : {})
      };
    })
  };
}

function isNumericCell(cell: string | undefined): boolean {
  const cleaned = (cell ?? "").replace(/[$,%\s]/g, "");
  return cleaned !== "" && Number.isFinite(Number(cleaned));
}

/**
 * Reads an in-progress numeric cell: a finite number, `undefined` for a cleared
 * optional cell, or `null` while the text isn't a usable number yet.
 */
export function parseNumberDraft(text: string, optional = false): number | undefined | null {
  const trimmed = text.trim();
  if (trimmed === "") return optional ? undefined : null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
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
