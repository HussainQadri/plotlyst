"use client";

import {
  AlertTriangle,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  Columns3,
  Command,
  Download,
  FileImage,
  Frame,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Palette,
  Presentation,
  Redo2,
  RefreshCcw,
  Share2,
  SlidersHorizontal,
  Sun,
  Table2,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas } from "./ChartCanvas";
import { DataPanel } from "./DataPanel";
import { DatasheetModal } from "./DatasheetModal";
import { Inspector } from "./Inspector";
import { CommandPalette, type Command as PaletteCommand } from "./ui/CommandPalette";
import { Menu, type MenuItem } from "./ui/Menu";
import { ToastRegion, useToasts } from "./ui/Toaster";
import { applyAppearance, readStoredAppearance, type Appearance } from "@/lib/appearance";
import { layoutWaterfall } from "@/lib/chartMath";
import { ensureChartArtifactStyle } from "@/lib/chartStyles";
import { decodeExportEntitlementToken, exportDimensions, safeExportName, watermarkText, type ExportBackground, type ExportMode, type ExportScale, type ExportSettings } from "@/lib/export";
import { createSampleProject } from "@/lib/samples";
import { saveStoredProject, loadStoredProject } from "@/lib/storage";
import { themes } from "@/lib/themes";
import type { Annotation, ChartProject, ChartType, MarimekkoData, PieData, SelectableElement, VisualOverride, WaterfallData } from "@/lib/types";
import { validateProject } from "@/lib/validation";
import {
  defaultWorkspaceLayout,
  clampPanelWidth,
  loadWorkspaceLayout,
  panelBounds,
  saveWorkspaceLayout,
  type WorkspaceLayout
} from "@/lib/workspaceLayout";
import { fitZoom, formatZoom, slideFrameVars, stepZoom, type ZoomLevel } from "@/lib/zoom";

const chartTypes: Array<{ id: ChartType; label: string; description: string; icon: LucideIcon }> = [
  { id: "pie", label: "Pie", description: "Composition", icon: ChartPie },
  { id: "marimekko", label: "Marimekko", description: "Market map", icon: Columns3 },
  { id: "waterfall", label: "Waterfall", description: "Variance bridge", icon: ChartNoAxesColumnIncreasing }
];

const defaultExportSettings: ExportSettings = {
  mode: "draft",
  scale: 1,
  background: "theme",
  filename: ""
};

const railTabs: Array<{ id: RailTab; label: string; icon: LucideIcon }> = [
  { id: "inspector", label: "Inspector", icon: SlidersHorizontal },
  { id: "export", label: "Export", icon: Download },
  { id: "issues", label: "Issues", icon: AlertTriangle }
];

type RailTab = "inspector" | "export" | "issues";

const exportTokenStorageKey = "plotlyst.exportToken.v1";

export function ChartEditor({ initialProject }: { initialProject?: ChartProject }) {
  const [project, setProject] = useState<ChartProject>(() => initialProject ?? createSampleProject("pie"));
  const [history, setHistory] = useState<{ past: ChartProject[]; future: ChartProject[] }>({ past: [], future: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);
  const [hydrated, setHydrated] = useState(false);
  const [activeRailTab, setActiveRailTab] = useState<RailTab>("inspector");
  const [exportToken, setExportToken] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [layout, setLayout] = useState<WorkspaceLayout>(defaultWorkspaceLayout);
  const [resizing, setResizing] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>(fitZoom);
  const [datasheetOpen, setDatasheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectRef = useRef(project);
  const coalescingRef = useRef(false);
  const coalesceTimerRef = useRef<number | null>(null);
  const checkoutHandledRef = useRef(false);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const commitProject = useCallback((action: React.SetStateAction<ChartProject>, options: { coalesce?: boolean } = {}) => {
    setProject((current) => {
      const next = typeof action === "function" ? (action as (value: ChartProject) => ChartProject)(current) : action;
      if (Object.is(next, current)) return current;

      setHistory((state) => {
        if (options.coalesce && coalescingRef.current) return state;
        return {
          past: [...state.past.slice(-59), current],
          future: []
        };
      });

      if (options.coalesce) {
        coalescingRef.current = true;
        if (coalesceTimerRef.current) window.clearTimeout(coalesceTimerRef.current);
        coalesceTimerRef.current = window.setTimeout(() => {
          coalescingRef.current = false;
        }, 260);
      } else {
        coalescingRef.current = false;
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const stored = initialProject ? null : loadStoredProject();
    if (stored) {
      // Restoring localStorage is intentionally client-only.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProject(stored);
    }
    const storedToken = window.localStorage.getItem(exportTokenStorageKey);
    if (storedToken && decodeExportEntitlementToken(storedToken)) {
      setExportToken(storedToken);
    } else {
      window.localStorage.removeItem(exportTokenStorageKey);
    }
    setAppearance(readStoredAppearance());
    setLayout(loadWorkspaceLayout());
    setHydrated(true);
  }, [initialProject]);

  useEffect(() => {
    if (hydrated) {
      saveStoredProject(project);
    }
  }, [hydrated, project]);

  useEffect(() => {
    if (hydrated) {
      saveWorkspaceLayout(layout);
    }
  }, [hydrated, layout]);

  useEffect(() => {
    fetch("/api/projects/capability")
      .then((response) => (response.ok ? response.json() as Promise<{ enabled?: boolean }> : { enabled: false }))
      .then((payload) => setShareEnabled(Boolean(payload.enabled)))
      .catch(() => setShareEnabled(false));
  }, []);

  const toggleAppearance = useCallback(() => {
    setAppearance((current) => {
      const next: Appearance = current === "dark" ? "light" : "dark";
      applyAppearance(next);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      setProject(previous);
      setSelectedIds([]);
      return {
        past: state.past.slice(0, -1),
        future: [projectRef.current, ...state.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((state) => {
      const next = state.future[0];
      if (!next) return state;
      setProject(next);
      setSelectedIds([]);
      return {
        past: [...state.past, projectRef.current],
        future: state.future.slice(1)
      };
    });
  }, []);

  const validation = useMemo(() => validateProject(project), [project]);
  const cleanEntitlement = useMemo(() => (exportToken ? decodeExportEntitlementToken(exportToken) : null), [exportToken]);

  const selectableElements = useMemo(() => getSelectableElements(project), [project]);
  const selectedId = selectedIds.at(-1) ?? null;
  const selectedElements = selectableElements.filter((element) => selectedIds.includes(element.id));
  const selectedElement = selectableElements.find((element) => element.id === selectedId) ?? null;
  const selectedAnnotation = project.annotations.find((annotation) => annotation.id === selectedId) ?? null;
  const activeChartType = chartTypes.find((chart) => chart.id === project.type) ?? chartTypes[0];

  /** Selecting a rail tab must also reveal the rail it lives in. */
  const showRailTab = useCallback((tab: RailTab) => {
    setActiveRailTab(tab);
    setLayout((current) => (current.rightCollapsed ? { ...current, rightCollapsed: false } : current));
  }, []);

  const verifyCheckout = useCallback(async (sessionId: string) => {
    setExportBusy(true);
    pushToast("Verifying checkout…");

    try {
      const response = await fetch("/api/export/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const payload = (await response.json().catch(() => null)) as { token?: string } | null;
      if (!response.ok || !payload?.token) {
        setExportSettings((current) => ({ ...current, mode: "draft" }));
        pushToast("Checkout could not be verified. Draft export remains available.", "error");
        return;
      }

      window.localStorage.setItem(exportTokenStorageKey, payload.token);
      setExportToken(payload.token);
      setExportSettings((current) => ({ ...current, mode: "clean" }));
      pushToast("Clean export unlocked for 24 hours.", "success");
    } catch {
      setExportSettings((current) => ({ ...current, mode: "draft" }));
      pushToast("Checkout verification failed. Draft export remains available.", "error");
    } finally {
      setExportBusy(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!hydrated || checkoutHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (!checkout) return;

    checkoutHandledRef.current = true;
    window.setTimeout(() => {
      showRailTab("export");

      if (checkout === "success" && sessionId) {
        void verifyCheckout(sessionId);
      } else if (checkout === "cancelled") {
        setExportSettings((current) => ({ ...current, mode: "draft" }));
        pushToast("Checkout cancelled. Draft export remains available.");
      }
    }, 0);

    params.delete("checkout");
    params.delete("session_id");
    const nextSearch = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`);
  }, [hydrated, pushToast, showRailTab, verifyCheckout]);

  function selectObject(id: string | null, options: { additive?: boolean } = {}) {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    showRailTab("inspector");
    setSelectedIds((current) => {
      if (!options.additive) return [id];
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id];
    });
  }

  function switchChartType(type: ChartType) {
    commitProject(createSampleProject(type));
    setSelectedIds([]);
  }

  function resetData() {
    commitProject(createSampleProject(project.type));
    setSelectedIds([]);
    pushToast("Chart data reset to the sample set.");
  }

  function resetVisualEdits() {
    commitProject((current) => ({ ...current, visualOverrides: {}, annotations: current.annotations.map((annotation) => ({ ...annotation, labelOffset: undefined })) }));
    pushToast("Visual edits cleared.");
  }

  const updateVisualOverride = useCallback((id: string, next: Partial<VisualOverride>, options?: { coalesce?: boolean }) => {
    commitProject((current) => ({
      ...current,
      visualOverrides: {
        ...current.visualOverrides,
        [id]: {
          ...(current.visualOverrides[id] ?? {}),
          ...next
        }
      }
    }), options);
  }, [commitProject]);

  function resetVisualOverride(id: string) {
    commitProject((current) => {
      const visualOverrides = { ...current.visualOverrides };
      delete visualOverrides[id];
      return { ...current, visualOverrides };
    });
  }

  function addElementAfter(id: string) {
    commitProject((current) => addChartElementAfter(current, id));
  }

  const deleteElement = useCallback((id: string) => {
    commitProject((current) => deleteChartElement(current, id));
    setSelectedIds([]);
  }, [commitProject]);

  function addAnnotation(anchorId: string, type: Annotation["type"]) {
    const id = makeId("ann");
    commitProject((current) => ({
      ...current,
      annotations: [
        ...current.annotations,
        {
          id,
          type,
          anchorIds: [anchorId],
          label: type === "valueLine" ? "Value line" : "Callout",
          visible: true,
          style: { stroke: "#174f51", fill: "#fffcf6", dashed: type === "valueLine" }
        }
      ]
    }));
    setSelectedIds([id]);
    showRailTab("inspector");
  }

  const updateAnnotation = useCallback((id: string, next: Partial<Annotation>, options?: { coalesce?: boolean }) => {
    commitProject((current) => ({
      ...current,
      annotations: current.annotations.map((annotation) => (annotation.id === id ? { ...annotation, ...next } : annotation))
    }), options);
  }, [commitProject]);

  const deleteAnnotation = useCallback((id: string) => {
    commitProject((current) => ({ ...current, annotations: current.annotations.filter((annotation) => annotation.id !== id) }));
    setSelectedIds([]);
  }, [commitProject]);

  function updateTitle(title: string) {
    commitProject((current) => ({ ...current, title }));
  }

  function updateTheme(themeId: string) {
    const theme = themes.find((item) => item.id === themeId) ?? themes[0];
    commitProject((current) => ({ ...current, theme }));
  }

  const nudgeSelection = useCallback((dx: number, dy: number) => {
    const id = selectedId;
    if (!id) return false;
    const annotation = projectRef.current.annotations.find((item) => item.id === id);
    if (annotation) {
      const offset = annotation.labelOffset ?? { dx: 0, dy: 0 };
      updateAnnotation(id, { labelOffset: { dx: offset.dx + dx, dy: offset.dy + dy } }, { coalesce: true });
      return true;
    }
    const element = getSelectableElements(projectRef.current).find((item) => item.id === id);
    if (!element) return false;
    const offset = projectRef.current.visualOverrides[id]?.labelOffset ?? { dx: 0, dy: 0 };
    updateVisualOverride(id, { labelOffset: { dx: offset.dx + dx, dy: offset.dy + dy } }, { coalesce: true });
    return true;
  }, [selectedId, updateAnnotation, updateVisualOverride]);

  const toggleLeftPanel = useCallback(() => {
    setLayout((current) => ({ ...current, leftCollapsed: !current.leftCollapsed }));
  }, []);

  const toggleRightPanel = useCallback(() => {
    setLayout((current) => ({ ...current, rightCollapsed: !current.rightCollapsed }));
  }, []);

  /** Pointer drag on a panel edge. Widths are clamped and persisted. */
  function startPanelResize(side: "data" | "inspector", event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = side === "data" ? layout.dataWidth : layout.inspectorWidth;
    const bounds = side === "data" ? panelBounds.data : panelBounds.inspector;
    setResizing(true);

    function onMove(moveEvent: PointerEvent) {
      const delta = side === "data" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      const width = clampPanelWidth(startWidth + delta, bounds);
      setLayout((current) => (side === "data" ? { ...current, dataWidth: width } : { ...current, inspectorWidth: width }));
    }

    function onUp() {
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function resizePanelByKey(side: "data" | "inspector", event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowLeft" ? -16 : event.key === "ArrowRight" ? 16 : 0;
    if (step === 0) return;
    event.preventDefault();
    const bounds = side === "data" ? panelBounds.data : panelBounds.inspector;
    const delta = side === "data" ? step : -step;
    setLayout((current) =>
      side === "data"
        ? { ...current, dataWidth: clampPanelWidth(current.dataWidth + delta, bounds) }
        : { ...current, inspectorWidth: clampPanelWidth(current.inspectorWidth + delta, bounds) }
    );
  }

  function onRailTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = railTabs.findIndex((tab) => tab.id === activeRailTab);
    const next = railTabs[(index + offset + railTabs.length) % railTabs.length];
    setActiveRailTab(next.id);
    event.currentTarget.querySelector<HTMLElement>(`#rail-tab-${next.id}`)?.focus();
  }

  function updateExportSettings(next: Partial<ExportSettings>) {
    setExportSettings((current) => ({ ...current, ...next }));
    showRailTab("export");
  }

  function serializeSvg(settings = exportSettings): string | null {
    if (!svgRef.current) return null;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-export-hidden='true']").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // The artifact stylesheet has to travel with the file or every text element
    // loses its size, weight and halo once the document stylesheet is gone.
    ensureChartArtifactStyle(clone);
    const dimensions = exportDimensions(settings.scale);
    clone.setAttribute("width", String(dimensions.width));
    clone.setAttribute("height", String(dimensions.height));
    if (settings.background === "transparent") {
      clone.querySelector("rect")?.setAttribute("fill", "transparent");
    }
    if (settings.mode === "draft") {
      addDraftWatermark(clone, watermarkText(project.title));
    }
    return new XMLSerializer().serializeToString(clone);
  }

  function downloadBlob(blob: Blob, extension: string) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const safeTitle = safeExportName(exportSettings.filename || project.title);
    link.href = url;
    link.download = `${safeTitle}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function canExport(): Promise<boolean> {
    if (!validation.valid) {
      showRailTab("issues");
      pushToast(`Fix ${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"} before exporting.`, "error");
      return false;
    }

    if (exportSettings.mode === "draft") return true;

    showRailTab("export");
    if (!exportToken || !cleanEntitlement) {
      pushToast("Clean export requires checkout. Draft export is still available.", "error");
      return false;
    }

    setExportBusy(true);
    try {
      const response = await fetch("/api/export/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: exportToken })
      });

      if (response.ok) return true;

      window.localStorage.removeItem(exportTokenStorageKey);
      setExportToken(null);
      setExportSettings((current) => ({ ...current, mode: "draft" }));
      pushToast("Clean export expired. Run checkout again to unlock it.", "error");
      return false;
    } catch {
      pushToast("Could not authorize clean export. Draft export remains available.", "error");
      return false;
    } finally {
      setExportBusy(false);
    }
  }

  async function exportSvg() {
    if (!(await canExport())) return;
    const svg = serializeSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "svg");
    pushToast("SVG downloaded.", "success");
  }

  async function exportPng() {
    if (!(await canExport())) return;
    const svg = serializeSvg();
    if (!svg) return;

    const image = new Image();
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    image.onload = () => {
      const dimensions = exportDimensions(exportSettings.scale);
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      if (exportSettings.background === "theme") {
        context.fillStyle = project.theme.background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, "png");
          pushToast("PNG downloaded.", "success");
        }
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      pushToast("PNG could not be rendered.", "error");
    };
    image.src = svgUrl;
  }

  async function startCheckout() {
    showRailTab("export");
    setExportBusy(true);

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        pushToast(payload?.error ?? "Checkout is not available.", "error");
        return;
      }
      window.location.href = payload.url;
    } catch {
      pushToast("Checkout could not be started.", "error");
    } finally {
      setExportBusy(false);
    }
  }

  async function shareProject() {
    setShareBusy(true);
    setShareUrl(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project })
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        pushToast(payload?.error ?? "Share link could not be created.", "error");
        return;
      }
      setShareUrl(payload.url);
      showRailTab("export");
      await navigator.clipboard?.writeText(payload.url).catch(() => undefined);
      pushToast("Share link created and copied.", "success");
    } catch {
      pushToast("Share link could not be created.", "error");
    } finally {
      setShareBusy(false);
    }
  }


  /* Every chrome command in one searchable list. Built during render rather than
     memoized: the list is small, and the callbacks it closes over change with
     almost every state field anyway. */
  const commands: PaletteCommand[] = [
    ...chartTypes.map((chart) => ({
      id: `chart-${chart.id}`,
      group: "Chart type",
      label: `${chart.label} — ${chart.description}`,
      icon: chart.icon,
      keywords: chart.description,
      disabled: project.type === chart.id,
      run: () => switchChartType(chart.id)
    })),
    { id: "datasheet", group: "Data", label: "Open datasheet", icon: Table2, run: () => setDatasheetOpen(true) },
    { id: "reset-data", group: "Data", label: "Reset chart data", icon: RefreshCcw, run: resetData },
    { id: "reset-visual", group: "Data", label: "Reset visual edits", icon: Palette, run: resetVisualEdits },
    { id: "undo", group: "History", label: "Undo", icon: Undo2, hint: "⌘Z", disabled: history.past.length === 0, run: undo },
    { id: "redo", group: "History", label: "Redo", icon: Redo2, hint: "⇧⌘Z", disabled: history.future.length === 0, run: redo },
    { id: "export-svg", group: "Export", label: "Download SVG", icon: Download, run: () => void exportSvg() },
    { id: "export-png", group: "Export", label: "Download PNG", icon: FileImage, run: () => void exportPng() },
    { id: "export-settings", group: "Export", label: "Export settings", icon: SlidersHorizontal, run: () => showRailTab("export") },
    {
      id: "share",
      group: "Export",
      label: "Create share link",
      icon: Share2,
      disabled: !shareEnabled || shareBusy,
      run: () => void shareProject()
    },
    { id: "issues", group: "View", label: "Show issues", icon: AlertTriangle, run: () => showRailTab("issues") },
    { id: "inspector", group: "View", label: "Show inspector", icon: SlidersHorizontal, run: () => showRailTab("inspector") },
    {
      id: "toggle-left",
      group: "View",
      label: layout.leftCollapsed ? "Show data panel" : "Hide data panel",
      icon: PanelLeftClose,
      hint: "[",
      run: toggleLeftPanel
    },
    {
      id: "toggle-right",
      group: "View",
      label: layout.rightCollapsed ? "Show properties panel" : "Hide properties panel",
      icon: PanelRightClose,
      hint: "]",
      run: toggleRightPanel
    },
    { id: "zoom-fit", group: "View", label: "Zoom to fit", icon: Frame, hint: "0", run: () => setZoom(fitZoom) },
    { id: "zoom-100", group: "View", label: "Zoom to 100%", icon: Maximize2, run: () => setZoom(1) },
    {
      id: "appearance",
      group: "View",
      label: appearance === "dark" ? "Switch to light chrome" : "Switch to dark chrome",
      icon: appearance === "dark" ? Sun : Moon,
      run: toggleAppearance
    },
    ...themes.map((theme) => ({
      id: `theme-${theme.id}`,
      group: "Slide theme",
      label: theme.name,
      icon: Palette,
      keywords: "theme palette colours colors",
      disabled: project.theme.id === theme.id,
      run: () => updateTheme(theme.id)
    }))
  ];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "SELECT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const key = event.key;
      const mod = event.metaKey || event.ctrlKey;

      if (mod && key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }

      if (editing) return;

      if (mod && key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mod) return;

      if (key === "Escape") {
        setSelectedIds([]);
        return;
      }
      if ((key === "Delete" || key === "Backspace") && selectedId) {
        event.preventDefault();
        if (selectedAnnotation) deleteAnnotation(selectedId);
        else if (selectedElement) deleteElement(selectedId);
        return;
      }
      if (key === "[") {
        event.preventDefault();
        toggleLeftPanel();
        return;
      }
      if (key === "]") {
        event.preventDefault();
        toggleRightPanel();
        return;
      }
      if (key === "0") {
        event.preventDefault();
        setZoom(fitZoom);
        return;
      }
      if (key === "+" || key === "=") {
        event.preventDefault();
        setZoom((current) => stepZoom(current, 1));
        return;
      }
      if (key === "-") {
        event.preventDefault();
        setZoom((current) => stepZoom(current, -1));
        return;
      }
      if (key.startsWith("Arrow")) {
        const amount = event.shiftKey ? 8 : 2;
        const dx = key === "ArrowLeft" ? -amount : key === "ArrowRight" ? amount : 0;
        const dy = key === "ArrowUp" ? -amount : key === "ArrowDown" ? amount : 0;
        if (nudgeSelection(dx, dy)) event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteAnnotation, deleteElement, nudgeSelection, redo, selectedAnnotation, selectedElement, selectedId, toggleLeftPanel, toggleRightPanel, undo]);

  const overflowItems: MenuItem[] = [
    { kind: "heading", id: "h-data", label: "Data" },
    { id: "m-datasheet", label: "Open datasheet", icon: Table2, onSelect: () => setDatasheetOpen(true) },
    { id: "m-reset-visual", label: "Reset visual edits", icon: Palette, onSelect: resetVisualEdits },
    { id: "m-reset-data", label: "Reset chart data", icon: RefreshCcw, onSelect: resetData },
    { kind: "separator", id: "s-1" },
    { kind: "heading", id: "h-share", label: "Share" },
    {
      id: "m-share",
      label: shareBusy ? "Creating share link…" : "Create share link",
      icon: Share2,
      disabled: !shareEnabled || shareBusy,
      onSelect: () => void shareProject()
    },
    { id: "m-export-settings", label: "Export settings", icon: SlidersHorizontal, onSelect: () => showRailTab("export") }
  ];

  const issueCount = validation.errors.length;

  return (
    <main
      className="app-shell"
      data-left-collapsed={layout.leftCollapsed ? "true" : "false"}
      data-right-collapsed={layout.rightCollapsed ? "true" : "false"}
      data-resizing={resizing ? "true" : "false"}
      style={{
        ["--data-panel-w" as string]: `${layout.dataWidth}px`,
        ["--inspector-w" as string]: `${layout.inspectorWidth}px`
      }}
    >
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark" aria-hidden="true">
            <Presentation size={14} />
          </span>
          <h1 className="brand-wordmark">Plotlyst</h1>
        </div>

        <div className="topbar-doc">
          <input
            className="doc-title-input"
            value={project.title}
            aria-label="Document title"
            spellCheck={false}
            onChange={(event) => updateTitle(event.target.value)}
          />
          <label className="visually-hidden" htmlFor="slide-theme">
            Slide theme
          </label>
          <select
            id="slide-theme"
            className="doc-theme-select"
            value={project.theme.id}
            onChange={(event) => updateTheme(event.target.value)}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>

        <div className="topbar-actions">
          {validation.valid ? (
            <span className="status-chip ready">Ready</span>
          ) : (
            <button type="button" className="status-chip warning" onClick={() => showRailTab("issues")}>
              {issueCount} issue{issueCount === 1 ? "" : "s"}
            </button>
          )}

          <span className="bar-divider" aria-hidden="true" />

          <button
            className="icon-button has-tip tip-below"
            type="button"
            onClick={undo}
            aria-label="Undo"
            data-tip="Undo ⌘Z"
            disabled={history.past.length === 0}
          >
            <Undo2 size={15} aria-hidden="true" />
          </button>
          <button
            className="icon-button has-tip tip-below"
            type="button"
            onClick={redo}
            aria-label="Redo"
            data-tip="Redo ⇧⌘Z"
            disabled={history.future.length === 0}
          >
            <Redo2 size={15} aria-hidden="true" />
          </button>

          <Menu label="More commands" icon={MoreHorizontal} items={overflowItems} />

          <span className="bar-divider" aria-hidden="true" />

          <button
            className="icon-button has-tip tip-below"
            type="button"
            onClick={toggleAppearance}
            aria-label={appearance === "dark" ? "Use light chrome" : "Use dark chrome"}
            data-tip={appearance === "dark" ? "Light chrome" : "Dark chrome"}
          >
            {appearance === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          </button>

          <button className="palette-trigger" type="button" onClick={() => setPaletteOpen(true)}>
            <Command size={12} aria-hidden="true" />
            Commands
            <span className="kbd">⌘K</span>
          </button>

          <span className="bar-divider" aria-hidden="true" />

          <button className="action-button ghost" type="button" onClick={() => void exportSvg()} disabled={exportBusy}>
            <Download size={14} aria-hidden="true" />
            SVG
          </button>
          <button className="action-button" type="button" onClick={() => void exportPng()} disabled={exportBusy}>
            <FileImage size={14} aria-hidden="true" />
            PNG
          </button>
        </div>
      </header>

      <div className="workspace">
        <nav className="icon-rail" aria-label="Chart type and panels">
          {chartTypes.map((chart) => {
            const Icon = chart.icon;
            const active = project.type === chart.id;
            return (
              <button
                key={chart.id}
                type="button"
                className="rail-button has-tip"
                aria-label={`${chart.label} — ${chart.description}`}
                aria-pressed={active}
                data-tip={`${chart.label} · ${chart.description}`}
                onClick={() => switchChartType(chart.id)}
              >
                <Icon size={17} aria-hidden="true" />
              </button>
            );
          })}

          <span className="rail-divider" aria-hidden="true" />

          <button
            type="button"
            className="rail-button has-tip"
            aria-label="Open datasheet"
            data-tip="Datasheet"
            onClick={() => setDatasheetOpen(true)}
          >
            <Table2 size={17} aria-hidden="true" />
          </button>

          <span className="icon-rail-spacer" />

          <button
            type="button"
            className="rail-button has-tip"
            aria-label={layout.leftCollapsed ? "Show data panel" : "Hide data panel"}
            aria-pressed={!layout.leftCollapsed}
            data-tip={`${layout.leftCollapsed ? "Show" : "Hide"} data panel  [`}
            onClick={toggleLeftPanel}
          >
            <PanelLeftClose size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rail-button has-tip"
            aria-label={layout.rightCollapsed ? "Show properties panel" : "Hide properties panel"}
            aria-pressed={!layout.rightCollapsed}
            data-tip={`${layout.rightCollapsed ? "Show" : "Hide"} properties  ]`}
            onClick={toggleRightPanel}
          >
            <PanelRightClose size={16} aria-hidden="true" />
          </button>
        </nav>

        <aside className="side-panel data-panel-host" aria-label="Chart data">
          <div className="panel-head">
            <h2>{activeChartType.label} data</h2>
            <div className="panel-head-meta">
              <button
                className="table-icon has-tip tip-below-end"
                type="button"
                onClick={() => setDatasheetOpen(true)}
                aria-label="Open datasheet"
                data-tip="Datasheet"
              >
                <Table2 size={14} aria-hidden="true" />
              </button>
              <button
                className="table-icon panel-collapse"
                type="button"
                onClick={toggleLeftPanel}
                aria-label="Hide data panel"
              >
                <PanelLeftClose size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="panel-body">
            <DataPanel
              project={project}
              setProject={commitProject}
              setSelectedId={(id) => {
                if (id) showRailTab("inspector");
                setSelectedIds(id ? [id] : []);
              }}
            />
          </div>
          <button
            className="resize-handle"
            type="button"
            role="separator"
            aria-label="Resize data panel"
            aria-orientation="vertical"
            aria-valuenow={layout.dataWidth}
            aria-valuemin={panelBounds.data.min}
            aria-valuemax={panelBounds.data.max}
            onPointerDown={(event) => startPanelResize("data", event)}
            onKeyDown={(event) => resizePanelByKey("data", event)}
          />
        </aside>

        <section className="stage" aria-label="Slide">
          <div className="stage-header">
            <div className="stage-header-group">
              <span className="stage-label">
                <Presentation size={13} aria-hidden="true" />
                <strong>Slide 01</strong>
                <span className="dot" aria-hidden="true">
                  ·
                </span>
                {activeChartType.label}
              </span>
            </div>
            <div className="stage-header-group">
              <span className="stage-label">
                16:9
                <span className="dot" aria-hidden="true">
                  ·
                </span>
                960 × 540
              </span>
              <span className="bar-divider" aria-hidden="true" />
              <div className="zoom-cluster">
                <button
                  className="icon-button has-tip tip-below"
                  type="button"
                  aria-label="Zoom out"
                  data-tip="Zoom out  −"
                  onClick={() => setZoom((current) => stepZoom(current, -1))}
                >
                  <ZoomOut size={14} aria-hidden="true" />
                </button>
                <button
                  className="zoom-value"
                  type="button"
                  aria-label={`Zoom: ${formatZoom(zoom)}. Reset to 100%`}
                  onClick={() => setZoom((current) => (current === 1 ? fitZoom : 1))}
                >
                  {formatZoom(zoom)}
                </button>
                <button
                  className="icon-button has-tip tip-below"
                  type="button"
                  aria-label="Zoom in"
                  data-tip="Zoom in  +"
                  onClick={() => setZoom((current) => stepZoom(current, 1))}
                >
                  <ZoomIn size={14} aria-hidden="true" />
                </button>
                <button
                  className="icon-button has-tip tip-below-end"
                  type="button"
                  aria-label="Zoom to fit"
                  aria-pressed={zoom === fitZoom}
                  data-tip="Fit  0"
                  onClick={() => setZoom(fitZoom)}
                >
                  <Frame size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div className="stage-scroll" style={slideFrameVars(zoom) as React.CSSProperties}>
            <ChartCanvas
              ref={svgRef}
              project={project}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={selectObject}
              onUpdateOverride={updateVisualOverride}
              onResetOverride={resetVisualOverride}
              onAddElement={addElementAfter}
              onDeleteElement={deleteElement}
              onUpdateAnnotation={updateAnnotation}
              onDeleteAnnotation={deleteAnnotation}
              validation={validation}
            />
          </div>
        </section>

        <aside className="side-panel inspector-host" aria-label="Properties">
          <div className="panel-head">
            <h2>Properties</h2>
            <div className="panel-head-meta">
              <span className="status-chip plain">
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Chart"}
              </span>
              <button
                className="table-icon panel-collapse"
                type="button"
                onClick={toggleRightPanel}
                aria-label="Hide properties panel"
              >
                <PanelRightClose size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="rail-panel">
            <div className="tab-strip" role="tablist" aria-label="Properties sections" onKeyDown={onRailTabKeyDown}>
              {railTabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeRailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`rail-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`rail-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveRailTab(tab.id)}
                  >
                    <Icon size={13} aria-hidden="true" />
                    {tab.label}
                    {tab.id === "issues" && issueCount > 0 ? <span className="count-badge">{issueCount}</span> : null}
                  </button>
                );
              })}
            </div>

            <div className="rail-body" id={`rail-panel-${activeRailTab}`} role="tabpanel" aria-labelledby={`rail-tab-${activeRailTab}`} tabIndex={-1}>
              {activeRailTab === "inspector" ? (
                <Inspector
                  project={project}
                  setProject={commitProject}
                  selectedElement={selectedElement}
                  selectedElements={selectedElements}
                  selectedAnnotation={selectedAnnotation}
                  onClearSelection={() => setSelectedIds([])}
                  onAddAnnotation={addAnnotation}
                  onUpdateAnnotation={updateAnnotation}
                  onDeleteAnnotation={deleteAnnotation}
                />
              ) : null}

              {activeRailTab === "export" ? (
                <div className="panel-section">
                  <div className="section-title">
                    <Download size={13} aria-hidden="true" />
                    Output
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Mode</span>
                      <select value={exportSettings.mode} onChange={(event) => updateExportSettings({ mode: event.target.value as ExportMode })}>
                        <option value="draft">Draft watermark</option>
                        <option value="clean">Clean</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Scale</span>
                      <select value={exportSettings.scale} onChange={(event) => updateExportSettings({ scale: Number(event.target.value) as ExportScale })}>
                        <option value={1}>1x · 1920px</option>
                        <option value={2}>2x · 3840px</option>
                        <option value={3}>3x · 5760px</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Background</span>
                      <select value={exportSettings.background} onChange={(event) => updateExportSettings({ background: event.target.value as ExportBackground })}>
                        <option value="theme">Theme</option>
                        <option value="transparent">Transparent</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Filename</span>
                      <input value={exportSettings.filename} placeholder={safeExportName(project.title)} onChange={(event) => updateExportSettings({ filename: event.target.value })} />
                    </label>
                  </div>

                  <p className="quiet">
                    {exportSettings.mode === "draft"
                      ? "Draft exports carry a small watermark."
                      : "Clean exports require a valid checkout token."}
                  </p>

                  {exportSettings.mode === "clean" && !cleanEntitlement ? (
                    <button className="action-button full" type="button" onClick={startCheckout} disabled={exportBusy}>
                      <LockKeyhole size={14} aria-hidden="true" />
                      {exportBusy ? "Starting checkout…" : "Unlock clean export"}
                    </button>
                  ) : null}

                  {cleanEntitlement ? (
                    <p className="quiet">Clean export unlocked until {new Date(cleanEntitlement.expiresAt).toLocaleString()}.</p>
                  ) : null}

                  <div className="settings-block">
                    <div className="subsection-label">Download</div>
                    <div className="button-row">
                      <button className="action-button ghost full" type="button" onClick={() => void exportSvg()} disabled={exportBusy}>
                        <Download size={14} aria-hidden="true" />
                        SVG
                      </button>
                      <button className="action-button full" type="button" onClick={() => void exportPng()} disabled={exportBusy}>
                        <FileImage size={14} aria-hidden="true" />
                        PNG
                      </button>
                    </div>
                  </div>

                  {shareEnabled ? (
                    <div className="settings-block">
                      <div className="subsection-label">Share</div>
                      <button className="action-button ghost full" type="button" onClick={() => void shareProject()} disabled={shareBusy}>
                        <Share2 size={14} aria-hidden="true" />
                        {shareBusy ? "Creating link…" : "Create share link"}
                      </button>
                      {shareUrl ? (
                        <p className="share-link">
                          <span>Link</span>
                          <a href={shareUrl}>{shareUrl}</a>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeRailTab === "issues" ? (
                <div className="panel-section">
                  <div className="section-title">
                    <AlertTriangle size={13} aria-hidden="true" />
                    Validation
                  </div>
                  {issueCount === 0 ? (
                    <div className="empty-state">
                      <span className="status-chip ready">Ready to export</span>
                      <p className="quiet">No validation problems in the current chart.</p>
                    </div>
                  ) : (
                    <ul className="error-list">
                      {validation.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <button
            className="resize-handle"
            type="button"
            role="separator"
            aria-label="Resize properties panel"
            aria-orientation="vertical"
            aria-valuenow={layout.inspectorWidth}
            aria-valuemin={panelBounds.inspector.min}
            aria-valuemax={panelBounds.inspector.max}
            onPointerDown={(event) => startPanelResize("inspector", event)}
            onKeyDown={(event) => resizePanelByKey("inspector", event)}
          />
        </aside>
      </div>

      {datasheetOpen ? (
        <DatasheetModal
          project={project}
          setProject={commitProject}
          setSelectedId={(id) => setSelectedIds(id ? [id] : [])}
          onClose={() => setDatasheetOpen(false)}
        />
      ) : null}

      {paletteOpen ? <CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} /> : null}
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

function addDraftWatermark(svg: SVGSVGElement, text: string) {
  const namespace = "http://www.w3.org/2000/svg";
  const group = document.createElementNS(namespace, "g");
  const background = document.createElementNS(namespace, "rect");
  const label = document.createElementNS(namespace, "text");

  group.setAttribute("opacity", "0.78");
  background.setAttribute("x", "704");
  background.setAttribute("y", "492");
  background.setAttribute("width", "192");
  background.setAttribute("height", "26");
  background.setAttribute("rx", "6");
  background.setAttribute("fill", "#fffcf6");
  background.setAttribute("stroke", "#cfc8bd");
  label.setAttribute("x", "800");
  label.setAttribute("y", "510");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("fill", "#696d73");
  label.setAttribute("font-size", "11");
  label.setAttribute("font-weight", "600");
  label.textContent = text;

  group.append(background, label);
  svg.append(group);
}

function addChartElementAfter(project: ChartProject, id: string): ChartProject {
  if (project.type === "pie") {
    const data = project.data as PieData;
    const index = Math.max(0, data.rows.findIndex((row) => row.id === id));
    const nextRows = [...data.rows];
    nextRows.splice(index + 1, 0, { id: makeId("pie"), label: "New slice", value: 10 });
    return { ...project, data: { rows: nextRows } };
  }

  if (project.type === "waterfall") {
    const data = project.data as WaterfallData;
    const index = Math.max(0, data.rows.findIndex((row) => row.id === id));
    const nextRows = [...data.rows];
    nextRows.splice(index + 1, 0, { id: makeId("wf"), label: "New change", amount: 10, kind: "change" });
    return { ...project, data: { rows: nextRows } };
  }

  if (project.type === "marimekko") {
    const data = project.data as MarimekkoData;
    const segmentIndex = findMarimekkoSegmentIndex(data, id);
    const insertIndex = segmentIndex === -1 ? maxSegmentCount(data) : segmentIndex + 1;
    const label = `Segment ${maxSegmentCount(data) + 1}`;
    return {
      ...project,
      data: {
        columns: data.columns.map((column) => {
          const segments = [...column.segments];
          segments.splice(insertIndex, 0, { id: makeId("mekko-seg"), label, value: 10 });
          return { ...column, segments };
        })
      }
    };
  }

  return project;
}

function deleteChartElement(project: ChartProject, id: string): ChartProject {
  const visualOverrides = { ...project.visualOverrides };
  delete visualOverrides[id];
  const annotations = project.annotations.filter((annotation) => !annotation.anchorIds.includes(id));

  if (project.type === "pie") {
    const data = project.data as PieData;
    return { ...project, visualOverrides, annotations, data: { rows: data.rows.filter((row) => row.id !== id) } };
  }

  if (project.type === "waterfall") {
    const data = project.data as WaterfallData;
    return { ...project, visualOverrides, annotations, data: { rows: data.rows.filter((row) => row.id !== id) } };
  }

  if (project.type === "marimekko") {
    const data = project.data as MarimekkoData;
    const segmentIndex = findMarimekkoSegmentIndex(data, id);
    if (segmentIndex === -1) return { ...project, visualOverrides, annotations };

    const removedIds = new Set(data.columns.flatMap((column) => column.segments[segmentIndex]?.id ?? []));
    const nextOverrides = Object.fromEntries(Object.entries(visualOverrides).filter(([overrideId]) => !removedIds.has(overrideId)));
    const nextAnnotations = project.annotations.filter((annotation) => !annotation.anchorIds.some((anchorId) => removedIds.has(anchorId)));
    return {
      ...project,
      visualOverrides: nextOverrides,
      annotations: nextAnnotations,
      data: {
        columns: data.columns.map((column) => ({
          ...column,
          segments: column.segments.filter((_, index) => index !== segmentIndex)
        }))
      }
    };
  }

  return { ...project, visualOverrides, annotations };
}

function findMarimekkoSegmentIndex(data: MarimekkoData, id: string): number {
  for (const column of data.columns) {
    const index = column.segments.findIndex((segment) => segment.id === id);
    if (index !== -1) return index;
  }
  return -1;
}

function maxSegmentCount(data: MarimekkoData): number {
  return Math.max(0, ...data.columns.map((column) => column.segments.length));
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function getSelectableElements(project: ChartProject): SelectableElement[] {
  if (project.type === "pie") {
    const data = project.data as PieData;
    return data.rows.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      kind: "slice"
    }));
  }

  if (project.type === "marimekko" && "columns" in project.data) {
    return project.data.columns.flatMap((column) =>
      column.segments.map((segment) => ({
        id: segment.id,
        label: `${column.label} / ${segment.label}`,
        value: segment.value,
        kind: "segment" as const
      }))
    );
  }

  if (project.type === "waterfall") {
    const data = project.data as WaterfallData;
    const bars = layoutWaterfall(data, project.theme.palette, project.visualOverrides, 720, 320, project.settings.waterfall);
    return bars.map((bar) => ({
      id: bar.id,
      label: bar.label,
      value: bar.displayValue,
      kind: "bar"
    }));
  }

  return [];
}
