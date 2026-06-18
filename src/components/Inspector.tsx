"use client";

import { Eye, EyeOff, MousePointer2, Settings2, X } from "lucide-react";
import type {
  ChartProject,
  LabelContentField,
  LabelPlacement,
  LabelSeparator,
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
  onClearSelection: () => void;
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

export function Inspector({ project, setProject, selectedElement, onClearSelection }: InspectorProps) {
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

  function toggleLabelField(field: LabelContentField) {
    const current = project.settings.labelContent.fields;
    const fields = current.includes(field) ? current.filter((item) => item !== field) : [...current, field];
    updateLabelContent({ fields });
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

      <button className="text-button" type="button" onClick={clearOverride}>
        Reset selected visual edits
      </button>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button className="toggle-row" type="button" onClick={onChange} aria-pressed={checked}>
      <span>{label}</span>
      <span className={checked ? "toggle-pill on" : "toggle-pill"}>{checked ? "On" : "Off"}</span>
    </button>
  );
}
