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
import { pieLabelPoint, rectLabelPoint, waterfallLabelPoint, type LabelPoint } from "@/lib/labelPlacement";
import type { ChartProject, LabelPlacement, MarimekkoData, PieData, VisualOverride, WaterfallData } from "@/lib/types";
import type { ValidationResult } from "@/lib/validation";

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
    onUpdateOverride(drag.id, {
      labelOffset: {
        dx: drag.baseDx + point.x - drag.startX,
        dy: drag.baseDy + point.y - drag.startY
      }
    });
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
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const data = project.data as PieData;
  const slices = layoutPie(data, project.theme.palette, project.visualOverrides);
  const cx = 360;
  const cy = 286;
  const radius = 142;
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
        const mid = (slice.startAngle + slice.endAngle) / 2;
        const labelPoint = pieLabelPoint({
          cx,
          cy,
          radius,
          midAngle: mid,
          percentage: slice.percentage,
          placement: slice.labelPlacement,
          offset: project.visualOverrides[slice.id]?.labelOffset,
          foreground: project.theme.foreground
        });
        const label = project.settings.showValues ? `${slice.label} ${(slice.percentage * 100).toFixed(0)}%` : slice.label;

        return (
          <g key={slice.id}>
            <path
              d={describeArc(cx, cy, radius, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke={selectedId === slice.id ? "#101828" : project.theme.background}
              strokeWidth={selectedId === slice.id ? 5 : 2}
              className="selectable-mark"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(slice.id);
              }}
            />
            {slice.labelVisible ? (
              <ChartLabel id={slice.id} label={label} point={labelPoint} muted={project.theme.muted} selected={selectedId === slice.id} onStartDrag={onStartLabelDrag} />
            ) : null}
          </g>
        );
      })}
      {project.settings.showLegend ? <Legend x={650} y={154} items={slices} foreground={project.theme.foreground} /> : null}
      {selectedId && selectedSliceAnchor ? (
        <CanvasToolbar
          id={selectedId}
          x={clamp(selectedSliceAnchor.x + 14, 24, 710)}
          y={clamp(selectedSliceAnchor.y - 24, 86, 420)}
          palette={project.theme.palette}
          override={project.visualOverrides[selectedId] ?? {}}
          onUpdateOverride={onUpdateOverride}
          onResetOverride={onResetOverride}
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
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
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
  const toolbarX = selectedSegment ? clamp(selectedSegment.x + selectedSegment.width / 2 - 130, 0, width - 260) : 0;
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
          showValues={project.settings.showValues}
          themeForeground={project.theme.foreground}
          themeMuted={project.theme.muted}
          chartWidth={width}
          chartHeight={height}
          offset={project.visualOverrides[segment.id]?.labelOffset}
          onSelect={onSelect}
          onStartLabelDrag={onStartLabelDrag}
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
  showValues,
  themeForeground,
  themeMuted,
  chartWidth,
  chartHeight,
  offset,
  onSelect,
  onStartLabelDrag
}: {
  segment: MarimekkoSegmentLayout;
  selected: boolean;
  showValues: boolean;
  themeForeground: string;
  themeMuted: string;
  chartWidth: number;
  chartHeight: number;
  offset?: { dx: number; dy: number };
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
}) {
  const labelPoint = rectLabelPoint({
    rect: { x: segment.x, y: segment.y, width: segment.width, height: segment.height },
    placement: segment.labelPlacement,
    offset,
    chartWidth,
    chartHeight,
    foreground: themeForeground
  });
  const label = showValues ? `${segment.label} ${segment.value}` : segment.label;

  return (
    <g>
      <rect
        x={segment.x}
        y={segment.y}
        width={segment.width}
        height={segment.height}
        fill={segment.color}
        stroke={selected ? "#101828" : "#ffffff"}
        strokeWidth={selected ? 4 : 1.5}
        className="selectable-mark"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(segment.id);
        }}
      />
      {segment.labelVisible ? (
        <ChartLabel id={segment.id} label={label} point={labelPoint} muted={themeMuted} selected={selected} onStartDrag={onStartLabelDrag} />
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
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const x = 112;
  const y = 104;
  const width = 736;
  const height = 320;
  const data = project.data as WaterfallData;
  const bars = layoutWaterfall(data, project.theme.palette, project.visualOverrides, width, height);
  const selectedBar = selectedId ? bars.find((bar) => bar.id === selectedId) : null;
  const toolbarX = selectedBar ? clamp(selectedBar.x + selectedBar.width / 2 - 130, 0, width - 260) : 0;
  const toolbarY = selectedBar ? clamp(selectedBar.y - 50, -56, height - 44) : -50;

  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" x2={width} y1={bars[0]?.baseline ?? height} y2={bars[0]?.baseline ?? height} stroke={project.theme.grid} />
      {bars.map((bar) => (
        <WaterfallBar
          key={bar.id}
          bar={bar}
          selected={selectedId === bar.id}
          showValues={project.settings.showValues}
          themeForeground={project.theme.foreground}
          themeMuted={project.theme.muted}
          offset={project.visualOverrides[bar.id]?.labelOffset}
          onSelect={onSelect}
          onStartLabelDrag={onStartLabelDrag}
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
  showValues,
  themeForeground,
  themeMuted,
  offset,
  onSelect,
  onStartLabelDrag
}: {
  bar: WaterfallBarLayout;
  selected: boolean;
  showValues: boolean;
  themeForeground: string;
  themeMuted: string;
  offset?: { dx: number; dy: number };
  onSelect: (id: string) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
}) {
  const valueLabel = bar.displayValue >= 0 ? `+${bar.displayValue}` : `${bar.displayValue}`;
  const point = waterfallLabelPoint({
    rect: { x: bar.x, y: bar.y, width: bar.width, height: bar.height },
    placement: bar.labelPlacement,
    offset,
    positive: bar.displayValue >= 0,
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
        stroke={selected ? "#101828" : "#ffffff"}
        strokeWidth={selected ? 4 : 1.5}
        className="selectable-mark"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(bar.id);
        }}
      />
      {bar.labelVisible ? (
        <>
          <ChartLabel id={bar.id} label={showValues ? valueLabel : bar.label} point={point} muted={themeMuted} selected={selected} onStartDrag={onStartLabelDrag} />
          <text x={bar.x + bar.width / 2} y={350} textAnchor="middle" className="svg-axis" fill="#344054">
            {bar.label}
          </text>
        </>
      ) : null}
    </g>
  );
}

function ChartLabel({
  id,
  label,
  point,
  muted,
  selected,
  onStartDrag
}: {
  id: string;
  label: string;
  point: LabelPoint;
  muted: string;
  selected: boolean;
  onStartDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
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
        y={point.y}
        textAnchor={point.anchor}
        className={`${point.className} label-handle${selected ? " selected" : ""}`}
        fill={point.fill}
        onPointerDown={(event) => onStartDrag(id, event)}
      >
        {label}
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
      <rect x="0" y="0" width="260" height="42" rx="8" fill="#ffffff" stroke="#cfc8bd" />
      {palette.slice(0, 4).map((color, index) => (
        <g key={color} className="toolbar-hit" onClick={() => onUpdateOverride(id, { fill: color })}>
          <rect x={10 + index * 24} y="10" width="18" height="22" rx="4" fill={color} stroke="#ffffff" />
        </g>
      ))}
      <ToolbarText x={114} label="Reset" onClick={() => onResetOverride(id)} />
      <ToolbarText x={154} label={labelVisible ? "Hide" : "Show"} onClick={() => onUpdateOverride(id, { labelVisible: !labelVisible })} />
      <ToolbarText x={194} label={placementLabel(placement)} onClick={() => onUpdateOverride(id, { labelPlacement: nextPlacement(placement) })} />
      <ToolbarText x={226} label="+" onClick={() => onAddElement(id)} />
      <ToolbarText x={246} label="x" onClick={() => onDeleteElement(id)} danger />
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
      <text x={x} y="26" textAnchor="middle" className="toolbar-text" fill={danger ? "#b42318" : "#111827"}>
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
