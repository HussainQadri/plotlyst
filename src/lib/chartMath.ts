import { defaultWaterfallSettings } from "./labels";
import type { LabelPlacement, MarimekkoData, PieData, VisualOverride, WaterfallData, WaterfallKind, WaterfallSettings } from "./types";

export type PieSliceLayout = {
  id: string;
  label: string;
  value: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  color: string;
  labelPlacement: LabelPlacement;
  labelVisible: boolean;
};

export type MarimekkoSegmentLayout = {
  id: string;
  label: string;
  value: number;
  percentage: number;
  columnLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  labelPlacement: LabelPlacement;
  labelVisible: boolean;
};

export type WaterfallBarLayout = {
  id: string;
  label: string;
  amount: number;
  displayValue: number;
  percentage?: number;
  kind: WaterfallKind;
  startValue: number;
  endValue: number;
  x: number;
  y: number;
  startY: number;
  endY: number;
  connectorInY: number;
  connectorOutY: number;
  width: number;
  height: number;
  baseline: number;
  color: string;
  labelPlacement: LabelPlacement;
  labelVisible: boolean;
};

function getOverride(overrides: Record<string, VisualOverride>, id: string): VisualOverride {
  return overrides[id] ?? {};
}

export function resolveLabel(rawLabel: string, override: VisualOverride): string {
  return override.label?.trim() ? override.label : rawLabel;
}

export function resolveColor(defaultColor: string, rawColor: string | undefined, override: VisualOverride): string {
  return override.fill ?? rawColor ?? defaultColor;
}

export function resolveLabelPlacement(override: VisualOverride, fallback: LabelPlacement): LabelPlacement {
  return override.labelPlacement ?? fallback;
}

export function resolveLabelVisible(override: VisualOverride): boolean {
  return override.labelVisible ?? true;
}

export function layoutPie(
  data: PieData,
  palette: string[],
  overrides: Record<string, VisualOverride> = {}
): PieSliceLayout[] {
  const positiveRows = data.rows.filter((row) => Number.isFinite(row.value) && row.value > 0);
  const total = positiveRows.reduce((sum, row) => sum + row.value, 0);
  let cursor = -90;

  return positiveRows.map((row, index) => {
    const override = getOverride(overrides, row.id);
    const span = total > 0 ? (row.value / total) * 360 : 0;
    const startAngle = cursor;
    const endAngle = cursor + span;
    cursor = endAngle;

    return {
      id: row.id,
      label: resolveLabel(row.label, override),
      value: row.value,
      percentage: total > 0 ? row.value / total : 0,
      startAngle,
      endAngle,
      color: resolveColor(palette[index % palette.length], row.color, override),
      labelPlacement: resolveLabelPlacement(override, "auto"),
      labelVisible: resolveLabelVisible(override)
    };
  });
}

export function layoutMarimekko(
  data: MarimekkoData,
  palette: string[],
  overrides: Record<string, VisualOverride> = {},
  width = 720,
  height = 330
): MarimekkoSegmentLayout[] {
  const columnTotals = data.columns.map((column) =>
    column.segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  );
  const grandTotal = columnTotals.reduce((sum, total) => sum + total, 0);
  let x = 0;

  return data.columns.flatMap((column, columnIndex) => {
    const columnTotal = columnTotals[columnIndex];
    const columnWidth = grandTotal > 0 ? (columnTotal / grandTotal) * width : width / Math.max(1, data.columns.length);
    let yFromBottom = height;

    const layouts = column.segments
      .filter((segment) => Number.isFinite(segment.value) && segment.value > 0)
      .map((segment, segmentIndex) => {
        const segmentHeight = columnTotal > 0 ? (segment.value / columnTotal) * height : 0;
        yFromBottom -= segmentHeight;
        const override = getOverride(overrides, segment.id);

        return {
          id: segment.id,
          label: resolveLabel(segment.label, override),
          value: segment.value,
          percentage: columnTotal > 0 ? segment.value / columnTotal : 0,
          columnLabel: column.label,
          x,
          y: yFromBottom,
          width: columnWidth,
          height: segmentHeight,
          color: resolveColor(palette[segmentIndex % palette.length], segment.color, override),
          labelPlacement: resolveLabelPlacement(override, "auto"),
          labelVisible: resolveLabelVisible(override)
        };
      });

    x += columnWidth;
    return layouts;
  });
}

export function layoutWaterfall(
  data: WaterfallData,
  palette: string[],
  overrides: Record<string, VisualOverride> = {},
  width = 720,
  height = 320,
  settings: WaterfallSettings = defaultWaterfallSettings()
): WaterfallBarLayout[] {
  const values: Array<{ start: number; end: number; displayValue: number }> = [];
  const direction = settings.buildMode === "buildDown" ? -1 : 1;
  let running = 0;

  data.rows.forEach((row) => {
    if (row.kind === "start") {
      values.push({ start: 0, end: row.amount, displayValue: row.amount });
      running = row.amount;
      return;
    }

    if (row.kind === "subtotal" || row.kind === "total") {
      values.push({
        start: 0,
        end: running,
        displayValue: settings.totalLabelMode === "amount" ? row.amount : running
      });
      return;
    }

    const start = running;
    running += row.amount * direction;
    values.push({ start, end: running, displayValue: row.amount });
  });

  const domainValues = values.length > 0 ? values.flatMap((value) => [value.start, value.end]) : [0, 1];
  const rawMin = Math.min(...domainValues);
  const rawMax = Math.max(...domainValues);
  const domainMin = settings.forceBaseline ? Math.min(0, rawMin) : rawMin;
  const domainMax = settings.forceBaseline ? Math.max(0, rawMax) : rawMax;
  const domain = domainMax - domainMin || Math.max(1, Math.abs(domainMax));
  const barGap = 16;
  const barWidth = Math.max(28, (width - barGap * Math.max(0, data.rows.length - 1)) / Math.max(1, data.rows.length));

  const yScale = (value: number) => height - ((value - domainMin) / domain) * height;
  const baseline = yScale(0);

  return data.rows.map((row, index) => {
    const value = values[index];
    const yStart = yScale(value.start);
    const yEnd = yScale(value.end);
    const y = Math.min(yStart, yEnd);
    const barHeight = Math.max(2, Math.abs(yEnd - yStart));
    const override = getOverride(overrides, row.id);
    const defaultColor =
      row.kind === "total" || row.kind === "start"
        ? palette[0]
        : row.kind === "subtotal"
          ? palette[4] ?? palette[0]
          : row.amount >= 0
            ? palette[2] ?? palette[0]
            : palette[1] ?? palette[0];
    return {
      id: row.id,
      label: resolveLabel(row.label, override),
      amount: row.amount,
      displayValue: value.displayValue,
      kind: row.kind,
      startValue: value.start,
      endValue: value.end,
      x: index * (barWidth + barGap),
      y,
      startY: yStart,
      endY: yEnd,
      connectorInY: row.kind === "change" ? yStart : yEnd,
      connectorOutY: yEnd,
      width: barWidth,
      height: barHeight,
      baseline,
      color: resolveColor(defaultColor, row.color, override),
      labelPlacement: resolveLabelPlacement(override, "auto"),
      labelVisible: resolveLabelVisible(override)
    };
  });
}

export function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

export function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}
