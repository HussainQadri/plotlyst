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
  lightFill = "#ffffff"
}: {
  cx: number;
  cy: number;
  radius: number;
  midAngle: number;
  percentage: number;
  placement: LabelPlacement;
  offset?: Offset;
  foreground: string;
  lightFill?: string;
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
    fill: inside ? lightFill : foreground,
    className: inside ? "svg-label light" : "svg-label",
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
  lightFill = "#ffffff"
}: {
  rect: Rect;
  placement: LabelPlacement;
  offset?: Offset;
  chartWidth: number;
  chartHeight: number;
  foreground: string;
  lightFill?: string;
}): LabelPoint {
  const largeEnough = rect.width >= 86 && rect.height >= 34;
  const effective = placement === "auto" ? (largeEnough ? "inside" : "callout") : placement;
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

  if (effective === "inside") {
    return {
      x: center.x + offset.dx,
      y: center.y + 4 + offset.dy,
      anchor: "middle",
      fill: lightFill,
      className: "svg-label light"
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
  lightFill = "#ffffff"
}: {
  rect: Rect;
  placement: LabelPlacement;
  offset?: Offset;
  positive: boolean;
  foreground: string;
  lightFill?: string;
}): LabelPoint {
  const largeEnough = rect.height >= 42 && rect.width >= 44;
  const effective = placement === "auto" ? (largeEnough ? "inside" : "outside") : placement;
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

  if (effective === "inside") {
    return {
      x: center.x + offset.dx,
      y: center.y + 4 + offset.dy,
      anchor: "middle",
      fill: lightFill,
      className: "svg-label light"
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

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}
