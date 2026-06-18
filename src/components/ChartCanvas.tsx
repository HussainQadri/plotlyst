"use client";

import { forwardRef, useRef, useState } from "react";
import {
  describeArc,
  layoutMarimekko,
  layoutPie,
  layoutWaterfall,
  type MarimekkoSegmentLayout,
  type PieSliceLayout,
  type WaterfallBarLayout
} from "@/lib/chartMath";
import { buildLabelLines } from "@/lib/labels";
import { pieLabelPoint, rectLabelPoint, waterfallLabelPoint, type LabelPoint } from "@/lib/labelPlacement";
import type { ChartProject, LabelPlacement, MarimekkoData, PieData, VisualOverride, WaterfallData } from "@/lib/types";
import type { ValidationResult } from "@/lib/validation";

const labelSnapThreshold = 8;
const toolbarWidth = 306;

type ChartCanvasProps = {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  validation: ValidationResult;
};

export const ChartCanvas = forwardRef<SVGSVGElement, ChartCanvasProps>(function ChartCanvas(
  { project, selectedId, onSelect, onUpdateOverride, onResetOverride, onAddElement, onDeleteElement, validation },
  ref
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    baseDx: number;
    baseDy: number;
  } | null>(null);

  function setSvgNode(node: SVGSVGElement | null) {
    svgRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function currentOffset(id: string) {
    return project.visualOverrides[id]?.labelOffset ?? { dx: 0, dy: 0 };
  }

  function svgPoint(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  function startLabelDrag(id: string, event: React.PointerEvent<SVGTextElement>) {
    const point = svgPoint(event as unknown as React.PointerEvent<SVGSVGElement>);
    if (!point) return;
    const offset = currentOffset(id);
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(id);
    setDrag({ id, startX: point.x, startY: point.y, baseDx: offset.dx, baseDy: offset.dy });
  }

  function moveLabel(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const point = svgPoint(event);
    if (!point) return;
    const nextDx = drag.baseDx + point.x - drag.startX;
    const nextDy = drag.baseDy + point.y - drag.startY;
    const snapped = Math.abs(nextDx) <= labelSnapThreshold && Math.abs(nextDy) <= labelSnapThreshold;
    onUpdateOverride(drag.id, {
      labelOffset: snapped ? { dx: 0, dy: 0 } : { dx: nextDx, dy: nextDy }
    });
  }

  function resetLabelPosition(id: string) {
    onUpdateOverride(id, { labelOffset: undefined });
  }

  return (
    <div className="slide-frame">
      <svg
        ref={setSvgNode}
        viewBox="0 0 960 540"
        role="img"
        aria-label={project.title}
        className="chart-svg"
        onClick={() => onSelect(null)}
        onPointerMove={moveLabel}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <rect width="960" height="540" fill={project.theme.background} />
        {project.settings.showTitle ? (
          <text x="64" y="62" className="svg-title" fill={project.theme.foreground}>
            {project.title}
          </text>
        ) : null}

        {project.type === "pie" ? (
          <PieChart
            project={project}
            selectedId={selectedId}
            onSelect={onSelect}
            onStartLabelDrag={startLabelDrag}
            onUpdateOverride={onUpdateOverride}
            onResetOverride={onResetOverride}
            onResetLabelPosition={resetLabelPosition}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
          />
        ) : null}
        {project.type === "marimekko" ? (
          <MarimekkoChart
            project={project}
            selectedId={selectedId}
            onSelect={onSelect}
            onStartLabelDrag={startLabelDrag}
            onUpdateOverride={onUpdateOverride}
            onResetOverride={onResetOverride}
            onResetLabelPosition={resetLabelPosition}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
          />
        ) : null}
        {project.type === "waterfall" ? (
          <WaterfallChart
            project={project}
            selectedId={selectedId}
            onSelect={onSelect}
            onStartLabelDrag={startLabelDrag}
            onUpdateOverride={onUpdateOverride}
            onResetOverride={onResetOverride}
            onResetLabelPosition={resetLabelPosition}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
          />
        ) : null}

        {!validation.valid ? (
          <g>
            <rect x="64" y="478" width="832" height="34" rx="8" fill="#fff8e1" stroke="#e4b653" />
            <text x="82" y="500" className="svg-note" fill="#6f5200">
              Fix validation issues to export this chart.
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
});

function PieChart({
  project,
  selectedId,
  onSelect,
  onStartLabelDrag,
  onUpdateOverride,
  onResetOverride,
  onResetLabelPosition,
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onResetLabelPosition: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const data = project.data as PieData;
  const slices = layoutPie(data, project.theme.palette, project.visualOverrides);
  const cx = 360;
  const cy = 286;
  const radius = 142;
  const labelData = slices.map((slice) => {
    const mid = (slice.startAngle + slice.endAngle) / 2;
    const offset = project.visualOverrides[slice.id]?.labelOffset;
    return {
      id: slice.id,
      point: pieLabelPoint({
        cx,
        cy,
        radius,
        midAngle: mid,
        percentage: slice.percentage,
        placement: slice.labelPlacement,
        offset,
        foreground: project.theme.foreground
      }),
      lines: buildLabelLines({
        label: slice.label,
        percentage: slice.percentage,
        value: slice.value,
        settings: project.settings
      }),
      manuallyPlaced: Boolean(offset && (offset.dx !== 0 || offset.dy !== 0))
    };
  });
  adjustLabelCollisions(
    labelData
      .filter((item) => item.lines.length > 0 && !item.manuallyPlaced && item.point.anchor !== "middle")
      .map((item) => ({ point: item.point, lineCount: item.lines.length })),
    { minY: 94, maxY: 430, minGap: 18 }
  );
  const labelMap = new Map(labelData.map((item) => [item.id, item]));
  const selectedSlice = selectedId ? slices.find((slice) => slice.id === selectedId) : null;
  const selectedSliceAnchor = selectedSlice
    ? pieLabelPoint({
        cx,
        cy,
        radius,
        midAngle: (selectedSlice.startAngle + selectedSlice.endAngle) / 2,
        percentage: selectedSlice.percentage,
        placement: "outside",
        foreground: project.theme.foreground
      })
    : null;

  return (
    <g>
      {slices.map((slice) => {
        const label = labelMap.get(slice.id);

        return (
          <g key={slice.id}>
            <path
              d={describeArc(cx, cy, radius, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke={selectedId === slice.id ? "#174f51" : project.theme.background}
              strokeWidth={selectedId === slice.id ? 4 : 2}
              className="selectable-mark"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(slice.id);
              }}
            />
            {slice.labelVisible && label && label.lines.length > 0 ? (
              <ChartLabel
                id={slice.id}
                lines={label.lines}
                point={label.point}
                muted={project.theme.muted}
                selected={selectedId === slice.id}
                onStartDrag={onStartLabelDrag}
                onResetPosition={onResetLabelPosition}
              />
            ) : null}
          </g>
        );
      })}
      {project.settings.showLegend ? <Legend x={650} y={154} items={slices} foreground={project.theme.foreground} /> : null}
      {selectedId && selectedSliceAnchor ? (
        <CanvasToolbar
          id={selectedId}
          x={clamp(selectedSliceAnchor.x + 14, 24, 960 - toolbarWidth - 24)}
          y={clamp(selectedSliceAnchor.y - 24, 86, 420)}
          palette={project.theme.palette}
          override={project.visualOverrides[selectedId] ?? {}}
          onUpdateOverride={onUpdateOverride}
          onResetOverride={onResetOverride}
          onResetLabelPosition={onResetLabelPosition}
          onAddElement={onAddElement}
          onDeleteElement={onDeleteElement}
        />
      ) : null}
    </g>
  );
}

function MarimekkoChart({
  project,
  selectedId,
  onSelect,
  onStartLabelDrag,
  onUpdateOverride,
  onResetOverride,
  onResetLabelPosition,
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onResetLabelPosition: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const x = 112;
  const y = 104;
  const width = 736;
  const height = 330;
  const data = project.data as MarimekkoData;
  const segments = layoutMarimekko(data, project.theme.palette, project.visualOverrides, width, height);
  const selectedSegment = selectedId ? segments.find((segment) => segment.id === selectedId) : null;
  const toolbarX = selectedSegment ? clamp(selectedSegment.x + selectedSegment.width / 2 - toolbarWidth / 2, 0, width - toolbarWidth) : 0;
  const toolbarY = selectedSegment ? clamp(selectedSegment.y - 50, -56, height - 44) : -50;
  const columnLabels = data.columns.map((column) => ({
    label: column.label,
    start: segments.find((segment) => segment.columnLabel === column.label)?.x ?? 0,
    width: segments.find((segment) => segment.columnLabel === column.label)?.width ?? width / data.columns.length
  }));

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width={width} height={height} fill="transparent" stroke={project.theme.grid} />
      {segments.map((segment) => (
        <MarimekkoSegment
          key={segment.id}
          segment={segment}
          selected={selectedId === segment.id}
          settings={project.settings}
          themeForeground={project.theme.foreground}
          themeMuted={project.theme.muted}
          chartWidth={width}
          chartHeight={height}
          offset={project.visualOverrides[segment.id]?.labelOffset}
          onSelect={onSelect}
          onStartLabelDrag={onStartLabelDrag}
          onResetLabelPosition={onResetLabelPosition}
        />
      ))}
      {columnLabels.map((column) => (
        <text
          key={column.label}
          x={column.start + column.width / 2}
          y={height + 32}
          textAnchor="middle"
          className="svg-axis"
          fill={project.theme.foreground}
        >
          {column.label}
        </text>
      ))}
      {selectedId && selectedSegment ? (
        <CanvasToolbar
          id={selectedId}
          x={toolbarX}
          y={toolbarY}
          palette={project.theme.palette}
          override={project.visualOverrides[selectedId] ?? {}}
          onUpdateOverride={onUpdateOverride}
          onResetOverride={onResetOverride}
          onResetLabelPosition={onResetLabelPosition}
          onAddElement={onAddElement}
          onDeleteElement={onDeleteElement}
        />
      ) : null}
    </g>
  );
}

function MarimekkoSegment({
  segment,
  selected,
  settings,
  themeForeground,
  themeMuted,
  chartWidth,
  chartHeight,
  offset,
  onSelect,
  onStartLabelDrag,
  onResetLabelPosition
}: {
  segment: MarimekkoSegmentLayout;
  selected: boolean;
  settings: ChartProject["settings"];
  themeForeground: string;
  themeMuted: string;
  chartWidth: number;
  chartHeight: number;
  offset?: { dx: number; dy: number };
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onResetLabelPosition: (id: string) => void;
}) {
  const labelPoint = rectLabelPoint({
    rect: { x: segment.x, y: segment.y, width: segment.width, height: segment.height },
    placement: segment.labelPlacement,
    offset,
    chartWidth,
    chartHeight,
    foreground: themeForeground
  });
  const labelLines = buildLabelLines({
    label: segment.label,
    value: segment.value,
    percentage: segment.percentage,
    settings
  });

  return (
    <g>
      <rect
        x={segment.x}
        y={segment.y}
        width={segment.width}
        height={segment.height}
        fill={segment.color}
        stroke={selected ? "#174f51" : "#fffcf6"}
        strokeWidth={selected ? 4 : 1.5}
        className="selectable-mark"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(segment.id);
        }}
      />
      {segment.labelVisible && labelLines.length > 0 ? (
        <ChartLabel
          id={segment.id}
          lines={labelLines}
          point={labelPoint}
          muted={themeMuted}
          selected={selected}
          onStartDrag={onStartLabelDrag}
          onResetPosition={onResetLabelPosition}
        />
      ) : null}
    </g>
  );
}

function WaterfallChart({
  project,
  selectedId,
  onSelect,
  onStartLabelDrag,
  onUpdateOverride,
  onResetOverride,
  onResetLabelPosition,
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onResetLabelPosition: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const x = 112;
  const y = 104;
  const width = 736;
  const height = 320;
  const data = project.data as WaterfallData;
  const waterfallSettings = project.settings.waterfall;
  const bars = layoutWaterfall(data, project.theme.palette, project.visualOverrides, width, height, waterfallSettings);
  const selectedBar = selectedId ? bars.find((bar) => bar.id === selectedId) : null;
  const toolbarX = selectedBar ? clamp(selectedBar.x + selectedBar.width / 2 - toolbarWidth / 2, 0, width - toolbarWidth) : 0;
  const toolbarY = selectedBar ? clamp(selectedBar.y - 50, -56, height - 44) : -50;
  const shouldShowConnectors = waterfallSettings.showConnectors && waterfallSettings.connectorStyle !== "none";

  return (
    <g transform={`translate(${x} ${y})`}>
      {waterfallSettings.forceBaseline ? (
        <line x1="0" x2={width} y1={bars[0]?.baseline ?? height} y2={bars[0]?.baseline ?? height} stroke={project.theme.grid} strokeWidth="1.2" />
      ) : null}
      {shouldShowConnectors ? bars.slice(0, -1).map((bar, index) => {
        const next = bars[index + 1];
        return (
          <line
            key={`${bar.id}-${next.id}`}
            x1={bar.x + bar.width}
            y1={bar.connectorOutY}
            x2={next.x}
            y2={next.connectorInY}
            stroke={project.theme.grid}
            strokeWidth="1.4"
            strokeDasharray={waterfallSettings.connectorStyle === "dashed" ? "4 3" : undefined}
          />
        );
      }) : null}
      {bars.map((bar) => (
        <WaterfallBar
          key={bar.id}
          bar={bar}
          selected={selectedId === bar.id}
          settings={project.settings}
          themeForeground={project.theme.foreground}
          themeMuted={project.theme.muted}
          offset={project.visualOverrides[bar.id]?.labelOffset}
          onSelect={onSelect}
          onStartLabelDrag={onStartLabelDrag}
          onResetLabelPosition={onResetLabelPosition}
        />
      ))}
      {selectedId && selectedBar ? (
        <CanvasToolbar
          id={selectedId}
          x={toolbarX}
          y={toolbarY}
          palette={project.theme.palette}
          override={project.visualOverrides[selectedId] ?? {}}
          onUpdateOverride={onUpdateOverride}
          onResetOverride={onResetOverride}
          onResetLabelPosition={onResetLabelPosition}
          onAddElement={onAddElement}
          onDeleteElement={onDeleteElement}
        />
      ) : null}
    </g>
  );
}

function WaterfallBar({
  bar,
  selected,
  settings,
  themeForeground,
  themeMuted,
  offset,
  onSelect,
  onStartLabelDrag,
  onResetLabelPosition
}: {
  bar: WaterfallBarLayout;
  selected: boolean;
  settings: ChartProject["settings"];
  themeForeground: string;
  themeMuted: string;
  offset?: { dx: number; dy: number };
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onResetLabelPosition: (id: string) => void;
}) {
  const labelLines = buildLabelLines({
    label: bar.label,
    value: bar.displayValue,
    settings,
    valueSign: bar.kind === "change" ? "auto" : "plain"
  });
  const point = waterfallLabelPoint({
    rect: { x: bar.x, y: bar.y, width: bar.width, height: bar.height },
    placement: bar.labelPlacement,
    offset,
    positive: bar.endValue >= bar.startValue,
    foreground: themeForeground
  });
  return (
    <g>
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={bar.color}
        stroke={selected ? "#174f51" : "#fffcf6"}
        strokeWidth={selected ? 4 : 1.5}
        className="selectable-mark"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(bar.id);
        }}
      />
      {bar.labelVisible && labelLines.length > 0 ? (
        <>
          <ChartLabel
            id={bar.id}
            lines={labelLines}
            point={point}
            muted={themeMuted}
            selected={selected}
            onStartDrag={onStartLabelDrag}
            onResetPosition={onResetLabelPosition}
          />
        </>
      ) : null}
      <text x={bar.x + bar.width / 2} y={350} textAnchor="middle" className="svg-axis" fill={themeForeground}>
        {bar.label}
      </text>
    </g>
  );
}

function ChartLabel({
  id,
  lines,
  point,
  muted,
  selected,
  onStartDrag,
  onResetPosition
}: {
  id: string;
  lines: string[];
  point: LabelPoint;
  muted: string;
  selected: boolean;
  onStartDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onResetPosition: (id: string) => void;
}) {
  return (
    <g onClick={(event) => event.stopPropagation()}>
      {point.leader ? (
        <line
          x1={point.leader.x1}
          y1={point.leader.y1}
          x2={point.leader.x2}
          y2={point.leader.y2}
          stroke={muted}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      ) : null}
      <text
        x={point.x}
        y={point.y - (lines.length - 1) * 7}
        textAnchor={point.anchor}
        className={`${point.className} label-handle${selected ? " selected" : ""}`}
        fill={point.fill}
        onPointerDown={(event) => onStartDrag(id, event)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onResetPosition(id);
        }}
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={point.x} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function CanvasToolbar({
  id,
  x,
  y,
  palette,
  override,
  onUpdateOverride,
  onResetOverride,
  onResetLabelPosition,
  onAddElement,
  onDeleteElement
}: {
  id: string;
  x: number;
  y: number;
  palette: string[];
  override: VisualOverride;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onResetLabelPosition: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const labelVisible = override.labelVisible ?? true;
  const placement = override.labelPlacement ?? "auto";

  function stop(event: React.MouseEvent<SVGGElement>) {
    event.stopPropagation();
  }

  return (
    <g transform={`translate(${x} ${y})`} className="canvas-toolbar" data-export-hidden="true" onClick={stop}>
      <rect x="0" y="0" width={toolbarWidth} height="42" rx="6" fill="#fffcf6" stroke="#cfc8bd" />
      {palette.slice(0, 4).map((color, index) => (
        <g key={color} className="toolbar-hit" onClick={() => onUpdateOverride(id, { fill: color })}>
          <rect x={10 + index * 24} y="10" width="18" height="22" rx="4" fill={color} stroke="#ffffff" />
        </g>
      ))}
      <ToolbarText x={112} label="Align" onClick={() => onResetLabelPosition(id)} />
      <ToolbarText x={154} label="Reset" onClick={() => onResetOverride(id)} />
      <ToolbarText x={198} label={labelVisible ? "Hide" : "Show"} onClick={() => onUpdateOverride(id, { labelVisible: !labelVisible })} />
      <ToolbarText x={240} label={placementLabel(placement)} onClick={() => onUpdateOverride(id, { labelPlacement: nextPlacement(placement) })} />
      <ToolbarText x={276} label="+" onClick={() => onAddElement(id)} />
      <ToolbarText x={296} label="x" onClick={() => onDeleteElement(id)} danger />
    </g>
  );
}

function ToolbarText({
  x,
  label,
  danger,
  onClick
}: {
  x: number;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const width = label.length > 1 ? 38 : 22;
  return (
    <g className="toolbar-hit" onClick={onClick}>
      <rect x={x - width / 2} y="7" width={width} height="28" rx="5" fill="transparent" />
      <text x={x} y="26" textAnchor="middle" className="toolbar-text" fill={danger ? "#a9362d" : "#191919"}>
        {label}
      </text>
    </g>
  );
}

function nextPlacement(placement: LabelPlacement): LabelPlacement {
  if (placement === "auto") return "inside";
  if (placement === "inside") return "outside";
  if (placement === "outside") return "callout";
  return "auto";
}

function placementLabel(placement: LabelPlacement): string {
  if (placement === "inside") return "In";
  if (placement === "outside") return "Out";
  if (placement === "callout") return "Call";
  return "Auto";
}

function adjustLabelCollisions(
  entries: Array<{ point: LabelPoint; lineCount: number }>,
  bounds: { minY: number; maxY: number; minGap: number }
) {
  (["start", "end"] as const).forEach((anchor) => {
    const group = entries.filter((entry) => entry.point.anchor === anchor).sort((a, b) => a.point.y - b.point.y);
    if (group.length < 2) return;

    distributeLabels(group, bounds);
    const overflow = group.at(-1)?.point.y ?? bounds.maxY;
    if (overflow > bounds.maxY) {
      const shift = overflow - bounds.maxY;
      group.forEach((entry) => moveLabelPoint(entry.point, entry.point.y - shift));
      distributeLabels(group, bounds);
    }
  });
}

function distributeLabels(entries: Array<{ point: LabelPoint; lineCount: number }>, bounds: { minY: number; minGap: number }) {
  entries.forEach((entry, index) => {
    if (index === 0) {
      moveLabelPoint(entry.point, Math.max(bounds.minY, entry.point.y));
      return;
    }

    const previous = entries[index - 1];
    moveLabelPoint(entry.point, Math.max(entry.point.y, previous.point.y + requiredLabelGap(previous, entry, bounds.minGap)));
  });
}

function requiredLabelGap(
  previous: { lineCount: number },
  next: { lineCount: number },
  minimum: number
): number {
  return Math.max(minimum, ((previous.lineCount + next.lineCount) * 14) / 2 + 4);
}

function moveLabelPoint(point: LabelPoint, y: number) {
  point.y = y;
  if (point.leader) point.leader.y2 = y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function Legend({
  x,
  y,
  items,
  foreground
}: {
  x: number;
  y: number;
  items: Array<PieSliceLayout>;
  foreground: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {items.map((item, index) => (
        <g key={item.id} transform={`translate(0 ${index * 32})`}>
          <rect width="16" height="16" rx="3" fill={item.color} />
          <text x="26" y="13" className="svg-axis" fill={foreground}>
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}
