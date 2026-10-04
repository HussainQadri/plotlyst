import { defaultMekkoSettings, defaultSankeySettings, defaultScatterSettings, defaultWaterfallSettings } from "./labels";
import type {
  LabelPlacement,
  MarimekkoData,
  MekkoSettings,
  PieData,
  SankeyData,
  SankeyLink,
  SankeySettings,
  ScatterData,
  ScatterSettings,
  VisualOverride,
  WaterfallData,
  WaterfallKind,
  WaterfallSettings
} from "./types";

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
  columnTotal: number;
  columnPercentage: number;
  segmentPercentage: number;
  grandPercentage: number;
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
  height = 330,
  settings: MekkoSettings = defaultMekkoSettings()
): MarimekkoSegmentLayout[] {
  const projectedColumns = data.columns.map((column) => {
    const positiveSegments = column.segments.filter((segment) => Number.isFinite(segment.value) && segment.value > 0);
    const rawTotal = positiveSegments.reduce((sum, segment) => sum + segment.value, 0);
    const otherThreshold = settings.otherThreshold ?? 0;
    const grouped =
      otherThreshold > 0
        ? groupSmallSegments(positiveSegments, rawTotal, otherThreshold, column.id)
        : positiveSegments.map((segment) => ({ ...segment, sourceIndex: column.segments.indexOf(segment) }));

    return {
      column,
      segments: orderMekkoSegments(grouped, settings.segmentOrder),
      total: rawTotal
    };
  });
  const columnTotals = projectedColumns.map((column) => column.total);
  const grandTotal = columnTotals.reduce((sum, total) => sum + total, 0);
  let x = 0;

  return projectedColumns.flatMap(({ column, segments, total: columnTotal }) => {
    const columnWidth = grandTotal > 0 ? (columnTotal / grandTotal) * width : width / Math.max(1, data.columns.length);
    let yFromBottom = height;

    const layouts = segments
      .filter((segment) => Number.isFinite(segment.value) && segment.value > 0)
      .map((segment, segmentIndex) => {
        const segmentHeight = columnTotal > 0 ? (segment.value / columnTotal) * height : 0;
        yFromBottom -= segmentHeight;
        const override = getOverride(overrides, segment.id);
        const segmentPercentage = columnTotal > 0 ? segment.value / columnTotal : 0;
        const grandPercentage = grandTotal > 0 ? segment.value / grandTotal : 0;

        return {
          id: segment.id,
          label: resolveLabel(segment.label, override),
          value: segment.value,
          percentage: settings.mode === "percent" ? segmentPercentage : grandPercentage,
          columnTotal,
          columnPercentage: grandTotal > 0 ? columnTotal / grandTotal : 0,
          segmentPercentage,
          grandPercentage,
          columnLabel: column.label,
          x,
          y: yFromBottom,
          width: columnWidth,
          height: segmentHeight,
          color: resolveColor(palette[(segment.sourceIndex ?? segmentIndex) % palette.length], segment.color, override),
          labelPlacement: resolveLabelPlacement(override, "auto"),
          labelVisible: resolveLabelVisible(override)
        };
      });

    x += columnWidth;
    return layouts;
  });
}

type MekkoInputSegment = MarimekkoData["columns"][number]["segments"][number] & { sourceIndex?: number };

function groupSmallSegments(segments: MekkoInputSegment[], columnTotal: number, threshold: number, columnId: string): MekkoInputSegment[] {
  const small: MekkoInputSegment[] = [];
  const large: MekkoInputSegment[] = [];

  segments.forEach((segment, index) => {
    const withIndex = { ...segment, sourceIndex: segment.sourceIndex ?? index };
    if (columnTotal > 0 && segment.value / columnTotal < threshold) {
      small.push(withIndex);
    } else {
      large.push(withIndex);
    }
  });

  if (small.length <= 1) return [...large, ...small];

  return [
    ...large,
    {
      id: `${columnId}-other`,
      label: "Other",
      value: small.reduce((sum, segment) => sum + segment.value, 0),
      sourceIndex: segments.length
    }
  ];
}

function orderMekkoSegments(segments: MekkoInputSegment[], order: MekkoSettings["segmentOrder"]): MekkoInputSegment[] {
  if (order === "reverse") return [...segments].reverse();
  if (order === "ascending") return [...segments].sort((a, b) => a.value - b.value);
  if (order === "descending") return [...segments].sort((a, b) => b.value - a.value);
  return segments;
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

// ─── Sankey ────────────────────────────────────────────────────────────────

export type SankeyNodeLayout = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  value: number;
  depth: number;
  labelVisible: boolean;
};

export type SankeyLinkLayout = {
  id: string;
  sourceId: string;
  targetId: string;
  value: number;
  color: string;
  path: string;
  midX: number;
  midY: number;
};

export type SankeyLayout = {
  nodes: SankeyNodeLayout[];
  links: SankeyLinkLayout[];
};

type SNode = {
  id: string;
  label: string;
  depth: number;
  value: number;
  height: number;
  x: number;
  y: number;
  color: string;
  labelVisible: boolean;
};

export function layoutSankey(
  data: SankeyData,
  palette: string[],
  overrides: Record<string, VisualOverride> = {},
  width = 780,
  height = 390,
  settings: SankeySettings = defaultSankeySettings()
): SankeyLayout {
  const { nodes, links } = data;
  if (nodes.length === 0) return { nodes: [], links: [] };

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter(
    (l) => nodeIds.has(l.sourceId) && nodeIds.has(l.targetId) && l.sourceId !== l.targetId && Number.isFinite(l.value) && l.value > 0
  );

  const inMap = new Map<string, SankeyLink[]>();
  const outMap = new Map<string, SankeyLink[]>();
  for (const n of nodes) {
    inMap.set(n.id, []);
    outMap.set(n.id, []);
  }
  for (const l of validLinks) {
    inMap.get(l.targetId)!.push(l);
    outMap.get(l.sourceId)!.push(l);
  }

  // Assign depths via iterative propagation (handles DAGs correctly)
  const depths = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const l of validLinks) {
      const next = (depths.get(l.sourceId) ?? 0) + 1;
      if ((depths.get(l.targetId) ?? 0) < next) {
        depths.set(l.targetId, next);
        changed = true;
      }
    }
  }

  const maxDepth = Math.max(0, ...nodes.map((n) => depths.get(n.id) ?? 0));

  if (settings.align === "justify") {
    for (const n of nodes) {
      if ((outMap.get(n.id) ?? []).length === 0) depths.set(n.id, maxDepth);
    }
  }

  const byDepth = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depths.get(n.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n.id);
  }

  // Node values = max(sum in, sum out) for sizing
  const nodeValues = new Map<string, number>();
  for (const n of nodes) {
    const inc = (inMap.get(n.id) ?? []).reduce((s, l) => s + l.value, 0);
    const out = (outMap.get(n.id) ?? []).reduce((s, l) => s + l.value, 0);
    nodeValues.set(n.id, Math.max(inc, out, 0.01));
  }

  // Global scale: smallest that fits every column
  let scale = Infinity;
  for (const [, colIds] of byDepth) {
    const total = colIds.reduce((s, id) => s + (nodeValues.get(id) ?? 0), 0);
    const usable = height - (colIds.length - 1) * settings.nodePadding;
    if (total > 0 && usable > 0) scale = Math.min(scale, usable / total);
  }
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;

  const numCols = maxDepth + 1;
  const colGap = numCols > 1 ? (width - settings.nodeWidth * numCols) / (numCols - 1) : 0;
  const colX = (d: number) => d * (settings.nodeWidth + colGap);

  const snodeMap = new Map<string, SNode>();
  nodes.forEach((node, index) => {
    const override = getOverride(overrides, node.id);
    snodeMap.set(node.id, {
      id: node.id,
      label: resolveLabel(node.label, override),
      depth: depths.get(node.id) ?? 0,
      value: nodeValues.get(node.id) ?? 0,
      height: Math.max(2, (nodeValues.get(node.id) ?? 0) * scale),
      x: colX(depths.get(node.id) ?? 0),
      y: 0,
      color: resolveColor(palette[index % palette.length], node.color, override),
      labelVisible: resolveLabelVisible(override)
    });
  });

  // Initial Y: center each column
  for (const [, colIds] of byDepth) {
    const col = colIds.map((id) => snodeMap.get(id)!).sort((a, b) => a.id.localeCompare(b.id));
    const totalH = col.reduce((s, n) => s + n.height, 0) + (col.length - 1) * settings.nodePadding;
    let y = Math.max(0, (height - totalH) / 2);
    for (const n of col) {
      n.y = y;
      y += n.height + settings.nodePadding;
    }
  }

  // Iterative relaxation (3 passes)
  for (let pass = 0; pass < 3; pass++) {
    for (let d = 0; d <= maxDepth; d++) {
      const col = (byDepth.get(d) ?? []).map((id) => snodeMap.get(id)!);
      for (const n of col) {
        const outs = outMap.get(n.id) ?? [];
        if (outs.length === 0) continue;
        const total = outs.reduce((s, l) => s + l.value, 0);
        const wy = outs.reduce((s, l) => { const t = snodeMap.get(l.targetId)!; return s + l.value * (t.y + t.height / 2); }, 0) / total;
        n.y = wy - n.height / 2;
      }
      sankeyResolveCollisions(col, settings.nodePadding, height);
    }
    for (let d = maxDepth; d >= 0; d--) {
      const col = (byDepth.get(d) ?? []).map((id) => snodeMap.get(id)!);
      for (const n of col) {
        const ins = inMap.get(n.id) ?? [];
        if (ins.length === 0) continue;
        const total = ins.reduce((s, l) => s + l.value, 0);
        const wy = ins.reduce((s, l) => { const src = snodeMap.get(l.sourceId)!; return s + l.value * (src.y + src.height / 2); }, 0) / total;
        n.y = wy - n.height / 2;
      }
      sankeyResolveCollisions(col, settings.nodePadding, height);
    }
  }

  // Sort links per node to minimize crossings
  const sortedOut = new Map<string, SankeyLink[]>();
  const sortedIn = new Map<string, SankeyLink[]>();
  for (const node of nodes) {
    sortedOut.set(node.id, [...(outMap.get(node.id) ?? [])].sort((a, b) => {
      const ta = snodeMap.get(a.targetId)!, tb = snodeMap.get(b.targetId)!;
      return (ta.y + ta.height / 2) - (tb.y + tb.height / 2);
    }));
    sortedIn.set(node.id, [...(inMap.get(node.id) ?? [])].sort((a, b) => {
      const sa = snodeMap.get(a.sourceId)!, sb = snodeMap.get(b.sourceId)!;
      return (sa.y + sa.height / 2) - (sb.y + sb.height / 2);
    }));
  }

  // Accumulate link offsets
  const srcOff = new Map<string, number>();
  const tgtOff = new Map<string, number>();
  for (const [, outs] of sortedOut) {
    let off = 0;
    for (const l of outs) { srcOff.set(l.id, off); off += l.value * scale; }
  }
  for (const [, ins] of sortedIn) {
    let off = 0;
    for (const l of ins) { tgtOff.set(l.id, off); off += l.value * scale; }
  }

  const linkLayouts: SankeyLinkLayout[] = validLinks.map((link) => {
    const src = snodeMap.get(link.sourceId)!;
    const tgt = snodeMap.get(link.targetId)!;
    const lw = link.value * scale;
    const so = srcOff.get(link.id) ?? 0;
    const to = tgtOff.get(link.id) ?? 0;
    const sy0 = src.y + so, sy1 = sy0 + lw;
    const ty0 = tgt.y + to, ty1 = ty0 + lw;
    const sx = src.x + settings.nodeWidth;
    const tx = tgt.x;
    const dx = (tx - sx) * 0.5;
    const path = [`M ${sx} ${sy0}`, `C ${sx + dx} ${sy0} ${sx + dx} ${ty0} ${tx} ${ty0}`, `L ${tx} ${ty1}`, `C ${sx + dx} ${ty1} ${sx + dx} ${sy1} ${sx} ${sy1}`, `Z`].join(" ");
    return {
      id: link.id, sourceId: link.sourceId, targetId: link.targetId, value: link.value,
      color: link.color ?? src.color,
      path,
      midX: (sx + tx) / 2,
      midY: (ty0 + sy0) / 2 + lw / 2
    };
  });

  const nodeLayouts: SankeyNodeLayout[] = nodes.map((node) => {
    const n = snodeMap.get(node.id)!;
    return { id: node.id, label: n.label, x: n.x, y: n.y, width: settings.nodeWidth, height: n.height, color: n.color, value: n.value, depth: n.depth, labelVisible: n.labelVisible };
  });

  return { nodes: nodeLayouts, links: linkLayouts };
}

/**
 * Separate a column's nodes by `padding` and keep them inside [0, maxH]: push
 * overlaps down from the top, then, if the last node overflows, pin it to the
 * bottom and push back up. The global scale guarantees every column fits.
 */
function sankeyResolveCollisions(col: SNode[], padding: number, maxH: number) {
  const sorted = [...col].sort((a, b) => a.y - b.y);
  let y = 0;
  for (const node of sorted) {
    if (node.y < y) node.y = y;
    y = node.y + node.height + padding;
  }

  const overflow = y - padding - maxH;
  if (overflow <= 0) return;
  y = maxH + padding;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const node = sorted[i];
    const bottom = y - padding;
    if (node.y + node.height > bottom) node.y = bottom - node.height;
    y = node.y;
  }
}

// ─── Scatter ───────────────────────────────────────────────────────────────

export type ScatterPointLayout = {
  id: string;
  label: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
  x: number;
  y: number;
  size: number;
  labelVisible: boolean;
  labelPlacement: LabelPlacement;
};

export type ScatterAxisTick = {
  value: number;
  position: number;
  label: string;
};

export type ScatterLayout = {
  points: ScatterPointLayout[];
  xTicks: ScatterAxisTick[];
  yTicks: ScatterAxisTick[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xDivider: number;
  yDivider: number;
};

/** Plot area inside the 960×540 slide, shared by the renderer and annotations. */
export const scatterPlotFrame = { x: 112, y: 108, width: 736, height: 322 };

const scatterDotRadius = 6;
const scatterMinBubbleRadius = 5;
const scatterMaxBubbleRadius = 30;
/** Air between the outermost mark and the plot edge, in pixels. */
const scatterEdgeGap = 10;

export function layoutScatter(
  data: ScatterData,
  palette: string[],
  overrides: Record<string, VisualOverride> = {},
  width = scatterPlotFrame.width,
  height = scatterPlotFrame.height,
  settings: ScatterSettings = defaultScatterSettings()
): ScatterLayout {
  const pts = data.points.flatMap((point, sourceIndex) =>
    Number.isFinite(point.x) && Number.isFinite(point.y) ? [{ point, sourceIndex }] : []
  );

  if (pts.length === 0) {
    const xAxis = scatterAxis(0, 10, 0, width, true);
    const yAxis = scatterAxis(0, 10, 0, height, false);
    return {
      points: [],
      xTicks: xAxis.ticks,
      yTicks: yAxis.ticks,
      xMin: xAxis.min,
      xMax: xAxis.max,
      yMin: yAxis.min,
      yMax: yAxis.max,
      xDivider: width / 2,
      yDivider: height / 2
    };
  }

  // Bubble area, not radius, is proportional to size so big values aren't exaggerated.
  const maxSize = Math.max(...pts.map(({ point }) => finitePositive(point.size)), 0);
  const getRadius = (size?: number) => {
    const safeSize = finitePositive(size);
    if (!settings.showBubbles || safeSize === 0 || maxSize === 0) return scatterDotRadius;
    return Math.max(scatterMinBubbleRadius, Math.sqrt(safeSize / maxSize) * scatterMaxBubbleRadius);
  };
  const radii = pts.map(({ point }) => getRadius(point.size));
  const edgePadding = Math.max(...radii) + scatterEdgeGap;

  const xs = pts.map(({ point }) => point.x);
  const ys = pts.map(({ point }) => point.y);
  const rawXMin = Math.min(...xs);
  const rawXMax = Math.max(...xs);
  const rawYMin = Math.min(...ys);
  const rawYMax = Math.max(...ys);
  // Defaulting dividers to the data's midpoint keeps them fixed when bubble padding changes the domain.
  const xDividerValue = settings.xDivider ?? (rawXMin + rawXMax) / 2;
  const yDividerValue = settings.yDivider ?? (rawYMin + rawYMax) / 2;
  const xAxis = scatterAxis(Math.min(rawXMin, xDividerValue), Math.max(rawXMax, xDividerValue), edgePadding, width, true);
  const yAxis = scatterAxis(Math.min(rawYMin, yDividerValue), Math.max(rawYMax, yDividerValue), edgePadding, height, false);

  const points: ScatterPointLayout[] = pts.map(({ point, sourceIndex }, index) => {
    const ov = getOverride(overrides, point.id);
    return {
      id: point.id,
      label: resolveLabel(point.label, ov),
      cx: xAxis.scale(point.x),
      cy: yAxis.scale(point.y),
      r: radii[index],
      color: resolveColor(palette[sourceIndex % palette.length] ?? "#327277", point.color, ov),
      x: point.x,
      y: point.y,
      size: finitePositive(point.size),
      labelVisible: resolveLabelVisible(ov),
      labelPlacement: resolveLabelPlacement(ov, "auto")
    };
  });

  return {
    points,
    xTicks: xAxis.ticks,
    yTicks: yAxis.ticks,
    xMin: xAxis.min, xMax: xAxis.max,
    yMin: yAxis.min, yMax: yAxis.max,
    xDivider: xAxis.scale(xDividerValue),
    yDivider: yAxis.scale(yDividerValue)
  };
}

function finitePositive(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Pads the data extent so the outermost marks clear the plot edge by `padding`
 * pixels, then places ticks on round values inside that domain. The domain is
 * not widened out to the next tick, which would strand empty bands of plot.
 */
function scatterAxis(
  dataMin: number,
  dataMax: number,
  padding: number,
  size: number,
  isX: boolean
): { min: number; max: number; scale: (value: number) => number; ticks: ScatterAxisTick[] } {
  let min: number;
  let max: number;
  if (dataMax > dataMin) {
    const usable = Math.max(1, size - padding * 2);
    const valuePerPixel = (dataMax - dataMin) / usable;
    min = dataMin - padding * valuePerPixel;
    max = dataMax + padding * valuePerPixel;
  } else {
    const halfSpan = Math.abs(dataMin) > 0 ? Math.abs(dataMin) / 2 : 1;
    min = dataMin - halfSpan;
    max = dataMax + halfSpan;
  }

  const range = max - min;
  const scale = (value: number) => (isX ? ((value - min) / range) * size : size - ((value - min) / range) * size);
  const targetTicks = Math.max(2, Math.round(size / (isX ? 110 : 66)));
  const step = niceNumber(range / targetTicks, true);
  const ticks: ScatterAxisTick[] = [];
  if (Number.isFinite(step) && step > 0) {
    for (let value = roundStepped(Math.ceil(min / step) * step), count = 0; value <= max && count < 100; value = roundStepped(value + step), count += 1) {
      ticks.push({ value, position: scale(value), label: formatTickLabel(value, step) });
    }
  }
  return { min, max, scale, ticks };
}

function niceNumber(value: number, round: boolean): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const f = value / Math.pow(10, exp);
  let nf: number;
  if (round) { nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10; }
  else        { nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10; }
  return nf * Math.pow(10, exp);
}

function formatTickLabel(value: number, step: number): string {
  const v = Object.is(value, -0) || Math.abs(value) < Math.abs(step) * 1e-10 ? 0 : value;
  const absolute = Math.abs(v);
  if (absolute >= 1e12) return `${trimFixed(v / 1e12, 1)}T`;
  if (absolute >= 1e9) return `${trimFixed(v / 1e9, 1)}B`;
  if (absolute >= 1e6) return `${trimFixed(v / 1e6, 1)}M`;
  if (absolute >= 1e3) return `${trimFixed(v / 1e3, 1)}k`;
  if (absolute > 0 && absolute < 1e-6) return v.toExponential(1);
  const decimals = Math.min(8, Math.max(0, -Math.floor(Math.log10(Math.abs(step)))));
  return trimFixed(v, decimals);
}

function trimFixed(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
}

function roundStepped(v: number): number {
  return Number(v.toPrecision(14));
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
