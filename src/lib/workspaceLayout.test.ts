import { describe, expect, it } from "vitest";
import {
  clampPanelWidth,
  defaultWorkspaceLayout,
  normalizeWorkspaceLayout,
  panelBounds
} from "./workspaceLayout";

describe("clampPanelWidth", () => {
  it("holds widths inside their bounds", () => {
    expect(clampPanelWidth(10, panelBounds.data)).toBe(panelBounds.data.min);
    expect(clampPanelWidth(9999, panelBounds.data)).toBe(panelBounds.data.max);
    expect(clampPanelWidth(300.6, panelBounds.data)).toBe(301);
  });

  it("falls back to the minimum for non-finite input", () => {
    expect(clampPanelWidth(Number.NaN, panelBounds.inspector)).toBe(panelBounds.inspector.min);
  });
});

describe("normalizeWorkspaceLayout", () => {
  it("returns defaults for junk input", () => {
    expect(normalizeWorkspaceLayout(null)).toEqual(defaultWorkspaceLayout);
    expect(normalizeWorkspaceLayout("wide")).toEqual(defaultWorkspaceLayout);
  });

  it("clamps stored widths that fall outside the current bounds", () => {
    const layout = normalizeWorkspaceLayout({ dataWidth: 12, inspectorWidth: 4000 });
    expect(layout.dataWidth).toBe(panelBounds.data.min);
    expect(layout.inspectorWidth).toBe(panelBounds.inspector.max);
  });

  it("treats collapse flags as strictly boolean", () => {
    const layout = normalizeWorkspaceLayout({ leftCollapsed: "yes", rightCollapsed: true });
    expect(layout.leftCollapsed).toBe(false);
    expect(layout.rightCollapsed).toBe(true);
  });

  it("keeps valid values untouched", () => {
    const layout = normalizeWorkspaceLayout({
      dataWidth: 340,
      inspectorWidth: 300,
      leftCollapsed: false,
      rightCollapsed: false
    });
    expect(layout).toEqual({ dataWidth: 340, inspectorWidth: 300, leftCollapsed: false, rightCollapsed: false });
  });
});
