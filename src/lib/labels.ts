import type {
  ChartSettings,
  ChartType,
  LabelContentField,
  LabelSeparator,
  LabelSettings,
  MekkoMode,
  MekkoSegmentOrder,
  MekkoSettings,
  NegativeStyle,
  NumberFormatSettings,
  NumberScale,
  WaterfallBuildMode,
  WaterfallConnectorStyle,
  WaterfallSettings,
  WaterfallTotalLabelMode
} from "./types";

const defaultValueFormat: NumberFormatSettings = {
  decimals: 0,
  scale: "none",
  prefix: "",
  suffix: "",
  showPlus: false,
  negativeStyle: "minus"
};

export function defaultLabelSettings(type: ChartType): LabelSettings {
  return {
    fields: type === "pie" ? ["label", "percent"] : ["label", "value"],
    separator: "space",
    valueFormat: {
      ...defaultValueFormat,
      showPlus: type === "waterfall"
    },
    percentDecimals: 0
  };
}

export function defaultChartSettings(type: ChartType): ChartSettings {
  return {
    showLegend: true,
    showTitle: true,
    showLabels: true,
    labelContent: defaultLabelSettings(type),
    waterfall: defaultWaterfallSettings(),
    mekko: defaultMekkoSettings()
  };
}

export function defaultWaterfallSettings(): WaterfallSettings {
  return {
    showConnectors: true,
    connectorStyle: "dashed",
    buildMode: "buildUp",
    forceBaseline: true,
    totalLabelMode: "calculated"
  };
}

export function defaultMekkoSettings(): MekkoSettings {
  return {
    mode: "absolute",
    showColumnTotals: true,
    showColumnPercentages: true,
    showSegmentPercentages: false,
    showAxis: true,
    showTicks: true,
    showRidge: false,
    segmentOrder: "sheet",
    otherThreshold: undefined
  };
}

export function normalizeChartSettings(raw: unknown, type: ChartType): ChartSettings {
  const defaults = defaultChartSettings(type);
  if (!isRecord(raw)) return defaults;

  const oldShowValues = typeof raw.showValues === "boolean" ? raw.showValues : true;
  const oldFields: LabelContentField[] = oldShowValues ? defaultLabelSettings(type).fields : ["label"];
  const rawLabelContent = isRecord(raw.labelContent) ? raw.labelContent : null;

  return {
    showLegend: typeof raw.showLegend === "boolean" ? raw.showLegend : defaults.showLegend,
    showTitle: typeof raw.showTitle === "boolean" ? raw.showTitle : defaults.showTitle,
    showLabels: typeof raw.showLabels === "boolean" ? raw.showLabels : true,
    labelContent: {
      fields: normalizeFields(rawLabelContent?.fields, oldFields),
      separator: normalizeSeparator(rawLabelContent?.separator, defaults.labelContent.separator),
      valueFormat: normalizeNumberFormat(rawLabelContent?.valueFormat, defaults.labelContent.valueFormat),
      percentDecimals: clampInteger(rawLabelContent?.percentDecimals, 0, 2, defaults.labelContent.percentDecimals)
    },
    waterfall: normalizeWaterfallSettings(raw.waterfall, defaults.waterfall),
    mekko: normalizeMekkoSettings(raw.mekko, defaults.mekko)
  };
}

export function buildLabelLines({
  label,
  value,
  percentage,
  settings,
  valueSign = "plain"
}: {
  label: string;
  value?: number;
  percentage?: number;
  settings: ChartSettings;
  valueSign?: "plain" | "auto";
}): string[] {
  if (!settings.showLabels) return [];

  const parts = settings.labelContent.fields.flatMap((field) => {
    if (field === "label") return label.trim() ? [label] : [];
    if (field === "value" && typeof value === "number" && Number.isFinite(value)) {
      return [formatValue(value, settings.labelContent.valueFormat, { valueSign })];
    }
    if (field === "percent" && typeof percentage === "number" && Number.isFinite(percentage)) {
      return [formatPercent(percentage, settings.labelContent.percentDecimals)];
    }
    return [];
  });

  if (settings.labelContent.separator === "newline") return parts;
  return parts.length > 0 ? [parts.join(separatorText(settings.labelContent.separator))] : [];
}

export function formatValue(
  value: number,
  format: NumberFormatSettings,
  { valueSign = "plain" }: { valueSign?: "plain" | "auto" } = {}
): string {
  const scale = scaleSpec(format.scale);
  const scaled = value / scale.divisor;
  const absolute = Math.abs(scaled);
  const decimals = clampInteger(format.decimals, 0, 3, 0);
  const body = `${format.prefix}${absolute.toFixed(decimals)}${scale.suffix}${format.suffix}`;

  if (value < 0) {
    return format.negativeStyle === "parentheses" ? `(${body})` : `-${body}`;
  }

  if (value > 0 && format.showPlus && valueSign === "auto") {
    return `+${body}`;
  }

  return body;
}

export function formatPercent(value: number, decimals: number): string {
  return `${(value * 100).toFixed(clampInteger(decimals, 0, 2, 0))}%`;
}

function normalizeFields(raw: unknown, fallback: LabelContentField[]): LabelContentField[] {
  if (!Array.isArray(raw)) return fallback;
  const fields = raw.filter((field): field is LabelContentField => field === "label" || field === "value" || field === "percent");
  return fields.length > 0 ? Array.from(new Set(fields)) : fallback;
}

function normalizeSeparator(raw: unknown, fallback: LabelSeparator): LabelSeparator {
  if (raw === "space" || raw === "slash" || raw === "newline") return raw;
  return fallback;
}

function normalizeNumberFormat(raw: unknown, fallback: NumberFormatSettings): NumberFormatSettings {
  if (!isRecord(raw)) return fallback;

  return {
    decimals: clampInteger(raw.decimals, 0, 3, fallback.decimals),
    scale: normalizeScale(raw.scale, fallback.scale),
    prefix: typeof raw.prefix === "string" ? raw.prefix.slice(0, 8) : fallback.prefix,
    suffix: typeof raw.suffix === "string" ? raw.suffix.slice(0, 8) : fallback.suffix,
    showPlus: typeof raw.showPlus === "boolean" ? raw.showPlus : fallback.showPlus,
    negativeStyle: normalizeNegativeStyle(raw.negativeStyle, fallback.negativeStyle)
  };
}

function normalizeWaterfallSettings(raw: unknown, fallback: WaterfallSettings): WaterfallSettings {
  if (!isRecord(raw)) return fallback;

  return {
    showConnectors: typeof raw.showConnectors === "boolean" ? raw.showConnectors : fallback.showConnectors,
    connectorStyle: normalizeConnectorStyle(raw.connectorStyle, fallback.connectorStyle),
    buildMode: normalizeBuildMode(raw.buildMode, fallback.buildMode),
    forceBaseline: typeof raw.forceBaseline === "boolean" ? raw.forceBaseline : fallback.forceBaseline,
    totalLabelMode: normalizeTotalLabelMode(raw.totalLabelMode, fallback.totalLabelMode)
  };
}

function normalizeMekkoSettings(raw: unknown, fallback: MekkoSettings): MekkoSettings {
  if (!isRecord(raw)) return fallback;
  const threshold = typeof raw.otherThreshold === "number" ? raw.otherThreshold : Number(raw.otherThreshold);

  return {
    mode: normalizeMekkoMode(raw.mode, fallback.mode),
    showColumnTotals: typeof raw.showColumnTotals === "boolean" ? raw.showColumnTotals : fallback.showColumnTotals,
    showColumnPercentages: typeof raw.showColumnPercentages === "boolean" ? raw.showColumnPercentages : fallback.showColumnPercentages,
    showSegmentPercentages: typeof raw.showSegmentPercentages === "boolean" ? raw.showSegmentPercentages : fallback.showSegmentPercentages,
    showAxis: typeof raw.showAxis === "boolean" ? raw.showAxis : fallback.showAxis,
    showTicks: typeof raw.showTicks === "boolean" ? raw.showTicks : fallback.showTicks,
    showRidge: typeof raw.showRidge === "boolean" ? raw.showRidge : fallback.showRidge,
    segmentOrder: normalizeMekkoSegmentOrder(raw.segmentOrder, fallback.segmentOrder),
    otherThreshold: Number.isFinite(threshold) ? Math.min(0.5, Math.max(0, threshold)) : undefined
  };
}

function normalizeScale(raw: unknown, fallback: NumberScale): NumberScale {
  if (raw === "none" || raw === "thousands" || raw === "millions") return raw;
  return fallback;
}

function normalizeConnectorStyle(raw: unknown, fallback: WaterfallConnectorStyle): WaterfallConnectorStyle {
  if (raw === "solid" || raw === "dashed" || raw === "none") return raw;
  return fallback;
}

function normalizeBuildMode(raw: unknown, fallback: WaterfallBuildMode): WaterfallBuildMode {
  if (raw === "buildUp" || raw === "buildDown") return raw;
  return fallback;
}

function normalizeTotalLabelMode(raw: unknown, fallback: WaterfallTotalLabelMode): WaterfallTotalLabelMode {
  if (raw === "calculated" || raw === "amount") return raw;
  return fallback;
}

function normalizeMekkoMode(raw: unknown, fallback: MekkoMode): MekkoMode {
  if (raw === "absolute" || raw === "percent") return raw;
  return fallback;
}

function normalizeMekkoSegmentOrder(raw: unknown, fallback: MekkoSegmentOrder): MekkoSegmentOrder {
  if (raw === "sheet" || raw === "reverse" || raw === "ascending" || raw === "descending") return raw;
  return fallback;
}

function normalizeNegativeStyle(raw: unknown, fallback: NegativeStyle): NegativeStyle {
  if (raw === "minus" || raw === "parentheses") return raw;
  return fallback;
}

function separatorText(separator: LabelSeparator): string {
  if (separator === "slash") return " / ";
  return " ";
}

function scaleSpec(scale: NumberScale): { divisor: number; suffix: string } {
  if (scale === "thousands") return { divisor: 1000, suffix: "k" };
  if (scale === "millions") return { divisor: 1000000, suffix: "m" };
  return { divisor: 1, suffix: "" };
}

function clampInteger(raw: unknown, min: number, max: number, fallback: number): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
