import type { ChartTheme } from "./types";

export const themes: ChartTheme[] = [
  {
    id: "boardroom",
    name: "Boardroom",
    background: "#f7f3ec",
    foreground: "#171717",
    muted: "#68625a",
    grid: "#d8d0c4",
    palette: ["#2f6f73", "#d84c36", "#f0b84d", "#5f5aa2", "#61a36f", "#9a6a42", "#3c7fb1", "#c65785"]
  },
  {
    id: "mono",
    name: "Annual Report",
    background: "#f8faf7",
    foreground: "#111827",
    muted: "#60656f",
    grid: "#d9ded5",
    palette: ["#1f4f5f", "#c94c4c", "#d5a021", "#3b7a57", "#756bb1", "#6d5a4a", "#5a8bb0", "#b05a7b"]
  },
  {
    id: "clear",
    name: "Clear Deck",
    background: "#ffffff",
    foreground: "#101828",
    muted: "#667085",
    grid: "#d0d5dd",
    palette: ["#277da1", "#f3722c", "#43aa8b", "#f9c74f", "#577590", "#f94144", "#90be6d", "#9b5de5"]
  }
];

export const defaultTheme = themes[0];
