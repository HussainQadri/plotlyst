import { layoutMarimekko, layoutPie, layoutSankey, layoutScatter, layoutWaterfall, sankeyPlotFrame, scatterPlotFrame } from "./chartMath";
import type { Annotation, ChartProject, MarimekkoData, PieData, SankeyData, ScatterData, WaterfallData } from "./types";

export type AnnotationAnchor = {
  id: string;
  label: string;
  x: number;
  y: number;
  valueLine?: {
    x1: number;
    x2: number;
    y: number;
  };
};

export type ResolvedAnnotation = {
  annotation: Annotation;
  anchor: AnnotationAnchor;
  label: string;
  labelX: number;
  labelY: number;
  anchorX: number;
  anchorY: number;
};

const pieCenter = { x: 360, y: 286 };
const pieRadius = 142;
const plot = { x: 112, y: 104, width: 736 };
const scatterPlot = scatterPlotFrame;
const sankeyPlot = sankeyPlotFrame;

export function resolveAnnotations(project: ChartProject): ResolvedAnnotation[] {
  return project.annotations.flatMap((annotation) => {
    if (!annotation.visible) return [];
    const anchorId = annotation.anchorIds[0];
    if (!anchorId) return [];
    const anchor = resolveAnnotationAnchor(project, anchorId);
    if (!anchor) return [];
    const offset = annotation.labelOffset ?? defaultAnnotationOffset(annotation.type);

    return [
      {
        annotation,
        anchor,
        label: annotation.label?.trim() || defaultAnnotationLabel(annotation.type),
        labelX: anchor.x + offset.dx,
        labelY: anchor.y + offset.dy,
        anchorX: anchor.x,
        anchorY: anchor.y
      }
    ];
  });
}

export function resolveAnnotationAnchor(project: ChartProject, anchorId: string): AnnotationAnchor | null {
  if (project.type === "pie") {
    const data = project.data as PieData;
    const slice = layoutPie(data, project.theme.palette, project.visualOverrides).find((item) => item.id === anchorId);
    if (!slice) return null;
    const angle = ((slice.startAngle + slice.endAngle) / 2 - 90) * (Math.PI / 180);
    return {
      id: slice.id,
      label: slice.label,
      x: pieCenter.x + Math.cos(angle) * (pieRadius + 10),
      y: pieCenter.y + Math.sin(angle) * (pieRadius + 10)
    };
  }

  if (project.type === "marimekko") {
    const data = project.data as MarimekkoData;
    const segment = layoutMarimekko(data, project.theme.palette, project.visualOverrides, 736, 330, project.settings.mekko).find((item) => item.id === anchorId);
    if (!segment) return null;
    return {
      id: segment.id,
      label: `${segment.columnLabel} / ${segment.label}`,
      x: plot.x + segment.x + segment.width / 2,
      y: plot.y + segment.y + segment.height / 2,
      valueLine: {
        x1: plot.x,
        x2: plot.x + plot.width,
        y: plot.y + segment.y
      }
    };
  }

  if (project.type === "waterfall") {
    const data = project.data as WaterfallData;
    const bar = layoutWaterfall(data, project.theme.palette, project.visualOverrides, 736, 320, project.settings.waterfall).find((item) => item.id === anchorId);
    if (!bar) return null;
    const positive = bar.endValue >= bar.startValue;
    return {
      id: bar.id,
      label: bar.label,
      x: plot.x + bar.x + bar.width / 2,
      y: plot.y + (positive ? bar.y : bar.y + bar.height),
      valueLine: {
        x1: plot.x,
        x2: plot.x + plot.width,
        y: plot.y + bar.connectorOutY
      }
    };
  }

  if (project.type === "scatter") {
    const data = project.data as ScatterData;
    const point = layoutScatter(
      data,
      project.theme.palette,
      project.visualOverrides,
      scatterPlot.width,
      scatterPlot.height,
      project.settings.scatter
    ).points.find((item) => item.id === anchorId);
    if (!point) return null;
    return {
      id: point.id,
      label: point.label,
      x: scatterPlot.x + point.cx,
      y: scatterPlot.y + point.cy,
      valueLine: {
        x1: scatterPlot.x,
        x2: scatterPlot.x + scatterPlot.width,
        y: scatterPlot.y + point.cy
      }
    };
  }

  if (project.type === "sankey") {
    const data = project.data as SankeyData;
    const node = layoutSankey(
      data,
      project.theme.palette,
      project.visualOverrides,
      sankeyPlot.width,
      sankeyPlot.height,
      project.settings.sankey
    ).nodes.find((item) => item.id === anchorId);
    if (!node) return null;
    return {
      id: node.id,
      label: node.label,
      x: sankeyPlot.x + node.x + node.width / 2,
      y: sankeyPlot.y + node.y + node.height / 2,
      valueLine: {
        x1: sankeyPlot.x,
        x2: sankeyPlot.x + sankeyPlot.width,
        y: sankeyPlot.y + node.y + node.height / 2
      }
    };
  }

  return null;
}

function defaultAnnotationOffset(type: Annotation["type"]) {
  if (type === "valueLine") return { dx: 92, dy: -12 };
  return { dx: 74, dy: -48 };
}

function defaultAnnotationLabel(type: Annotation["type"]) {
  if (type === "valueLine") return "Value line";
  if (type === "differenceArrow") return "Difference";
  if (type === "totalArrow") return "Total";
  if (type === "connectorNote") return "Note";
  return "Callout";
}
