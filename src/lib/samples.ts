import { defaultTheme } from "./themes";
import { defaultChartSettings } from "./labels";
import type { ChartProject, ChartType, MarimekkoData, PieData, WaterfallData } from "./types";

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

export function createSampleProject(type: ChartType): ChartProject {
  return {
    id: `project-${type}`,
    title:
      type === "pie"
        ? "Revenue Mix"
        : type === "marimekko"
          ? "Market Composition"
          : "Revenue Bridge",
    type,
    theme: defaultTheme,
    data:
      type === "pie"
        ? structuredClone(samplePieData)
        : type === "marimekko"
          ? structuredClone(sampleMarimekkoData)
          : structuredClone(sampleWaterfallData),
    settings: defaultChartSettings(type),
    visualOverrides: {},
    annotations: []
  };
}
