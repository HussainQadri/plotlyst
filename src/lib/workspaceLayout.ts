/**
 * Persisted chrome layout: side-panel widths and collapse state.
 *
 * The editor used to hard-code a 310px | 1fr | 310px grid, which left the
 * inspector too narrow for its own controls and gave the user no way to trade
 * panel space for canvas space. Widths are now dragged and remembered.
 */

export type WorkspaceLayout = {
  dataWidth: number;
  inspectorWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};

export const panelBounds = {
  data: { min: 272, max: 520 },
  inspector: { min: 256, max: 460 }
} as const;

export const defaultWorkspaceLayout: WorkspaceLayout = {
  dataWidth: 324,
  inspectorWidth: 312,
  leftCollapsed: false,
  rightCollapsed: false
};

const storageKey = "plotlyst.layout.v1";

export function clampPanelWidth(width: number, bounds: { min: number; max: number }): number {
  if (!Number.isFinite(width)) return bounds.min;
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, width)));
}

export function normalizeWorkspaceLayout(raw: unknown): WorkspaceLayout {
  if (typeof raw !== "object" || raw === null) return defaultWorkspaceLayout;
  const value = raw as Partial<Record<keyof WorkspaceLayout, unknown>>;

  return {
    dataWidth: clampPanelWidth(
      typeof value.dataWidth === "number" ? value.dataWidth : defaultWorkspaceLayout.dataWidth,
      panelBounds.data
    ),
    inspectorWidth: clampPanelWidth(
      typeof value.inspectorWidth === "number" ? value.inspectorWidth : defaultWorkspaceLayout.inspectorWidth,
      panelBounds.inspector
    ),
    leftCollapsed: value.leftCollapsed === true,
    rightCollapsed: value.rightCollapsed === true
  };
}

export function loadWorkspaceLayout(): WorkspaceLayout {
  if (typeof window === "undefined") return defaultWorkspaceLayout;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultWorkspaceLayout;
    return normalizeWorkspaceLayout(JSON.parse(raw));
  } catch {
    return defaultWorkspaceLayout;
  }
}

export function saveWorkspaceLayout(layout: WorkspaceLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    // Layout persistence is best-effort.
  }
}
