import type { ChartProject, MarimekkoData, PieData, WaterfallData } from "./types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateProject(project: ChartProject): ValidationResult {
  const errors: string[] = [];

  if (!project.title.trim()) {
    errors.push("Add a chart title.");
  }

  if (project.type === "pie") {
    validatePie(project.data as PieData, errors);
  }

  if (project.type === "marimekko") {
    validateMarimekko(project.data as MarimekkoData, errors);
  }

  if (project.type === "waterfall") {
    validateWaterfall(project.data as WaterfallData, errors);
  }

  return { valid: errors.length === 0, errors };
}

function validatePie(data: PieData, errors: string[]) {
  if (data.rows.length < 2) {
    errors.push("Pie charts need at least two rows.");
  }

  const total = data.rows.reduce((sum, row) => sum + (Number.isFinite(row.value) ? Math.max(0, row.value) : 0), 0);
  if (total <= 0) {
    errors.push("Pie values must add up to more than zero.");
  }

  data.rows.forEach((row) => {
    if (!row.label.trim()) errors.push("Every pie slice needs a label.");
    if (!Number.isFinite(row.value) || row.value < 0) errors.push(`${row.label || "A pie slice"} needs a non-negative value.`);
  });
}

function validateMarimekko(data: MarimekkoData, errors: string[]) {
  if (data.columns.length < 2) {
    errors.push("Marimekko charts need at least two columns.");
  }

  data.columns.forEach((column) => {
    if (!column.label.trim()) errors.push("Every Marimekko column needs a label.");
    if (column.segments.length === 0) errors.push(`${column.label || "A column"} needs at least one segment.`);

    const total = column.segments.reduce(
      (sum, segment) => sum + (Number.isFinite(segment.value) ? Math.max(0, segment.value) : 0),
      0
    );
    if (total <= 0) errors.push(`${column.label || "A column"} needs a positive total.`);

    column.segments.forEach((segment) => {
      if (!segment.label.trim()) errors.push("Every Marimekko segment needs a label.");
      if (!Number.isFinite(segment.value) || segment.value < 0) {
        errors.push(`${segment.label || "A segment"} needs a non-negative value.`);
      }
    });
  });
}

function validateWaterfall(data: WaterfallData, errors: string[]) {
  if (data.rows.length < 2) {
    errors.push("Waterfall charts need at least two bars.");
  }

  data.rows.forEach((row) => {
    if (!row.label.trim()) errors.push("Every waterfall bar needs a label.");
    if (!Number.isFinite(row.amount)) errors.push(`${row.label || "A bar"} needs a numeric amount.`);
    if (!["start", "change", "subtotal", "total"].includes(row.kind)) {
      errors.push(`${row.label || "A bar"} has an unknown waterfall kind.`);
    }
  });
}
