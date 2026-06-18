export type ExportScale = 1 | 2 | 3;

export type ExportBackground = "theme" | "transparent";

export type ExportMode = "draft" | "clean";

export type ExportSettings = {
  mode: ExportMode;
  scale: ExportScale;
  background: ExportBackground;
  filename: string;
};

export const baseExportSize = { width: 1920, height: 1080 };

export function exportDimensions(scale: ExportScale) {
  return {
    width: baseExportSize.width * scale,
    height: baseExportSize.height * scale
  };
}

export function safeExportName(value: string, fallback = "chart"): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

export function watermarkText(title: string): string {
  return `${title.trim() || "Plotlyst"} - draft`;
}
