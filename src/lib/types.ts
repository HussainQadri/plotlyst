export type ChartType = "pie" | "marimekko" | "waterfall" | "sankey" | "scatter";

export type LabelPlacement = "auto" | "inside" | "outside" | "callout";

export type LabelContentField = "label" | "value" | "percent";

export type LabelSeparator = "space" | "slash" | "newline";

export type NumberScale = "none" | "thousands" | "millions";

export type NegativeStyle = "minus" | "parentheses";

export type NumberFormatSettings = {
  decimals: number;
  scale: NumberScale;
  prefix: string;
  suffix: string;
  showPlus: boolean;
  negativeStyle: NegativeStyle;
};

export type LabelSettings = {
  fields: LabelContentField[];
  separator: LabelSeparator;
  valueFormat: NumberFormatSettings;
  percentDecimals: number;
};

export type WaterfallConnectorStyle = "solid" | "dashed" | "none";

export type WaterfallBuildMode = "buildUp" | "buildDown";

export type WaterfallTotalLabelMode = "calculated" | "amount";

export type MekkoMode = "absolute" | "percent";

export type MekkoSegmentOrder = "sheet" | "reverse" | "ascending" | "descending";

export type WaterfallSettings = {
  showConnectors: boolean;
  connectorStyle: WaterfallConnectorStyle;
  buildMode: WaterfallBuildMode;
  forceBaseline: boolean;
  totalLabelMode: WaterfallTotalLabelMode;
};

export type MekkoSettings = {
  mode: MekkoMode;
  showColumnTotals: boolean;
  showColumnPercentages: boolean;
  showSegmentPercentages: boolean;
  showAxis: boolean;
  showTicks: boolean;
  showRidge: boolean;
  segmentOrder: MekkoSegmentOrder;
  otherThreshold?: number;
};

export type ChartTheme = {
  id: string;
  name: string;
  background: string;
  foreground: string;
  muted: string;
  grid: string;
  palette: string[];
};

export type VisualOverride = {
  fill?: string;
  label?: string;
  labelVisible?: boolean;
  labelPlacement?: LabelPlacement;
  labelOffset?: { dx: number; dy: number };
};

export type AnnotationType = "differenceArrow" | "totalArrow" | "valueLine" | "connectorNote" | "callout";

export type Annotation = {
  id: string;
  type: AnnotationType;
  anchorIds: string[];
  label?: string;
  visible: boolean;
  style?: {
    stroke?: string;
    fill?: string;
    dashed?: boolean;
  };
  labelOffset?: { dx: number; dy: number };
};

export type SankeyAlign = "left" | "right" | "justify";

export type SankeySettings = {
  nodeWidth: number;
  nodePadding: number;
  align: SankeyAlign;
  showNodeLabels: boolean;
  showLinkLabels: boolean;
};

export type ScatterSettings = {
  xLabel: string;
  yLabel: string;
  showGrid: boolean;
  showQuadrants: boolean;
  showBubbles: boolean;
  quadrantLabels: [string, string, string, string];
};

export type ChartSettings = {
  showLegend: boolean;
  showTitle: boolean;
  showLabels: boolean;
  labelContent: LabelSettings;
  waterfall: WaterfallSettings;
  mekko: MekkoSettings;
  sankey: SankeySettings;
  scatter: ScatterSettings;
};

export type PieDatum = {
  id: string;
  label: string;
  value: number;
  color?: string;
};

export type PieData = {
  rows: PieDatum[];
};

export type MarimekkoSegment = {
  id: string;
  label: string;
  value: number;
  color?: string;
};

export type MarimekkoColumn = {
  id: string;
  label: string;
  segments: MarimekkoSegment[];
};

export type MarimekkoData = {
  columns: MarimekkoColumn[];
};

export type WaterfallKind = "start" | "change" | "subtotal" | "total";

export type WaterfallDatum = {
  id: string;
  label: string;
  amount: number;
  kind: WaterfallKind;
  color?: string;
};

export type WaterfallData = {
  rows: WaterfallDatum[];
};

export type SankeyNode = {
  id: string;
  label: string;
  color?: string;
};

export type SankeyLink = {
  id: string;
  sourceId: string;
  targetId: string;
  value: number;
  color?: string;
};

export type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

export type ScatterPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
};

export type ScatterData = {
  points: ScatterPoint[];
};

export type ChartData = PieData | MarimekkoData | WaterfallData | SankeyData | ScatterData;

export type ChartProject = {
  id: string;
  title: string;
  type: ChartType;
  theme: ChartTheme;
  data: ChartData;
  settings: ChartSettings;
  visualOverrides: Record<string, VisualOverride>;
  annotations: Annotation[];
};

export type SelectableElement = {
  id: string;
  label: string;
  value: number;
  kind: "slice" | "segment" | "bar" | "point" | "node";
};
