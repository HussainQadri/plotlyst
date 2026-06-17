export type ChartType = "pie" | "marimekko" | "waterfall";

export type LabelPlacement = "auto" | "inside" | "outside" | "callout";

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

export type ChartSettings = {
  showLegend: boolean;
  showValues: boolean;
  showTitle: boolean;
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

export type WaterfallKind = "start" | "change" | "total";

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

export type ChartData = PieData | MarimekkoData | WaterfallData;

export type ChartProject = {
  id: string;
  title: string;
  type: ChartType;
  theme: ChartTheme;
  data: ChartData;
  settings: ChartSettings;
  visualOverrides: Record<string, VisualOverride>;
};

export type SelectableElement = {
  id: string;
  label: string;
  value: number;
  kind: "slice" | "segment" | "bar";
};
