"use client";

import { Download, FileImage, Palette, RefreshCcw, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas } from "./ChartCanvas";
import { DataPanel } from "./DataPanel";
import { Inspector } from "./Inspector";
import { layoutWaterfall } from "@/lib/chartMath";
import { createSampleProject } from "@/lib/samples";
import { saveStoredProject, loadStoredProject } from "@/lib/storage";
import { themes } from "@/lib/themes";
import type { ChartProject, ChartType, MarimekkoData, PieData, SelectableElement, VisualOverride, WaterfallData } from "@/lib/types";
import { validateProject } from "@/lib/validation";

const chartTypes: Array<{ id: ChartType; label: string }> = [
  { id: "pie", label: "Pie" },
  { id: "marimekko", label: "Marimekko" },
  { id: "waterfall", label: "Waterfall" }
];

export function ChartEditor() {
  const [project, setProject] = useState<ChartProject>(() => createSampleProject("pie"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const stored = loadStoredProject();
    if (stored) {
      // Restoring localStorage is intentionally client-only.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProject(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveStoredProject(project);
    }
  }, [hydrated, project]);

  const validation = useMemo(() => validateProject(project), [project]);

  const selectableElements = useMemo(() => getSelectableElements(project), [project]);
  const selectedElement = selectableElements.find((element) => element.id === selectedId) ?? null;

  function switchChartType(type: ChartType) {
    setProject(createSampleProject(type));
    setSelectedId(null);
  }

  function resetData() {
    setProject(createSampleProject(project.type));
    setSelectedId(null);
  }

  function resetVisualEdits() {
    setProject((current) => ({ ...current, visualOverrides: {} }));
  }

  function updateVisualOverride(id: string, next: Partial<VisualOverride>) {
    setProject((current) => ({
      ...current,
      visualOverrides: {
        ...current.visualOverrides,
        [id]: {
          ...(current.visualOverrides[id] ?? {}),
          ...next
        }
      }
    }));
  }

  function resetVisualOverride(id: string) {
    setProject((current) => {
      const visualOverrides = { ...current.visualOverrides };
      delete visualOverrides[id];
      return { ...current, visualOverrides };
    });
  }

  function addElementAfter(id: string) {
    setProject((current) => addChartElementAfter(current, id));
  }

  function deleteElement(id: string) {
    setProject((current) => deleteChartElement(current, id));
    setSelectedId(null);
  }

  function updateTitle(title: string) {
    setProject((current) => ({ ...current, title }));
  }

  function updateTheme(themeId: string) {
    const theme = themes.find((item) => item.id === themeId) ?? themes[0];
    setProject((current) => ({ ...current, theme }));
  }

  function serializeSvg(): string | null {
    if (!svgRef.current) return null;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-export-hidden='true']").forEach((node) => node.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1920");
    clone.setAttribute("height", "1080");
    return new XMLSerializer().serializeToString(clone);
  }

  function downloadBlob(blob: Blob, extension: string) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const safeTitle = project.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
    link.href = url;
    link.download = `${safeTitle}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportSvg() {
    const svg = serializeSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "svg");
  }

  function exportPng() {
    const svg = serializeSvg();
    if (!svg) return;

    const image = new Image();
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = project.theme.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, "png");
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };
    image.src = svgUrl;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">B</div>
          <div>
            <p className="eyebrow">BCharts</p>
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
            <button className="icon-button" type="button" onClick={resetVisualEdits} title="Reset visual edits">
              <Palette size={18} />
            </button>
            <button className="icon-button" type="button" onClick={resetData} title="Reset chart">
              <RefreshCcw size={18} />
            </button>
          </div>

          <div className="command-group export-group">
            <button className="action-button ghost" type="button" onClick={exportSvg} disabled={!validation.valid}>
              <Download size={17} />
              SVG
            </button>
            <button className="action-button" type="button" onClick={exportPng} disabled={!validation.valid}>
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

          <DataPanel project={project} setProject={setProject} setSelectedId={setSelectedId} />
        </aside>

        <section className="canvas-zone">
          <ChartCanvas
            ref={svgRef}
            project={project}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateOverride={updateVisualOverride}
            onResetOverride={resetVisualOverride}
            onAddElement={addElementAfter}
            onDeleteElement={deleteElement}
            validation={validation}
          />
        </section>

        <aside className="right-panel">
          <Inspector
            project={project}
            setProject={setProject}
            selectedElement={selectedElement}
            onClearSelection={() => setSelectedId(null)}
          />

          <div className="panel-section">
            <div className="section-title">
              <RotateCcw size={16} />
              Validation
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
        </aside>
      </section>
    </main>
  );
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

  if (project.type === "pie") {
    const data = project.data as PieData;
    return { ...project, visualOverrides, data: { rows: data.rows.filter((row) => row.id !== id) } };
  }

  if (project.type === "waterfall") {
    const data = project.data as WaterfallData;
    return { ...project, visualOverrides, data: { rows: data.rows.filter((row) => row.id !== id) } };
  }

  if (project.type === "marimekko") {
    const data = project.data as MarimekkoData;
    const segmentIndex = findMarimekkoSegmentIndex(data, id);
    if (segmentIndex === -1) return { ...project, visualOverrides };

    const removedIds = new Set(data.columns.flatMap((column) => column.segments[segmentIndex]?.id ?? []));
    const nextOverrides = Object.fromEntries(Object.entries(visualOverrides).filter(([overrideId]) => !removedIds.has(overrideId)));
    return {
      ...project,
      visualOverrides: nextOverrides,
      data: {
        columns: data.columns.map((column) => ({
          ...column,
          segments: column.segments.filter((_, index) => index !== segmentIndex)
        }))
      }
    };
  }

  return { ...project, visualOverrides };
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
