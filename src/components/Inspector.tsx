"use client";

import { Eye, EyeOff, MousePointer2, X } from "lucide-react";
import type { ChartProject, LabelPlacement, SelectableElement } from "@/lib/types";

type InspectorProps = {
  project: ChartProject;
  setProject: React.Dispatch<React.SetStateAction<ChartProject>>;
  selectedElement: SelectableElement | null;
  onClearSelection: () => void;
};

const placements: LabelPlacement[] = ["auto", "inside", "outside", "callout"];

export function Inspector({ project, setProject, selectedElement, onClearSelection }: InspectorProps) {
  if (!selectedElement) {
    return (
      <div className="panel-section empty-inspector">
        <div className="section-title">
          <MousePointer2 size={16} />
          Visual edit
        </div>
        <p className="quiet">Select a slice, segment, or bar on the canvas to edit its presentation.</p>
      </div>
    );
  }

  const override = project.visualOverrides[selectedElement.id] ?? {};
  const labelVisible = override.labelVisible ?? true;

  function updateOverride(next: Partial<typeof override>) {
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

      <button className="text-button" type="button" onClick={clearOverride}>
        Reset selected visual edits
      </button>
    </div>
  );
}
