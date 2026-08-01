import type { ChartTheme } from "./types";

/**
 * Chart themes describe the exported artifact, not the editor chrome.
 *
 * Theme ids are load-bearing: storage.ts re-resolves a stored project's theme by
 * id, so ids must not be renamed or removed or saved projects silently fall back
 * to the default. Palettes are ordered so neighbouring entries stay separable by
 * hue and lightness, since adjacent marks receive adjacent colours.
 */
export const themes: ChartTheme[] = [
  {
    id: "boardroom",
    name: "Boardroom",
    background: "#f7f3ec",
    foreground: "#171717",
    muted: "#5f5951",
    grid: "#d5cdc0",
    palette: ["#2f6f73", "#d84c36", "#f0b84d", "#5f5aa2", "#61a36f", "#9a6a42", "#3c7fb1", "#c65785"]
  },
  {
    id: "mono",
    name: "Annual Report",
    background: "#f8faf7",
    foreground: "#111827",
    muted: "#575c66",
    grid: "#d5dad1",
    palette: ["#1f4f5f", "#c94c4c", "#d5a021", "#3b7a57", "#756bb1", "#6d5a4a", "#5a8bb0", "#b05a7b"]
  },
  {
    id: "clear",
    name: "Clear Deck",
    background: "#ffffff",
    foreground: "#101828",
    muted: "#5d6672",
    grid: "#d0d5dd",
    palette: ["#1d6f9c", "#e05c3d", "#3f9e88", "#dba32c", "#4d6b8a", "#b0466b", "#6f8f4a", "#7a63b8"]
  },
  {
    id: "graphite",
    name: "Graphite",
    background: "#1a1f1e",
    foreground: "#f2f5f4",
    muted: "#9aa5a2",
    grid: "#3a4342",
    palette: ["#5ec7ae", "#f08a72", "#f2c464", "#9b93de", "#8ecb92", "#c9a37c", "#79b3dd", "#e393b8"]
  }
];

export const defaultTheme = themes[0];
