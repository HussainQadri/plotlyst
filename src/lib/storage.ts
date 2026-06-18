import type { ChartProject, ChartType, MarimekkoData, PieData, WaterfallData } from "./types";
import { normalizeChartSettings } from "./labels";
import { defaultTheme, themes } from "./themes";

const storageKey = "bcharts.project.v1";

export function loadStoredProject(): ChartProject | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return normalizeStoredProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveStoredProject(project: ChartProject) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(project));
}

export function isPieData(type: ChartType, data: unknown): data is PieData {
  return type === "pie" && typeof data === "object" && data !== null && "rows" in data;
}

export function isMarimekkoData(type: ChartType, data: unknown): data is MarimekkoData {
  return type === "marimekko" && typeof data === "object" && data !== null && "columns" in data;
}

export function isWaterfallData(type: ChartType, data: unknown): data is WaterfallData {
  return type === "waterfall" && typeof data === "object" && data !== null && "rows" in data;
}

function normalizeStoredProject(raw: unknown): ChartProject | null {
  if (!isRecord(raw)) return null;
  const type = raw.type;
  if (type !== "pie" && type !== "marimekko" && type !== "waterfall") return null;
  const data = raw.data;
  if (!isPieData(type, data) && !isMarimekkoData(type, data) && !isWaterfallData(type, data)) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : `project-${type}`,
    title: typeof raw.title === "string" ? raw.title : "Business chart",
    type,
    theme: normalizeTheme(raw.theme),
    data,
    settings: normalizeChartSettings(raw.settings, type),
    visualOverrides: isRecord(raw.visualOverrides) ? (raw.visualOverrides as ChartProject["visualOverrides"]) : {}
  };
}

function normalizeTheme(raw: unknown) {
  if (!isRecord(raw) || typeof raw.id !== "string") return defaultTheme;
  return themes.find((theme) => theme.id === raw.id) ?? defaultTheme;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
