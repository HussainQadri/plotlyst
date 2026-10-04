"use client";

import { forwardRef, useRef, useState } from "react";
import { AlignCenterHorizontal, Eye, EyeOff, MapPin, Plus, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { resolveAnnotations } from "@/lib/annotations";
import { chartArtifactCss, chartStyleMarker } from "@/lib/chartStyles";
import {
  describeArc,
  layoutMarimekko,
  layoutPie,
  layoutSankey,
  layoutScatter,
  layoutWaterfall,
  sankeyPlotFrame,
  scatterPlotFrame,
  type MarimekkoSegmentLayout,
  type PieSliceLayout,
  type WaterfallBarLayout
} from "@/lib/chartMath";
import { buildLabelLines, formatPercent, formatValue } from "@/lib/labels";
import { pieLabelPoint, placeScatterLabels, rectLabelPoint, waterfallLabelPoint, type LabelPoint } from "@/lib/labelPlacement";
import type { Annotation, ChartProject, LabelPlacement, MarimekkoData, PieData, SankeyData, ScatterData, VisualOverride, WaterfallData } from "@/lib/types";
import type { ValidationResult } from "@/lib/validation";

const labelSnapThreshold = 8;
const toolbarWidth = 306;
const toolbarHeight = 42;

type ChartCanvasProps = {
  project: ChartProject;
  selectedId: string | null;
  selectedIds: string[];
  onSelect: (id: string | null, options?: { additive?: boolean }) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>, options?: { coalesce?: boolean }) => void;
  onResetOverride: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onUpdateAnnotation: (id: string, next: Partial<Annotation>, options?: { coalesce?: boolean }) => void;
  onDeleteAnnotation: (id: string) => void;
  validation: ValidationResult;
};

export const ChartCanvas = forwardRef<SVGSVGElement, ChartCanvasProps>(function ChartCanvas(
  { project, selectedId, selectedIds, onSelect, onUpdateOverride, onResetOverride, onAddElement, onDeleteElement, onUpdateAnnotation, onDeleteAnnotation, validation },
  ref
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    kind: "label" | "annotation";
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
    setDrag({ id, kind: "label", startX: point.x, startY: point.y, baseDx: offset.dx, baseDy: offset.dy });
  }

  function startAnnotationDrag(annotation: Annotation, event: React.PointerEvent<SVGTextElement>) {
    const point = svgPoint(event as unknown as React.PointerEvent<SVGSVGElement>);
    if (!point) return;
    const offset = annotation.labelOffset ?? { dx: 0, dy: 0 };
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(annotation.id);
    setDrag({ id: annotation.id, kind: "annotation", startX: point.x, startY: point.y, baseDx: offset.dx, baseDy: offset.dy });
  }

  function moveLabel(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const point = svgPoint(event);
    if (!point) return;
    const nextDx = drag.baseDx + point.x - drag.startX;
    const nextDy = drag.baseDy + point.y - drag.startY;
    const snapped = Math.abs(nextDx) <= labelSnapThreshold && Math.abs(nextDy) <= labelSnapThreshold;
    const labelOffset = snapped ? { dx: 0, dy: 0 } : { dx: nextDx, dy: nextDy };
    if (drag.kind === "annotation") {
      onUpdateAnnotation(drag.id, { labelOffset }, { coalesce: true });
    } else {
      onUpdateOverride(drag.id, { labelOffset }, { coalesce: true });
    }
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
        // --halo drives the text outline colour so labels stay legible on any
        // slide background instead of assuming warm paper.
        style={{ ["--halo" as string]: project.theme.background }}
        onClick={() => onSelect(null)}
        onPointerMove={moveLabel}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {/* Artifact typography lives inside the SVG so it survives export. */}
        <style {...{ [chartStyleMarker]: "true" }} dangerouslySetInnerHTML={{ __html: chartArtifactCss }} />
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
            selectedIds={selectedIds}
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
            selectedIds={selectedIds}
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
            selectedIds={selectedIds}
            onSelect={onSelect}
            onStartLabelDrag={startLabelDrag}
            onUpdateOverride={onUpdateOverride}
            onResetOverride={onResetOverride}
            onResetLabelPosition={resetLabelPosition}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
          />
        ) : null}
        {project.type === "sankey" ? (
          <SankeyChart
            project={project}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onUpdateOverride={onUpdateOverride}
            onResetOverride={onResetOverride}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
          />
        ) : null}
        {project.type === "scatter" ? (
          <ScatterChart
            project={project}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onStartLabelDrag={startLabelDrag}
            onUpdateOverride={onUpdateOverride}
            onResetOverride={onResetOverride}
            onResetLabelPosition={resetLabelPosition}
            onAddElement={onAddElement}
            onDeleteElement={onDeleteElement}
          />
        ) : null}

        <AnnotationsLayer
          project={project}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onStartDrag={startAnnotationDrag}
          onUpdateAnnotation={onUpdateAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
        />

        {!validation.valid ? (
          <g data-export-hidden="true">
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
  selectedIds,
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
  selectedIds: string[];
  onSelect: (id: string, options?: { additive?: boolean }) => void;
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
    const lines = buildLabelLines({
      label: slice.label,
      percentage: slice.percentage,
      value: slice.value,
      settings: project.settings
    });
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
        foreground: project.theme.foreground,
        fillColor: slice.color,
        lines
      }),
      lines,
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
        foreground: project.theme.foreground,
        fillColor: selectedSlice.color,
        lines: []
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
              stroke={selectedIds.includes(slice.id) ? "#174f51" : project.theme.background}
              strokeWidth={selectedIds.includes(slice.id) ? 4 : 2}
              className="selectable-mark"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(slice.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
              }}
            />
            {slice.labelVisible && label && label.lines.length > 0 ? (
              <ChartLabel
                id={slice.id}
                lines={label.lines}
                point={label.point}
                muted={project.theme.muted}
                selected={selectedIds.includes(slice.id)}
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

function AnnotationsLayer({
  project,
  selectedIds,
  onSelect,
  onStartDrag,
  onUpdateAnnotation,
  onDeleteAnnotation
}: {
  project: ChartProject;
  selectedIds: string[];
  onSelect: (id: string | null, options?: { additive?: boolean }) => void;
  onStartDrag: (annotation: Annotation, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateAnnotation: (id: string, next: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
}) {
  const annotations = resolveAnnotations(project);
  if (annotations.length === 0) return null;

  return (
    <g className="annotation-layer">
      {annotations.map((item) => {
        const selected = selectedIds.includes(item.annotation.id);
        const stroke = item.annotation.style?.stroke ?? "#174f51";
        const fill = item.annotation.style?.fill ?? "#fffcf6";
        const dashed = item.annotation.style?.dashed ?? item.annotation.type === "valueLine";

        return (
          <g
            key={item.annotation.id}
            className={`annotation-object${selected ? " selected" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item.annotation.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
            }}
          >
            {item.annotation.type === "valueLine" && item.anchor.valueLine ? (
              <line
                x1={item.anchor.valueLine.x1}
                y1={item.anchor.valueLine.y}
                x2={item.anchor.valueLine.x2}
                y2={item.anchor.valueLine.y}
                stroke={stroke}
                strokeWidth={selected ? 2.2 : 1.6}
                strokeDasharray={dashed ? "6 5" : undefined}
              />
            ) : (
              <line
                x1={item.anchorX}
                y1={item.anchorY}
                x2={item.labelX}
                y2={item.labelY - 9}
                stroke={stroke}
                strokeWidth={selected ? 2.2 : 1.5}
                strokeDasharray={dashed ? "5 4" : undefined}
              />
            )}
            <circle cx={item.anchorX} cy={item.anchorY} r={selected ? 4 : 3} fill={stroke} data-export-hidden="true" />
            <text
              x={item.labelX}
              y={item.labelY}
              textAnchor="start"
              className="annotation-label"
              fill={stroke}
              onPointerDown={(event) => onStartDrag(item.annotation, event)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onUpdateAnnotation(item.annotation.id, { labelOffset: undefined });
              }}
            >
              {item.label}
            </text>
            {selected ? (
              <g data-export-hidden="true" transform={`translate(${item.labelX + 8} ${item.labelY + 10})`}>
                <rect x="0" y="0" width="44" height="22" rx="5" fill={fill} stroke="#cfc8bd" />
                <text
                  x="22"
                  y="15"
                  textAnchor="middle"
                  className="toolbar-text"
                  fill="#a9362d"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteAnnotation(item.annotation.id);
                  }}
                >
                  Delete
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function MarimekkoChart({
  project,
  selectedId,
  selectedIds,
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
  selectedIds: string[];
  onSelect: (id: string, options?: { additive?: boolean }) => void;
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
  const mekkoSettings = project.settings.mekko;
  const segments = layoutMarimekko(data, project.theme.palette, project.visualOverrides, width, height, mekkoSettings);
  const selectedSegment = selectedId ? segments.find((segment) => segment.id === selectedId) : null;
  const toolbarX = selectedSegment ? clamp(selectedSegment.x + selectedSegment.width / 2 - toolbarWidth / 2, 0, width - toolbarWidth) : 0;
  const toolbarY = selectedSegment
    ? toolbarTop(selectedSegment.y, selectedSegment.y + selectedSegment.height, y, height, project.settings.showTitle)
    : 0;
  const columnLabels = data.columns.map((column) => ({
    label: column.label,
    start: segments.find((segment) => segment.columnLabel === column.label)?.x ?? 0,
    width: segments.find((segment) => segment.columnLabel === column.label)?.width ?? width / data.columns.length,
    total: segments.find((segment) => segment.columnLabel === column.label)?.columnTotal ?? 0,
    percentage: segments.find((segment) => segment.columnLabel === column.label)?.columnPercentage ?? 0
  }));
  const ridgePoints = columnLabels
    .filter((column) => column.width > 0)
    .map((column) => `${column.start + column.width / 2},${height - column.percentage * height}`);

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width={width} height={height} fill="transparent" stroke={project.theme.grid} />
      {mekkoSettings.showTicks ? (
        <g>
          {[0.25, 0.5, 0.75].map((tick) => (
            <line key={tick} x1="0" x2={width} y1={height - tick * height} y2={height - tick * height} stroke={project.theme.grid} strokeWidth="0.8" strokeDasharray="2 6" />
          ))}
        </g>
      ) : null}
      {segments.map((segment) => (
        <MarimekkoSegment
          key={segment.id}
          segment={segment}
          selected={selectedIds.includes(segment.id)}
          settings={project.settings}
          showSegmentPercentages={mekkoSettings.showSegmentPercentages}
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
      {mekkoSettings.showRidge && ridgePoints.length > 1 ? (
        <polyline points={ridgePoints.join(" ")} fill="none" stroke="#174f51" strokeWidth="2" strokeDasharray="5 4" opacity="0.82" />
      ) : null}
      {mekkoSettings.showColumnTotals || mekkoSettings.showColumnPercentages ? (
        <g>
          {columnLabels.map((column) => {
            const total = mekkoSettings.showColumnTotals ? formatValue(column.total, project.settings.labelContent.valueFormat) : null;
            const share = mekkoSettings.showColumnPercentages ? formatPercent(column.percentage, project.settings.labelContent.percentDecimals) : null;
            return (
              <text key={`${column.label}-total`} x={column.start + column.width / 2} y="-14" textAnchor="middle" className="svg-mekko-total" fill={project.theme.foreground}>
                {total && share ? `${total} (${share})` : total ?? share}
              </text>
            );
          })}
        </g>
      ) : null}
      {mekkoSettings.showAxis ? (
        <g>
          <line x1="0" x2="0" y1="0" y2={height} stroke={project.theme.grid} strokeWidth="1.2" />
          {[0, 0.5, 1].map((tick) => (
            <g key={tick}>
              <line x1="-5" x2="0" y1={height - tick * height} y2={height - tick * height} stroke={project.theme.grid} strokeWidth="1.2" />
              <text x="-12" y={height - tick * height + 4} textAnchor="end" className="svg-axis" fill={project.theme.muted}>
                {formatPercent(tick, 0)}
              </text>
            </g>
          ))}
        </g>
      ) : null}
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
  showSegmentPercentages,
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
  showSegmentPercentages: boolean;
  themeForeground: string;
  themeMuted: string;
  chartWidth: number;
  chartHeight: number;
  offset?: { dx: number; dy: number };
  onSelect: (id: string, options?: { additive?: boolean }) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onResetLabelPosition: (id: string) => void;
}) {
  const labelLines = buildLabelLines({
    label: segment.label,
    value: segment.value,
    percentage: showSegmentPercentages ? segment.segmentPercentage : segment.percentage,
    settings
  });
  const labelPoint = rectLabelPoint({
    rect: { x: segment.x, y: segment.y, width: segment.width, height: segment.height },
    placement: segment.labelPlacement,
    offset,
    chartWidth,
    chartHeight,
    foreground: themeForeground,
    fillColor: segment.color,
    lines: labelLines
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
          onSelect(segment.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
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
  selectedIds,
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
  selectedIds: string[];
  onSelect: (id: string, options?: { additive?: boolean }) => void;
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
  const toolbarY = selectedBar ? toolbarTop(selectedBar.y, selectedBar.y + selectedBar.height, y, height, project.settings.showTitle) : 0;
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
          selected={selectedIds.includes(bar.id)}
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
  onSelect: (id: string, options?: { additive?: boolean }) => void;
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
    foreground: themeForeground,
    fillColor: bar.color,
    lines: labelLines
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
          onSelect(bar.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
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
      <rect x="0" y="0" width={toolbarWidth} height={toolbarHeight} rx="6" fill="#fffcf6" stroke="#cfc8bd" />
      {palette.slice(0, 4).map((color, index) => (
        <g key={color} className="toolbar-hit" onClick={() => onUpdateOverride(id, { fill: color })}>
          <rect x={10 + index * 24} y="10" width="18" height="22" rx="4" fill={color} stroke="#ffffff" />
        </g>
      ))}
      <ToolbarIcon x={116} icon={AlignCenterHorizontal} label="Align label" onClick={() => onResetLabelPosition(id)} />
      <ToolbarIcon x={150} icon={RotateCcw} label="Reset mark" onClick={() => onResetOverride(id)} />
      <ToolbarIcon x={184} icon={labelVisible ? EyeOff : Eye} label={labelVisible ? "Hide label" : "Show label"} onClick={() => onUpdateOverride(id, { labelVisible: !labelVisible })} />
      <ToolbarIcon x={218} icon={MapPin} label={placementLabel(placement)} onClick={() => onUpdateOverride(id, { labelPlacement: nextPlacement(placement) })} />
      <ToolbarIcon x={252} icon={Plus} label="Add mark" onClick={() => onAddElement(id)} />
      <ToolbarIcon x={286} icon={Trash2} label="Delete mark" onClick={() => onDeleteElement(id)} danger />
    </g>
  );
}

function ToolbarIcon({
  x,
  icon: Icon,
  label,
  danger,
  onClick
}: {
  x: number;
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <g className="toolbar-hit" onClick={onClick}>
      <title>{label}</title>
      <rect x={x - 13} y="7" width="26" height="28" rx="5" fill="transparent" />
      <Icon x={x - 7} y="14" size={14} strokeWidth={2.4} color={danger ? "#a9362d" : "#191919"} />
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

/** Lowest slide y the toolbar's top may reach while the title is showing. */
const toolbarTitleClearance = 76;

/**
 * Toolbar top in plot coordinates: just above the selected mark, or, when that
 * would cover the slide title, just below a short mark or over a tall mark's top.
 */
function toolbarTop(markTop: number, markBottom: number, plotY: number, plotHeight: number, titleShown: boolean): number {
  const minTop = (titleShown ? toolbarTitleClearance : 8) - plotY;
  const above = markTop - toolbarHeight - 8;
  if (above >= minTop) return above;
  const below = markBottom - markTop > 120 ? markTop + 12 : markBottom + 8;
  return clamp(below, minTop, plotHeight - toolbarHeight - 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function SankeyChart({
  project,
  selectedId,
  selectedIds,
  onSelect,
  onUpdateOverride,
  onResetOverride,
  onAddElement,
  onDeleteElement
}: {
  project: ChartProject;
  selectedId: string | null;
  selectedIds: string[];
  onSelect: (id: string, options?: { additive?: boolean }) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const { x: ox, y: oy, width: w, height: h } = sankeyPlotFrame;
  const data = project.data as SankeyData;
  const layout = layoutSankey(data, project.theme.palette, project.visualOverrides, w, h, project.settings.sankey);
  const selectedNode = selectedId ? layout.nodes.find((n) => n.id === selectedId) : null;
  // Everything entering the diagram flows out of the first column, so it is the whole for Percent.
  const totalFlow = layout.nodes.filter((node) => node.depth === 0).reduce((sum, node) => sum + node.value, 0);

  return (
    <g transform={`translate(${ox} ${oy})`}>
      {layout.links.map((link) => (
        <path
          key={link.id}
          d={link.path}
          fill={link.color}
          opacity="0.28"
          stroke="none"
        />
      ))}
      {project.settings.showLabels && project.settings.sankey.showLinkLabels
        ? layout.links.map((link) => (
            <text key={`lbl-${link.id}`} x={link.midX} y={link.midY} textAnchor="middle" className="svg-axis" fill={project.theme.muted}>
              {formatValue(link.value, project.settings.labelContent.valueFormat)}
            </text>
          ))
        : null}
      {layout.nodes.map((node) => {
        const selected = selectedIds.includes(node.id);
        // Right-half labels sit left of their node so they read into the flows, not off the slide.
        const labelOnLeft = node.x + node.width / 2 > w / 2;
        const labelX = labelOnLeft ? node.x - 6 : node.x + node.width + 6;
        const labelLines =
          project.settings.sankey.showNodeLabels && node.labelVisible
            ? buildLabelLines({
                label: node.label,
                value: node.value,
                percentage: totalFlow > 0 ? node.value / totalFlow : undefined,
                settings: project.settings
              })
            : [];
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              fill={node.color}
              stroke={selected ? "#174f51" : "none"}
              strokeWidth={selected ? 3 : 0}
              rx="2"
              className="selectable-mark"
              onClick={(e) => { e.stopPropagation(); onSelect(node.id, { additive: e.shiftKey || e.metaKey || e.ctrlKey }); }}
            />
            {labelLines.length > 0 ? (
              <text
                x={labelX}
                y={node.y + node.height / 2 + 4 - (labelLines.length - 1) * 7}
                textAnchor={labelOnLeft ? "end" : "start"}
                className="svg-axis"
                fill={project.theme.foreground}
              >
                {labelLines.map((line, index) => (
                  <tspan key={`${line}-${index}`} x={labelX} dy={index === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            ) : null}
          </g>
        );
      })}
      {selectedId && selectedNode ? (
        <CanvasToolbar
          id={selectedId}
          x={clamp(selectedNode.x + selectedNode.width + 8, 0, w - toolbarWidth)}
          y={toolbarTop(selectedNode.y, selectedNode.y + selectedNode.height, oy, h, project.settings.showTitle)}
          palette={project.theme.palette}
          override={project.visualOverrides[selectedId] ?? {}}
          onUpdateOverride={onUpdateOverride}
          onResetOverride={onResetOverride}
          onResetLabelPosition={() => {}}
          onAddElement={onAddElement}
          onDeleteElement={onDeleteElement}
        />
      ) : null}
    </g>
  );
}

function ScatterChart({
  project,
  selectedId,
  selectedIds,
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
  selectedIds: string[];
  onSelect: (id: string, options?: { additive?: boolean }) => void;
  onStartLabelDrag: (id: string, event: React.PointerEvent<SVGTextElement>) => void;
  onUpdateOverride: (id: string, next: Partial<VisualOverride>) => void;
  onResetOverride: (id: string) => void;
  onResetLabelPosition: (id: string) => void;
  onAddElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}) {
  const { x: ox, y: oy, width: w, height: h } = scatterPlotFrame;
  const data = project.data as ScatterData;
  const scatterSettings = project.settings.scatter;
  const theme = project.theme;
  const layout = layoutScatter(data, theme.palette, project.visualOverrides, w, h, scatterSettings);
  const selectedPoint = selectedId ? layout.points.find((p) => p.id === selectedId) : null;
  // Big bubbles paint first so small ones on top stay clickable; the selection paints last.
  const orderedPoints = [...layout.points].sort((a, b) => {
    const selectionOrder = Number(selectedIds.includes(a.id)) - Number(selectedIds.includes(b.id));
    return selectionOrder || b.r - a.r;
  });
  const labelLines = new Map(
    layout.points.map((point) => [point.id, buildLabelLines({ label: point.label, value: point.size, settings: project.settings })])
  );
  const labelPoints = placeScatterLabels(
    layout.points
      .filter((point) => project.settings.showLabels && point.labelVisible)
      .map((point) => ({
        id: point.id,
        cx: point.cx,
        cy: point.cy,
        radius: point.r,
        color: point.color,
        lines: labelLines.get(point.id) ?? [],
        placement: point.labelPlacement,
        offset: project.visualOverrides[point.id]?.labelOffset
      })),
    { width: w, height: h },
    theme.foreground
  );
  const yTickLabelWidth = Math.max(0, ...layout.yTicks.map((tick) => tick.label.length * 7));
  const describePoint = (point: (typeof layout.points)[number]) =>
    `${point.label}: X ${point.x}, Y ${point.y}${scatterSettings.showBubbles && point.size ? `, size ${point.size}` : ""}`;

  return (
    <g transform={`translate(${ox} ${oy})`}>
      {scatterSettings.showGrid ? (
        <g aria-hidden="true" stroke={theme.grid} strokeWidth="1" opacity="0.6">
          {layout.xTicks.map((tick) => (
            <line key={`xg-${tick.value}`} x1={tick.position} x2={tick.position} y1="0" y2={h} />
          ))}
          {layout.yTicks.map((tick) => (
            <line key={`yg-${tick.value}`} x1="0" x2={w} y1={tick.position} y2={tick.position} />
          ))}
        </g>
      ) : null}

      <g aria-hidden="true" stroke={theme.grid} strokeWidth="1">
        <line x1="0" x2={w} y1={h} y2={h} />
        <line x1="0" x2="0" y1="0" y2={h} />
      </g>

      {scatterSettings.showQuadrants ? (
        <g aria-hidden="true">
          <line x1={layout.xDivider} x2={layout.xDivider} y1="0" y2={h} stroke={theme.muted} strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
          <line x1="0" x2={w} y1={layout.yDivider} y2={layout.yDivider} stroke={theme.muted} strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
          {scatterSettings.quadrantLabels.map((qlabel, qi) =>
            qlabel ? (
              <text
                key={qi}
                x={qi % 2 === 0 ? 10 : w - 10}
                y={qi < 2 ? 18 : h - 10}
                textAnchor={qi % 2 === 0 ? "start" : "end"}
                className="svg-note"
                fill={theme.muted}
              >
                {qlabel}
              </text>
            ) : null
          )}
        </g>
      ) : null}

      {layout.xTicks.map((tick) => (
        <text key={`xt-${tick.value}`} x={tick.position} y={h + 20} textAnchor="middle" className="svg-axis" fill={theme.muted}>
          {tick.label}
        </text>
      ))}
      {layout.yTicks.map((tick) => (
        <text key={`yt-${tick.value}`} x="-10" y={tick.position + 4} textAnchor="end" className="svg-axis" fill={theme.muted}>
          {tick.label}
        </text>
      ))}

      {scatterSettings.xLabel ? (
        <text x={w / 2} y={h + 42} textAnchor="middle" className="svg-note" fill={theme.foreground}>
          {scatterSettings.xLabel}
        </text>
      ) : null}
      {scatterSettings.yLabel ? (
        <text x={-10 - yTickLabelWidth} y="-16" textAnchor="start" className="svg-note" fill={theme.foreground}>
          {scatterSettings.yLabel}
        </text>
      ) : null}

      {layout.points.length === 0 ? (
        <g aria-hidden="true">
          <text x={w / 2} y={h / 2 - 4} textAnchor="middle" className="svg-note" fill={theme.foreground}>
            {data.points.length === 0 ? "Add points to begin" : "Enter numeric X and Y values"}
          </text>
          <text x={w / 2} y={h / 2 + 17} textAnchor="middle" className="svg-axis" fill={theme.muted}>
            Use the data panel or open the datasheet.
          </text>
        </g>
      ) : null}

      <g className="scatter-marks">
        {orderedPoints.map((point) => {
          const selected = selectedIds.includes(point.id);
          return (
            <circle
              key={point.id}
              cx={point.cx}
              cy={point.cy}
              r={point.r}
              fill={point.color}
              fillOpacity={scatterSettings.showBubbles ? 0.85 : 1}
              stroke={selected ? "#174f51" : theme.background}
              strokeWidth={selected ? 3 : 2}
              className="selectable-mark"
              role="button"
              tabIndex={0}
              aria-label={describePoint(point)}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(point.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                onSelect(point.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
              }}
            >
              <title>{describePoint(point)}</title>
            </circle>
          );
        })}
      </g>

      <g className="scatter-labels">
        {layout.points.map((point) => {
          const labelPoint = labelPoints.get(point.id);
          const lines = labelLines.get(point.id) ?? [];
          return labelPoint && lines.length > 0 ? (
            <ChartLabel
              key={point.id}
              id={point.id}
              lines={lines}
              point={labelPoint}
              muted={theme.muted}
              selected={selectedIds.includes(point.id)}
              onStartDrag={onStartLabelDrag}
              onResetPosition={onResetLabelPosition}
            />
          ) : null;
        })}
      </g>

      {selectedId && selectedPoint ? (
        <CanvasToolbar
          id={selectedId}
          x={clamp(selectedPoint.cx + selectedPoint.r + 8, 0, w - toolbarWidth)}
          y={toolbarTop(selectedPoint.cy - selectedPoint.r, selectedPoint.cy + selectedPoint.r, oy, h, project.settings.showTitle)}
          palette={theme.palette}
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
