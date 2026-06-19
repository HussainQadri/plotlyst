"use client";

import { AlertTriangle, Download, FileImage, LockKeyhole, Palette, Redo2, RefreshCcw, RotateCcw, Share2, SlidersHorizontal, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas } from "./ChartCanvas";
import { DataPanel } from "./DataPanel";
import { Inspector } from "./Inspector";
import { layoutWaterfall } from "@/lib/chartMath";
import { decodeExportEntitlementToken, exportDimensions, safeExportName, watermarkText, type ExportBackground, type ExportMode, type ExportScale, type ExportSettings } from "@/lib/export";
import { createSampleProject } from "@/lib/samples";
import { saveStoredProject, loadStoredProject } from "@/lib/storage";
import { themes } from "@/lib/themes";
import type { Annotation, ChartProject, ChartType, MarimekkoData, PieData, SelectableElement, VisualOverride, WaterfallData } from "@/lib/types";
import { validateProject } from "@/lib/validation";

const chartTypes: Array<{ id: ChartType; label: string }> = [
  { id: "pie", label: "Pie" },
  { id: "marimekko", label: "Marimekko" },
  { id: "waterfall", label: "Waterfall" }
];

const defaultExportSettings: ExportSettings = {
  mode: "draft",
  scale: 1,
  background: "theme",
  filename: ""
};

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
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectRef = useRef(project);
  const coalescingRef = useRef(false);
  const coalesceTimerRef = useRef<number | null>(null);
  const checkoutHandledRef = useRef(false);

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
    setHydrated(true);
  }, [initialProject]);

  useEffect(() => {
    if (hydrated) {
      saveStoredProject(project);
    }
  }, [hydrated, project]);

  useEffect(() => {
    fetch("/api/projects/capability")
      .then((response) => (response.ok ? response.json() as Promise<{ enabled?: boolean }> : { enabled: false }))
      .then((payload) => setShareEnabled(Boolean(payload.enabled)))
      .catch(() => setShareEnabled(false));
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

  const verifyCheckout = useCallback(async (sessionId: string) => {
    setExportBusy(true);
    setExportMessage("Verifying checkout...");

    try {
      const response = await fetch("/api/export/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const payload = (await response.json().catch(() => null)) as { token?: string } | null;
      if (!response.ok || !payload?.token) {
        setExportSettings((current) => ({ ...current, mode: "draft" }));
        setExportMessage("Checkout could not be verified. Draft export remains available.");
        return;
      }

      window.localStorage.setItem(exportTokenStorageKey, payload.token);
      setExportToken(payload.token);
      setExportSettings((current) => ({ ...current, mode: "clean" }));
      setExportMessage("Clean export unlocked for 24 hours.");
    } catch {
      setExportSettings((current) => ({ ...current, mode: "draft" }));
      setExportMessage("Checkout verification failed. Draft export remains available.");
    } finally {
      setExportBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || checkoutHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (!checkout) return;

    checkoutHandledRef.current = true;
    window.setTimeout(() => {
      setActiveRailTab("export");

      if (checkout === "success" && sessionId) {
        void verifyCheckout(sessionId);
      } else if (checkout === "cancelled") {
        setExportSettings((current) => ({ ...current, mode: "draft" }));
        setExportMessage("Checkout cancelled. Draft export remains available.");
      }
    }, 0);

    params.delete("checkout");
    params.delete("session_id");
    const nextSearch = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`);
  }, [hydrated, verifyCheckout]);

  function selectObject(id: string | null, options: { additive?: boolean } = {}) {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    setActiveRailTab("inspector");
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
  }

  function resetVisualEdits() {
    commitProject((current) => ({ ...current, visualOverrides: {}, annotations: current.annotations.map((annotation) => ({ ...annotation, labelOffset: undefined })) }));
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
    setActiveRailTab("inspector");
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "SELECT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (editing) return;

      const key = event.key;
      const mod = event.metaKey || event.ctrlKey;
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
      if (key.startsWith("Arrow")) {
        const amount = event.shiftKey ? 8 : 2;
        const dx = key === "ArrowLeft" ? -amount : key === "ArrowRight" ? amount : 0;
        const dy = key === "ArrowUp" ? -amount : key === "ArrowDown" ? amount : 0;
        if (nudgeSelection(dx, dy)) event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteAnnotation, deleteElement, nudgeSelection, redo, selectedAnnotation, selectedElement, selectedId, undo]);

  function updateExportSettings(next: Partial<ExportSettings>) {
    setExportSettings((current) => ({ ...current, ...next }));
    setActiveRailTab("export");
    setExportMessage(null);
  }

  function serializeSvg(settings = exportSettings): string | null {
    if (!svgRef.current) return null;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-export-hidden='true']").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
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

  async function exportSvg() {
    if (!(await canExport())) return;
    const svg = serializeSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "svg");
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
        if (blob) downloadBlob(blob, "png");
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };
    image.src = svgUrl;
  }

  async function canExport(): Promise<boolean> {
    if (!validation.valid) {
      setActiveRailTab("issues");
      return false;
    }

    if (exportSettings.mode === "draft") return true;

    setActiveRailTab("export");
    if (!exportToken || !cleanEntitlement) {
      setExportMessage("Clean export requires checkout. Draft export is still available.");
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
      setExportMessage("Clean export expired. Run checkout again to unlock it.");
      return false;
    } catch {
      setExportMessage("Could not authorize clean export. Draft export remains available.");
      return false;
    } finally {
      setExportBusy(false);
    }
  }

  async function startCheckout() {
    setActiveRailTab("export");
    setExportBusy(true);
    setExportMessage(null);

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        setExportMessage(payload?.error ?? "Checkout is not available.");
        return;
      }
      window.location.href = payload.url;
    } catch {
      setExportMessage("Checkout could not be started.");
    } finally {
      setExportBusy(false);
    }
  }

  async function shareProject() {
    setShareBusy(true);
    setShareMessage(null);
    setShareUrl(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project })
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        setShareMessage(payload?.error ?? "Share link could not be created.");
        return;
      }
      setShareUrl(payload.url);
      setShareMessage("Share link created.");
      await navigator.clipboard?.writeText(payload.url).catch(() => undefined);
    } catch {
      setShareMessage("Share link could not be created.");
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">P</div>
          <div>
            <p className="eyebrow">Plotlyst</p>
            <h1>Business chart editor</h1>
          </div>
        </div>

        <div className="toolbar">
          <div className="command-group document-fields">
            <label className="field compact">
              <span>Title</span>
              <input value={project.title} onChange={(event) => updateTitle(event.target.value)} />
            </label>

            <label className="field compact">
              <span>Theme</span>
              <select value={project.theme.id} onChange={(event) => updateTheme(event.target.value)}>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="command-group">
            <span className={validation.valid ? "status-chip ready" : "status-chip warning"}>
              {validation.valid ? "Ready" : `${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"}`}
            </span>
            <button className="icon-button" type="button" onClick={undo} title="Undo" disabled={history.past.length === 0}>
              <Undo2 size={18} />
            </button>
            <button className="icon-button" type="button" onClick={redo} title="Redo" disabled={history.future.length === 0}>
              <Redo2 size={18} />
            </button>
            <button className="icon-button" type="button" onClick={resetVisualEdits} title="Reset visual edits">
              <Palette size={18} />
            </button>
            <button className="icon-button" type="button" onClick={resetData} title="Reset chart">
              <RefreshCcw size={18} />
            </button>
          </div>

          <div className="command-group export-group">
            {shareEnabled ? (
              <button className="action-button ghost" type="button" onClick={shareProject} disabled={shareBusy}>
                <Share2 size={17} />
                {shareBusy ? "Saving" : "Share"}
              </button>
            ) : null}
            <button className="action-button ghost" type="button" onClick={exportSvg} disabled={exportBusy}>
              <Download size={17} />
              SVG
            </button>
            <button className="action-button" type="button" onClick={exportPng} disabled={exportBusy}>
              <FileImage size={17} />
              PNG
            </button>
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="segmented" aria-label="Chart type">
            {chartTypes.map((chart) => (
              <button
                key={chart.id}
                type="button"
                className={project.type === chart.id ? "active" : ""}
                onClick={() => switchChartType(chart.id)}
              >
                {chart.label}
              </button>
            ))}
          </div>

          <DataPanel
            project={project}
            setProject={commitProject}
            setSelectedId={(id) => {
              if (id) setActiveRailTab("inspector");
              setSelectedIds(id ? [id] : []);
            }}
          />
        </aside>

        <section className="canvas-zone">
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
        </section>

        <aside className="right-panel">
          <div className="rail-tabs" aria-label="Right rail">
            <button type="button" className={activeRailTab === "inspector" ? "active" : ""} onClick={() => setActiveRailTab("inspector")}>
              <SlidersHorizontal size={15} />
              Inspector
            </button>
            <button type="button" className={activeRailTab === "export" ? "active" : ""} onClick={() => setActiveRailTab("export")}>
              <Download size={15} />
              Export
            </button>
            <button type="button" className={activeRailTab === "issues" ? "active" : ""} onClick={() => setActiveRailTab("issues")}>
              <AlertTriangle size={15} />
              Issues
              {validation.errors.length > 0 ? <span>{validation.errors.length}</span> : null}
            </button>
          </div>

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
            <div className="panel-section export-settings-panel">
              <div className="section-title">
                <Download size={16} />
                Export
              </div>
              <div className="format-grid">
                <label className="field compact-field">
                  <span>Mode</span>
                  <select value={exportSettings.mode} onChange={(event) => updateExportSettings({ mode: event.target.value as ExportMode })}>
                    <option value="draft">Draft watermark</option>
                    <option value="clean">Clean</option>
                  </select>
                </label>
                <label className="field compact-field">
                  <span>Scale</span>
                  <select value={exportSettings.scale} onChange={(event) => updateExportSettings({ scale: Number(event.target.value) as ExportScale })}>
                    <option value={1}>1x - 1920px</option>
                    <option value={2}>2x - 3840px</option>
                    <option value={3}>3x - 5760px</option>
                  </select>
                </label>
                <label className="field compact-field">
                  <span>Background</span>
                  <select value={exportSettings.background} onChange={(event) => updateExportSettings({ background: event.target.value as ExportBackground })}>
                    <option value="theme">Theme</option>
                    <option value="transparent">Transparent</option>
                  </select>
                </label>
              </div>
              <label className="field compact-field">
                <span>Filename</span>
                <input value={exportSettings.filename} placeholder={safeExportName(project.title)} onChange={(event) => updateExportSettings({ filename: event.target.value })} />
              </label>
              {exportSettings.mode === "clean" && !cleanEntitlement ? (
                <button className="action-button full" type="button" onClick={startCheckout} disabled={exportBusy}>
                  <LockKeyhole size={16} />
                  {exportBusy ? "Starting checkout" : "Unlock clean export"}
                </button>
              ) : null}
              {cleanEntitlement ? <p className="quiet entitlement-note">Clean export unlocked until {new Date(cleanEntitlement.expiresAt).toLocaleString()}.</p> : null}
              <p className="quiet">{exportSettings.mode === "draft" ? "Draft exports include a small watermark." : "Clean exports require a valid checkout token."}</p>
              {exportMessage ? <p className="inline-alert">{exportMessage}</p> : null}
              {shareUrl ? (
                <p className="share-link">
                  <span>Share</span>
                  <a href={shareUrl}>{shareUrl}</a>
                </p>
              ) : null}
              {shareMessage ? <p className="quiet">{shareMessage}</p> : null}
            </div>
          ) : null}

          {activeRailTab === "issues" ? (
            <div className="panel-section">
              <div className="section-title">
                <RotateCcw size={16} />
                Issues
              </div>
              {validation.errors.length === 0 ? (
                <p className="quiet">Chart is ready to export.</p>
              ) : (
                <ul className="error-list">
                  {validation.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </aside>
      </section>
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
  label.setAttribute("font-weight", "850");
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
