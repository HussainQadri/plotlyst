import { defaultTheme } from "./themes";
import { defaultChartSettings } from "./labels";
import type { ChartProject, ChartType, MarimekkoData, PieData, SankeyData, ScatterData, WaterfallData } from "./types";

export const samplePieData: PieData = {
  rows: [
    { id: "pie-enterprise", label: "Enterprise", value: 42 },
    { id: "pie-midmarket", label: "Mid-market", value: 28 },
    { id: "pie-smb", label: "SMB", value: 18 },
    { id: "pie-partner", label: "Partner", value: 12 }
  ]
};

export const sampleMarimekkoData: MarimekkoData = {
  columns: [
    {
      id: "mekko-na",
      label: "North America",
      segments: [
        { id: "mekko-na-software", label: "Software", value: 56 },
        { id: "mekko-na-services", label: "Services", value: 27 },
        { id: "mekko-na-hardware", label: "Hardware", value: 17 }
      ]
    },
    {
      id: "mekko-emea",
      label: "EMEA",
      segments: [
        { id: "mekko-emea-software", label: "Software", value: 38 },
        { id: "mekko-emea-services", label: "Services", value: 35 },
        { id: "mekko-emea-hardware", label: "Hardware", value: 27 }
      ]
    },
    {
      id: "mekko-apac",
      label: "APAC",
      segments: [
        { id: "mekko-apac-software", label: "Software", value: 24 },
        { id: "mekko-apac-services", label: "Services", value: 42 },
        { id: "mekko-apac-hardware", label: "Hardware", value: 34 }
      ]
    }
  ]
};

export const sampleWaterfallData: WaterfallData = {
  rows: [
    { id: "wf-start", label: "2025 Revenue", amount: 128, kind: "start" },
    { id: "wf-new", label: "New Business", amount: 34, kind: "change" },
    { id: "wf-expansion", label: "Expansion", amount: 19, kind: "change" },
    { id: "wf-subtotal", label: "Gross Revenue", amount: 0, kind: "subtotal" },
    { id: "wf-churn", label: "Churn", amount: -16, kind: "change" },
    { id: "wf-costs", label: "Discounts", amount: -7, kind: "change" },
    { id: "wf-total", label: "2026 Revenue", amount: 0, kind: "total" }
  ]
};

export const sampleSankeyData: SankeyData = {
  nodes: [
    { id: "sk-revenue", label: "Total Revenue" },
    { id: "sk-product", label: "Product" },
    { id: "sk-services", label: "Services" },
    { id: "sk-americas", label: "Americas" },
    { id: "sk-emea", label: "EMEA" },
    { id: "sk-apac", label: "APAC" },
    { id: "sk-svcs-americas", label: "Svcs Americas" },
    { id: "sk-svcs-emea", label: "Svcs EMEA" }
  ],
  links: [
    { id: "skl-1", sourceId: "sk-revenue", targetId: "sk-product", value: 74 },
    { id: "skl-2", sourceId: "sk-revenue", targetId: "sk-services", value: 46 },
    { id: "skl-3", sourceId: "sk-product", targetId: "sk-americas", value: 38 },
    { id: "skl-4", sourceId: "sk-product", targetId: "sk-emea", value: 22 },
    { id: "skl-5", sourceId: "sk-product", targetId: "sk-apac", value: 14 },
    { id: "skl-6", sourceId: "sk-services", targetId: "sk-svcs-americas", value: 27 },
    { id: "skl-7", sourceId: "sk-services", targetId: "sk-svcs-emea", value: 19 }
  ]
};

export const sampleScatterData: ScatterData = {
  points: [
    { id: "sc-cloud", label: "Cloud Platform", x: 78, y: 24, size: 420 },
    { id: "sc-security", label: "Security Suite", x: 62, y: 31, size: 210 },
    { id: "sc-analytics", label: "Analytics", x: 45, y: 18, size: 175 },
    { id: "sc-crm", label: "CRM", x: 55, y: 8, size: 310 },
    { id: "sc-erp", label: "ERP", x: 32, y: 5, size: 480 },
    { id: "sc-collab", label: "Collaboration", x: 68, y: 42, size: 155 },
    { id: "sc-devtools", label: "Dev Tools", x: 81, y: 38, size: 90 },
    { id: "sc-iot", label: "IoT Platform", x: 29, y: 47, size: 130 }
  ]
};

export function createSampleProject(type: ChartType): ChartProject {
  const data =
    type === "pie" ? structuredClone(samplePieData)
    : type === "marimekko" ? structuredClone(sampleMarimekkoData)
    : type === "sankey" ? structuredClone(sampleSankeyData)
    : type === "scatter" ? structuredClone(sampleScatterData)
    : structuredClone(sampleWaterfallData);

  const title =
    type === "pie" ? "Revenue Mix"
    : type === "marimekko" ? "Market Composition"
    : type === "sankey" ? "Revenue Flow"
    : type === "scatter" ? "Portfolio Analysis"
    : "Revenue Bridge";

  return {
    id: `project-${type}`,
    title,
    type,
    theme: defaultTheme,
    data,
    settings: defaultChartSettings(type),
    visualOverrides: {},
    annotations: []
  };
}
