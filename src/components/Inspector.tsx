"use client";

import { Eye, EyeOff, MousePointer2, Settings2, X } from "lucide-react";
import type {
  Annotation,
  ChartProject,
  LabelContentField,
  LabelPlacement,
  LabelSeparator,
  MekkoMode,
  MekkoSegmentOrder,
  NegativeStyle,
  NumberScale,
  SelectableElement,
  VisualOverride,
  WaterfallBuildMode,
  WaterfallConnectorStyle,
  WaterfallTotalLabelMode
} from "@/lib/types";

type InspectorProps = {
  project: ChartProject;
  setProject: React.Dispatch<React.SetStateAction<ChartProject>>;
  selectedElement: SelectableElement | null;
  selectedElements: SelectableElement[];
  selectedAnnotation: Annotation | null;
  onClearSelection: () => void;
  onAddAnnotation: (anchorId: string, type: Annotation["type"]) => void;
  onUpdateAnnotation: (id: string, next: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
};

const placements: LabelPlacement[] = ["auto", "inside", "outside", "callout"];
const labelFields: Array<{ id: LabelContentField; label: string }> = [
  { id: "label", label: "Name" },
  { id: "value", label: "Value" },
  { id: "percent", label: "Percent" }
];
const separators: Array<{ id: LabelSeparator; label: string }> = [
  { id: "space", label: "Space" },
  { id: "slash", label: "Slash" },
  { id: "newline", label: "New line" }
];
const scales: Array<{ id: NumberScale; label: string }> = [
  { id: "none", label: "None" },
  { id: "thousands", label: "Thousands" },
  { id: "millions", label: "Millions" }
];
const negativeStyles: Array<{ id: NegativeStyle; label: string }> = [
  { id: "minus", label: "Minus" },
  { id: "parentheses", label: "Parentheses" }
];
const connectorStyles: Array<{ id: WaterfallConnectorStyle; label: string }> = [
  { id: "dashed", label: "Dashed" },
  { id: "solid", label: "Solid" },
  { id: "none", label: "None" }
];
const buildModes: Array<{ id: WaterfallBuildMode; label: string }> = [
  { id: "buildUp", label: "Build up" },
  { id: "buildDown", label: "Build down" }
];
const totalLabelModes: Array<{ id: WaterfallTotalLabelMode; label: string }> = [
  { id: "calculated", label: "Calculated" },
  { id: "amount", label: "Row amount" }
];
const mekkoModes: Array<{ id: MekkoMode; label: string }> = [
  { id: "absolute", label: "Absolute" },
  { id: "percent", label: "Percent" }
];
const mekkoOrders: Array<{ id: MekkoSegmentOrder; label: string }> = [
  { id: "sheet", label: "Sheet" },
  { id: "reverse", label: "Reverse" },
  { id: "ascending", label: "Ascending" },
  { id: "descending", label: "Descending" }
];

export function Inspector({ project, setProject, selectedElement, selectedElements, selectedAnnotation, onClearSelection, onAddAnnotation, onUpdateAnnotation, onDeleteAnnotation }: InspectorProps) {
  function updateChartSettings(settings: Partial<ChartProject["settings"]>) {
    setProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...settings
      }
    }));
  }

  function updateLabelContent(next: Partial<ChartProject["settings"]["labelContent"]>) {
    setProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        labelContent: {
          ...current.settings.labelContent,
          ...next
        }
      }
    }));
  }

  function updateValueFormat(next: Partial<ChartProject["settings"]["labelContent"]["valueFormat"]>) {
    setProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        labelContent: {
          ...current.settings.labelContent,
          valueFormat: {
            ...current.settings.labelContent.valueFormat,
            ...next
          }
        }
      }
    }));
  }

  function updateWaterfallSettings(next: Partial<ChartProject["settings"]["waterfall"]>) {
    setProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        waterfall: {
          ...current.settings.waterfall,
          ...next
        }
      }
    }));
  }

  function updateMekkoSettings(next: Partial<ChartProject["settings"]["mekko"]>) {
    setProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        mekko: {
          ...current.settings.mekko,
          ...next
        }
      }
    }));
  }

  function toggleLabelField(field: LabelContentField) {
    const current = project.settings.labelContent.fields;
    const fields = current.includes(field) ? current.filter((item) => item !== field) : [...current, field];
    updateLabelContent({ fields });
  }

  if (selectedElements.length > 1) {
    const firstOverride = project.visualOverrides[selectedElements[0].id] ?? {};
    const placement = firstOverride.labelPlacement ?? "auto";

    function updateBulk(next: Partial<VisualOverride>) {
      setProject((current) => ({
        ...current,
        visualOverrides: selectedElements.reduce(
          (overrides, element) => ({
            ...overrides,
            [element.id]: {
              ...(overrides[element.id] ?? {}),
              ...next
            }
          }),
          { ...current.visualOverrides }
        )
      }));
    }

    function clearBulk() {
      setProject((current) => {
        const visualOverrides = { ...current.visualOverrides };
        selectedElements.forEach((element) => delete visualOverrides[element.id]);
        return { ...current, visualOverrides };
      });
    }

    return (
      <div className="panel-section inspector">
        <div className="section-title split">
          <span>
            <MousePointer2 size={16} />
            Bulk edit
          </span>
          <button className="table-icon" type="button" onClick={onClearSelection} title="Clear selection">
            <X size={15} />
          </button>
        </div>

        <div className="selected-summary">
          <small>Chart / {project.type === "marimekko" ? "Marimekko" : project.type === "waterfall" ? "Waterfall" : "Pie"}</small>
          <span className="pill">{selectedElements.length} marks</span>
          <strong>{selectedElements.map((element) => element.label).join(", ")}</strong>
          <small>Bulk color, label visibility, and placement</small>
        </div>

        <label className="field">
          <span>Color</span>
          <input className="color-input" type="color" value={firstOverride.fill ?? "#2f6f73"} onChange={(event) => updateBulk({ fill: event.target.value })} />
        </label>

        <label className="field">
          <span>Label placement</span>
          <select value={placement} onChange={(event) => updateBulk({ labelPlacement: event.target.value as LabelPlacement })}>
            {placements.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button className="action-button ghost full" type="button" onClick={() => updateBulk({ labelVisible: false })}>
          <EyeOff size={16} />
          Hide labels
        </button>
        <button className="action-button ghost full" type="button" onClick={() => updateBulk({ labelVisible: true })}>
          <Eye size={16} />
          Show labels
        </button>
        <button className="action-button ghost full" type="button" onClick={() => updateBulk({ labelOffset: undefined })}>
          Align labels
        </button>
        <button className="text-button" type="button" onClick={clearBulk}>
          Reset bulk visual edits
        </button>
      </div>
    );
  }

  if (selectedAnnotation) {
    const annotation = selectedAnnotation;
    const labelMoved = Boolean(annotation.labelOffset && (annotation.labelOffset.dx !== 0 || annotation.labelOffset.dy !== 0));
    const stroke = annotation.style?.stroke ?? "#174f51";
    const dashed = annotation.style?.dashed ?? annotation.type === "valueLine";

    function updateAnnotation(next: Partial<Annotation>) {
      onUpdateAnnotation(annotation.id, next);
    }

    function updateAnnotationStyle(next: NonNullable<Annotation["style"]>) {
      updateAnnotation({ style: { ...(annotation.style ?? {}), ...next } });
    }

    return (
      <div className="panel-section inspector">
        <div className="section-title split">
          <span>
            <MousePointer2 size={16} />
            Annotation
          </span>
          <button className="table-icon" type="button" onClick={onClearSelection} title="Clear selection">
            <X size={15} />
          </button>
        </div>

        <div className="selected-summary">
          <small>{annotationBreadcrumb(project)}</small>
          <span className="pill">{annotation.type}</span>
          <strong>{annotation.label || "Annotation"}</strong>
          <small>Anchored to {annotation.anchorIds[0]}</small>
        </div>

        <label className="field">
          <span>Annotation label</span>
          <input value={annotation.label ?? ""} onChange={(event) => updateAnnotation({ label: event.target.value })} />
        </label>

        <label className="field">
          <span>Line color</span>
          <input className="color-input" type="color" value={stroke} onChange={(event) => updateAnnotationStyle({ stroke: event.target.value })} />
        </label>

        <button className="action-button ghost full" type="button" onClick={() => updateAnnotation({ visible: !annotation.visible })}>
          {annotation.visible ? <EyeOff size={16} /> : <Eye size={16} />}
          {annotation.visible ? "Hide annotation" : "Show annotation"}
        </button>

        <button className="action-button ghost full" type="button" onClick={() => updateAnnotationStyle({ dashed: !dashed })}>
          {dashed ? "Solid line" : "Dashed line"}
        </button>

        <button className="action-button ghost full" type="button" onClick={() => updateAnnotation({ labelOffset: undefined })} disabled={!labelMoved}>
          Align annotation
        </button>

        <button className="text-button danger" type="button" onClick={() => onDeleteAnnotation(annotation.id)}>
          Delete annotation
        </button>
      </div>
    );
  }

  if (!selectedElement) {
    const labelContent = project.settings.labelContent;
    const valueFormat = labelContent.valueFormat;

    return (
      <div className="panel-section chart-settings">
        <div className="section-title">
          <Settings2 size={16} />
          Chart settings
        </div>
        <ToggleRow
          label="Title"
          checked={project.settings.showTitle}
          onChange={() => updateChartSettings({ showTitle: !project.settings.showTitle })}
        />
        <ToggleRow
          label="Labels"
          checked={project.settings.showLabels}
          onChange={() => updateChartSettings({ showLabels: !project.settings.showLabels })}
        />
        <ToggleRow
          label="Legend"
          checked={project.settings.showLegend}
          onChange={() => updateChartSettings({ showLegend: !project.settings.showLegend })}
        />

        <div className="settings-block">
          <div className="subsection-label">Label content</div>
          <div className="toggle-stack">
            {labelFields.map((field) => (
              <ToggleRow
                key={field.id}
                label={field.label}
                checked={labelContent.fields.includes(field.id)}
                onChange={() => toggleLabelField(field.id)}
              />
            ))}
          </div>
          <label className="field compact-field">
            <span>Separator</span>
            <select
              value={labelContent.separator}
              onChange={(event) => updateLabelContent({ separator: event.target.value as LabelSeparator })}
            >
              {separators.map((separator) => (
                <option key={separator.id} value={separator.id}>
                  {separator.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="settings-block">
          <div className="subsection-label">Number format</div>
          <div className="format-grid">
            <label className="field compact-field">
              <span>Decimals</span>
              <input
                type="number"
                min="0"
                max="3"
                value={valueFormat.decimals}
                onChange={(event) => updateValueFormat({ decimals: Number(event.target.value) })}
              />
            </label>
            <label className="field compact-field">
              <span>Scale</span>
              <select value={valueFormat.scale} onChange={(event) => updateValueFormat({ scale: event.target.value as NumberScale })}>
                {scales.map((scale) => (
                  <option key={scale.id} value={scale.id}>
                    {scale.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>Prefix</span>
              <input value={valueFormat.prefix} onChange={(event) => updateValueFormat({ prefix: event.target.value })} />
            </label>
            <label className="field compact-field">
              <span>Suffix</span>
              <input value={valueFormat.suffix} onChange={(event) => updateValueFormat({ suffix: event.target.value })} />
            </label>
            <label className="field compact-field">
              <span>Percent dp</span>
              <input
                type="number"
                min="0"
                max="2"
                value={labelContent.percentDecimals}
                onChange={(event) => updateLabelContent({ percentDecimals: Number(event.target.value) })}
              />
            </label>
            <label className="field compact-field">
              <span>Negative</span>
              <select
                value={valueFormat.negativeStyle}
                onChange={(event) => updateValueFormat({ negativeStyle: event.target.value as NegativeStyle })}
              >
                {negativeStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ToggleRow label="Plus on changes" checked={valueFormat.showPlus} onChange={() => updateValueFormat({ showPlus: !valueFormat.showPlus })} />
        </div>

        {project.type === "waterfall" ? (
          <div className="settings-block">
            <div className="subsection-label">Waterfall</div>
            <ToggleRow
              label="Connectors"
              checked={project.settings.waterfall.showConnectors}
              onChange={() => updateWaterfallSettings({ showConnectors: !project.settings.waterfall.showConnectors })}
            />
            <div className="format-grid">
              <label className="field compact-field">
                <span>Connector</span>
                <select
                  value={project.settings.waterfall.connectorStyle}
                  onChange={(event) => updateWaterfallSettings({ connectorStyle: event.target.value as WaterfallConnectorStyle })}
                >
                  {connectorStyles.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span>Direction</span>
                <select
                  value={project.settings.waterfall.buildMode}
                  onChange={(event) => updateWaterfallSettings({ buildMode: event.target.value as WaterfallBuildMode })}
                >
                  {buildModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span>Total labels</span>
                <select
                  value={project.settings.waterfall.totalLabelMode}
                  onChange={(event) => updateWaterfallSettings({ totalLabelMode: event.target.value as WaterfallTotalLabelMode })}
                >
                  {totalLabelModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ToggleRow
              label="Baseline"
              checked={project.settings.waterfall.forceBaseline}
              onChange={() => updateWaterfallSettings({ forceBaseline: !project.settings.waterfall.forceBaseline })}
            />
          </div>
        ) : null}

        {project.type === "marimekko" ? (
          <div className="settings-block">
            <div className="subsection-label">Mekko</div>
            <div className="format-grid">
              <label className="field compact-field">
                <span>Mode</span>
                <select value={project.settings.mekko.mode} onChange={(event) => updateMekkoSettings({ mode: event.target.value as MekkoMode })}>
                  {mekkoModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span>Order</span>
                <select value={project.settings.mekko.segmentOrder} onChange={(event) => updateMekkoSettings({ segmentOrder: event.target.value as MekkoSegmentOrder })}>
                  {mekkoOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span>Other below</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={Math.round((project.settings.mekko.otherThreshold ?? 0) * 100)}
                  onChange={(event) => updateMekkoSettings({ otherThreshold: Math.max(0, Number(event.target.value)) / 100 || undefined })}
                />
              </label>
            </div>
            <ToggleRow
              label="Column totals"
              checked={project.settings.mekko.showColumnTotals}
              onChange={() => updateMekkoSettings({ showColumnTotals: !project.settings.mekko.showColumnTotals })}
            />
            <ToggleRow
              label="Column %"
              checked={project.settings.mekko.showColumnPercentages}
              onChange={() => updateMekkoSettings({ showColumnPercentages: !project.settings.mekko.showColumnPercentages })}
            />
            <ToggleRow
              label="Segment %"
              checked={project.settings.mekko.showSegmentPercentages}
              onChange={() => updateMekkoSettings({ showSegmentPercentages: !project.settings.mekko.showSegmentPercentages })}
            />
            <ToggleRow
              label="Axis"
              checked={project.settings.mekko.showAxis}
              onChange={() => updateMekkoSettings({ showAxis: !project.settings.mekko.showAxis })}
            />
            <ToggleRow
              label="Ticks"
              checked={project.settings.mekko.showTicks}
              onChange={() => updateMekkoSettings({ showTicks: !project.settings.mekko.showTicks })}
            />
            <ToggleRow
              label="Ridge"
              checked={project.settings.mekko.showRidge}
              onChange={() => updateMekkoSettings({ showRidge: !project.settings.mekko.showRidge })}
            />
          </div>
        ) : null}

        <p className="quiet selection-note">Select a chart object to edit its custom label, color, placement, and position.</p>
      </div>
    );
  }

  const override = project.visualOverrides[selectedElement.id] ?? {};
  const labelVisible = override.labelVisible ?? true;
  const labelMoved = Boolean(override.labelOffset && (override.labelOffset.dx !== 0 || override.labelOffset.dy !== 0));

  function updateOverride(next: Partial<VisualOverride>) {
    if (!selectedElement) return;
    setProject((current) => ({
      ...current,
      visualOverrides: {
        ...current.visualOverrides,
        [selectedElement.id]: {
          ...(current.visualOverrides[selectedElement.id] ?? {}),
          ...next
        }
      }
    }));
  }

  function clearOverride() {
    if (!selectedElement) return;
    setProject((current) => {
      const visualOverrides = { ...current.visualOverrides };
      delete visualOverrides[selectedElement.id];
      return { ...current, visualOverrides };
    });
  }

  return (
    <div className="panel-section inspector">
      <div className="section-title split">
        <span>
          <MousePointer2 size={16} />
          Visual edit
        </span>
        <button className="table-icon" type="button" onClick={onClearSelection} title="Clear selection">
          <X size={15} />
        </button>
      </div>

      <div className="selected-summary">
        <small>{elementBreadcrumb(project, selectedElement)}</small>
        <span className="pill">{selectedElement.kind}</span>
        <strong>{selectedElement.label}</strong>
        <small>Value: {selectedElement.value}</small>
      </div>

      <label className="field">
        <span>Display label</span>
        <input
          value={override.label ?? ""}
          placeholder={selectedElement.label}
          onChange={(event) => updateOverride({ label: event.target.value })}
        />
      </label>

      <label className="field">
        <span>Color</span>
        <input
          className="color-input"
          type="color"
          value={override.fill ?? "#2f6f73"}
          onChange={(event) => updateOverride({ fill: event.target.value })}
        />
      </label>

      <label className="field">
        <span>Label placement</span>
        <select
          value={override.labelPlacement ?? "auto"}
          onChange={(event) => updateOverride({ labelPlacement: event.target.value as LabelPlacement })}
        >
          {placements.map((placement) => (
            <option key={placement} value={placement}>
              {placement}
            </option>
          ))}
        </select>
      </label>

      <button className="action-button ghost full" type="button" onClick={() => updateOverride({ labelVisible: !labelVisible })}>
        {labelVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        {labelVisible ? "Hide label" : "Show label"}
      </button>

      <button className="action-button ghost full" type="button" onClick={() => updateOverride({ labelOffset: undefined })} disabled={!labelMoved}>
        Align label
      </button>

      <div className="settings-block annotation-actions">
        <div className="subsection-label">Annotations</div>
        <button className="action-button ghost full" type="button" onClick={() => onAddAnnotation(selectedElement.id, "callout")}>
          Add callout
        </button>
        <button
          className="action-button ghost full"
          type="button"
          onClick={() => onAddAnnotation(selectedElement.id, "valueLine")}
          disabled={selectedElement.kind === "slice"}
        >
          Add value line
        </button>
      </div>

      <button className="text-button" type="button" onClick={clearOverride}>
        Reset selected visual edits
      </button>
    </div>
  );
}

function elementBreadcrumb(project: ChartProject, element: SelectableElement): string {
  const type = project.type === "pie" ? "Pie" : project.type === "waterfall" ? "Waterfall" : "Marimekko";
  return `Chart / ${type} / ${element.label}`;
}

function annotationBreadcrumb(project: ChartProject): string {
  const type = project.type === "pie" ? "Pie" : project.type === "waterfall" ? "Waterfall" : "Marimekko";
  return `Chart / ${type} / Annotation`;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button className="toggle-row" type="button" onClick={onChange} aria-pressed={checked}>
      <span>{label}</span>
      <span className={checked ? "toggle-pill on" : "toggle-pill"}>{checked ? "On" : "Off"}</span>
    </button>
  );
}
