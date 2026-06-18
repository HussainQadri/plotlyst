import type { Annotation, ChartProject, ChartType, MarimekkoData, PieData, WaterfallData } from "./types";
import { normalizeChartSettings } from "./labels";
import { defaultTheme, themes } from "./themes";

const storageKey = "plotlyst.project.v1";

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
    visualOverrides: isRecord(raw.visualOverrides) ? (raw.visualOverrides as ChartProject["visualOverrides"]) : {},
    annotations: normalizeAnnotations(raw.annotations)
  };
}

function normalizeTheme(raw: unknown) {
  if (!isRecord(raw) || typeof raw.id !== "string") return defaultTheme;
  return themes.find((theme) => theme.id === raw.id) ?? defaultTheme;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAnnotations(raw: unknown): Annotation[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): Annotation[] => {
    if (!isRecord(item)) return [];
    if (typeof item.id !== "string") return [];
    if (!isAnnotationType(item.type)) return [];
    if (!Array.isArray(item.anchorIds) || !item.anchorIds.every((id) => typeof id === "string")) return [];

    return [
      {
        id: item.id,
        type: item.type,
        anchorIds: item.anchorIds,
        label: typeof item.label === "string" ? item.label : undefined,
        visible: typeof item.visible === "boolean" ? item.visible : true,
        style: isRecord(item.style)
          ? {
              stroke: typeof item.style.stroke === "string" ? item.style.stroke : undefined,
              fill: typeof item.style.fill === "string" ? item.style.fill : undefined,
              dashed: typeof item.style.dashed === "boolean" ? item.style.dashed : undefined
            }
          : undefined,
        labelOffset: isRecord(item.labelOffset) && typeof item.labelOffset.dx === "number" && typeof item.labelOffset.dy === "number"
          ? { dx: item.labelOffset.dx, dy: item.labelOffset.dy }
          : undefined
      }
    ];
  });
}

function isAnnotationType(value: unknown): value is Annotation["type"] {
  return value === "differenceArrow" || value === "totalArrow" || value === "valueLine" || value === "connectorNote" || value === "callout";
}
