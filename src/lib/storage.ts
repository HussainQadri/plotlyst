import type { ChartProject, ChartType, MarimekkoData, PieData, WaterfallData } from "./types";

const storageKey = "bcharts.project.v1";

export function loadStoredProject(): ChartProject | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as ChartProject;
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
