import type { LabelPlacement } from "./types";

export type LabelPoint = {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  fill: string;
  className: string;
  leader?: { x1: number; y1: number; x2: number; y2: number };
};

type Offset = { dx: number; dy: number };

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const zeroOffset: Offset = { dx: 0, dy: 0 };

export function pieLabelPoint({
  cx,
  cy,
  radius,
  midAngle,
  percentage,
  placement,
  offset = zeroOffset,
  foreground,
  fillColor
}: {
  cx: number;
  cy: number;
  radius: number;
  midAngle: number;
  percentage: number;
  placement: LabelPlacement;
  offset?: Offset;
  foreground: string;
  /** The slice's fill, which picks the ink for an inside label. */
  fillColor: string;
}): LabelPoint {
  const effective = placement === "auto" ? (percentage >= 0.13 ? "inside" : "callout") : placement;
  const inside = effective === "inside";
  const labelRadius = inside ? radius * 0.58 : radius + 42;
  const label = polarToCartesian(cx, cy, labelRadius, midAngle);
  const leaderStart = polarToCartesian(cx, cy, radius + 8, midAngle);
  const x = label.x + offset.dx;
  const y = label.y + offset.dy;

  return {
    x,
    y,
    anchor: inside ? "middle" : x > cx ? "start" : "end",
    ...(inside ? insideLabelInk(fillColor) : { fill: foreground, className: "svg-label" }),
    leader:
      effective === "callout"
        ? {
            x1: leaderStart.x,
            y1: leaderStart.y,
            x2: x,
            y2: y
          }
        : undefined
  };
}

export function rectLabelPoint({
  rect,
  placement,
  offset = zeroOffset,
  chartWidth,
  chartHeight,
  foreground,
  fillColor
}: {
  rect: Rect;
  placement: LabelPlacement;
  offset?: Offset;
  chartWidth: number;
  chartHeight: number;
  foreground: string;
  /** The rectangle's fill, which picks the ink for an inside label. */
  fillColor: string;
}): LabelPoint {
  const largeEnough = rect.width >= 86 && rect.height >= 34;
  const effective = placement === "auto" ? (largeEnough ? "inside" : "callout") : placement;
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

  if (effective === "inside") {
    return {
      x: center.x + offset.dx,
      y: center.y + 4 + offset.dy,
      anchor: "middle",
      ...insideLabelInk(fillColor)
    };
  }

  const side = chooseOutsideSide(rect, chartWidth, chartHeight);
  const base = outsidePoint(rect, side);
  const x = base.x + offset.dx;
  const y = base.y + offset.dy;

  return {
    x,
    y,
    anchor: side === "right" ? "start" : side === "left" ? "end" : "middle",
    fill: foreground,
    className: "svg-label",
    leader: effective === "callout" ? { x1: center.x, y1: center.y, x2: x, y2: y } : undefined
  };
}

export function waterfallLabelPoint({
  rect,
  placement,
  offset = zeroOffset,
  positive,
  foreground,
  fillColor
}: {
  rect: Rect;
  placement: LabelPlacement;
  offset?: Offset;
  positive: boolean;
  foreground: string;
  /** The bar's fill, which picks the ink for an inside label. */
  fillColor: string;
}): LabelPoint {
  const largeEnough = rect.height >= 42 && rect.width >= 44;
  const effective = placement === "auto" ? (largeEnough ? "inside" : "outside") : placement;
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

  if (effective === "inside") {
    return {
      x: center.x + offset.dx,
      y: center.y + 4 + offset.dy,
      anchor: "middle",
      ...insideLabelInk(fillColor)
    };
  }

  const x = center.x + offset.dx;
  const y = (positive ? rect.y - 12 : rect.y + rect.height + 20) + offset.dy;

  return {
    x,
    y,
    anchor: "middle",
    fill: foreground,
    className: "svg-label",
    leader:
      effective === "callout"
        ? {
            x1: center.x,
            y1: positive ? rect.y : rect.y + rect.height,
            x2: x,
            y2: y
          }
        : undefined
  };
}

export type ScatterLabelRequest = {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  /** Mark fill; picks white or dark ink when the label sits inside the bubble. */
  color: string;
  lines: string[];
  placement: LabelPlacement;
  offset?: Offset;
};

// Estimates for 12–13px Inter; ChartLabel stacks lines 14px apart around `y`.
const scatterCharWidth = 7;
const scatterLineHeight = 14;

type ScatterCandidate = { x: number; y: number; anchor: LabelPoint["anchor"]; rect: Rect };

/**
 * Places all scatter labels together so they avoid each other and every other
 * bubble. An auto label goes inside its bubble only when the text fits;
 * otherwise each label takes the side (top, right, bottom, left, then the
 * diagonals) with the least overlap. Manual offsets are applied after the side
 * is chosen, so dragging one label never reshuffles the rest.
 */
export function placeScatterLabels(
  requests: ScatterLabelRequest[],
  bounds: { width: number; height: number },
  foreground: string
): Map<string, LabelPoint> {
  const plotRect: Rect = { x: 0, y: 0, width: bounds.width, height: bounds.height };
  const bubbles = requests.map((request) => {
    // Equal-area square: a fair stand-in for the circle when measuring overlap.
    const half = request.radius * 0.886;
    return { id: request.id, rect: { x: request.cx - half, y: request.cy - half, width: half * 2, height: half * 2 } };
  });
  const placed: Rect[] = [];
  const result = new Map<string, LabelPoint>();

  requests.forEach((request) => {
    if (request.lines.length === 0) return;
    const offset = request.offset ?? zeroOffset;
    const width = Math.max(...request.lines.map((line) => line.length)) * scatterCharWidth;
    const height = request.lines.length * scatterLineHeight;
    const insideRect = { x: request.cx - width / 2, y: request.cy - height / 2, width, height };
    // A label that fits but is half-buried under neighbouring bubbles reads worse than one outside.
    const coveredInside = bubbles.reduce(
      (sum, bubble) => (bubble.id === request.id ? sum : sum + overlapArea(insideRect, bubble.rect)),
      0
    );
    const fitsInside = Math.hypot(width / 2 + 4, height / 2 + 2) <= request.radius && coveredInside <= width * height * 0.15;

    if (request.placement === "inside" || (request.placement === "auto" && fitsInside)) {
      result.set(request.id, {
        x: request.cx + offset.dx,
        y: request.cy + 4 + offset.dy,
        anchor: "middle",
        ...insideLabelInk(request.color)
      });
      return;
    }

    const gap = request.placement === "callout" ? 18 : 5;
    const candidates = scatterLabelCandidates(request, width, request.lines.length, gap);
    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;
    candidates.forEach((candidate, index) => {
      const rectArea = candidate.rect.width * candidate.rect.height;
      let score = index + (rectArea - overlapArea(candidate.rect, plotRect)) * 3;
      bubbles.forEach((bubble) => {
        if (bubble.id !== request.id) score += overlapArea(candidate.rect, bubble.rect);
      });
      placed.forEach((rect) => {
        score += overlapArea(candidate.rect, rect) * 2;
      });
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    });
    placed.push(best.rect);

    const x = best.x + offset.dx;
    const y = best.y + offset.dy;
    let leader: LabelPoint["leader"];
    if (request.placement === "callout") {
      const rect = { ...best.rect, x: best.rect.x + offset.dx, y: best.rect.y + offset.dy };
      const endX = clamp(request.cx, rect.x, rect.x + rect.width);
      const endY = clamp(request.cy, rect.y, rect.y + rect.height);
      const distance = Math.hypot(endX - request.cx, endY - request.cy) || 1;
      leader = {
        x1: request.cx + ((endX - request.cx) / distance) * request.radius,
        y1: request.cy + ((endY - request.cy) / distance) * request.radius,
        x2: endX,
        y2: endY
      };
    }
    result.set(request.id, { x, y, anchor: best.anchor, fill: foreground, className: "svg-label", leader });
  });

  return result;
}

function scatterLabelCandidates(request: ScatterLabelRequest, width: number, lineCount: number, gap: number): ScatterCandidate[] {
  const { cx, cy, radius } = request;
  const height = lineCount * scatterLineHeight;
  // ChartLabel centres a block of lines on y - 3, so y = top + height / 2 + 3.
  const yForTop = (top: number) => top + height / 2 + 3;
  const diagonal = radius * Math.SQRT1_2 + gap * 0.5;
  const make = (anchor: LabelPoint["anchor"], x: number, top: number): ScatterCandidate => ({
    x,
    y: yForTop(top),
    anchor,
    rect: { x: anchor === "middle" ? x - width / 2 : anchor === "start" ? x : x - width, y: top, width, height }
  });

  return [
    make("middle", cx, cy - radius - gap - height),
    make("start", cx + radius + gap, cy - height / 2),
    make("middle", cx, cy + radius + gap),
    make("end", cx - radius - gap, cy - height / 2),
    make("start", cx + diagonal, cy - diagonal - height),
    make("end", cx - diagonal, cy - diagonal - height),
    make("start", cx + diagonal, cy + diagonal),
    make("end", cx - diagonal, cy + diagonal)
  ];
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * Ink for a label set inside a filled mark: white on dark fills, near-black on
 * light ones. It depends on the mark, not the slide, since a dark theme's light
 * foreground would vanish on a yellow fill.
 */
export function insideLabelInk(fillColor: string): Pick<LabelPoint, "fill" | "className"> {
  return isDarkColor(fillColor) ? { fill: "#ffffff", className: "svg-label light" } : { fill: "#171717", className: "svg-label ink" };
}

/** True when white text reads better than near-black on this fill (WCAG luminance crossover). */
export function isDarkColor(color: string): boolean {
  const hex = color.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((digit) => digit + digit).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return true;
  const [r, g, b] = [0, 2, 4].map((start) => {
    const channel = parseInt(full.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18;
}

function chooseOutsideSide(rect: Rect, chartWidth: number, chartHeight: number): "left" | "right" | "top" | "bottom" {
  if (rect.x + rect.width + 118 <= chartWidth) return "right";
  if (rect.x >= 118) return "left";
  if (rect.y >= 38) return "top";
  if (rect.y + rect.height + 38 <= chartHeight) return "bottom";
  return "right";
}

function outsidePoint(rect: Rect, side: "left" | "right" | "top" | "bottom") {
  if (side === "right") return { x: rect.x + rect.width + 14, y: rect.y + rect.height / 2 + 4 };
  if (side === "left") return { x: rect.x - 14, y: rect.y + rect.height / 2 + 4 };
  if (side === "top") return { x: rect.x + rect.width / 2, y: rect.y - 12 };
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height + 20 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}
