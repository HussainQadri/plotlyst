"use client";

import { Columns3, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  isCalculatedWaterfallKind,
  normalizeWaterfallKind,
  parseMarimekkoMatrix,
  parsePieSheet,
  parseWaterfallSheet
} from "@/lib/datasheet";
import type {
  ChartProject,
  MarimekkoColumn,
  MarimekkoData,
  PieData,
  WaterfallData,
  WaterfallKind
} from "@/lib/types";

type DatasheetModalProps = {
  project: ChartProject;
  setProject: React.Dispatch<React.SetStateAction<ChartProject>>;
  setSelectedId: (id: string | null) => void;
  onClose: () => void;
};

type CellPosition = {
  row: number;
  col: number;
};

export function DatasheetModal({ project, setProject, setSelectedId, onClose }: DatasheetModalProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="datasheet-overlay" role="presentation" onMouseDown={onClose}>
      <section className="datasheet-dialog" role="dialog" aria-modal="true" aria-label={`${project.type} datasheet`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="datasheet-header">
          <div>
            <p className="eyebrow">Datasheet</p>
            <h2>{datasheetTitle(project)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close datasheet">
            <X size={18} />
          </button>
        </header>

        {project.type === "pie" && "rows" in project.data ? (
          <PieDatasheet project={project} setProject={setProject} setSelectedId={setSelectedId} />
        ) : null}
        {project.type === "waterfall" && "rows" in project.data ? (
          <WaterfallDatasheet project={project} setProject={setProject} setSelectedId={setSelectedId} />
        ) : null}
        {project.type === "marimekko" && "columns" in project.data ? (
          <MarimekkoDatasheet project={project} setProject={setProject} setSelectedId={setSelectedId} />
        ) : null}
      </section>
    </div>
  );
}

function PieDatasheet({ project, setProject, setSelectedId }: Omit<DatasheetModalProps, "onClose">) {
  const data = project.data as PieData;

  function updateRow(id: string, field: "label" | "value", value: string) {
    setProject((current) => ({
      ...current,
      data: {
        rows: (current.data as PieData).rows.map((row) =>
          row.id === id ? { ...row, [field]: field === "value" ? Number(value) : value } : row
        )
      }
    }));
  }

  function addRow() {
    const id = makeId("pie");
    setProject((current) => ({
      ...current,
      data: { rows: [...(current.data as PieData).rows, { id, label: "New slice", value: 10 }] }
    }));
    setSelectedId(id);
  }

  function removeRow(id: string) {
    setProject((current) => ({
      ...current,
      visualOverrides: omitOverrides(current.visualOverrides, [id]),
      data: { rows: (current.data as PieData).rows.filter((row) => row.id !== id) }
    }));
    setSelectedId(null);
  }

  function pasteSheet(text: string) {
    const parsed = parsePieSheet(text, makeId);
    if (!parsed) return;
    setProject((current) => ({ ...current, data: parsed, visualOverrides: {} }));
    setSelectedId(null);
  }

  return (
    <>
      <div className="datasheet-toolbar">
        <span className="status-chip">{data.rows.length} rows</span>
        <button className="action-button" type="button" onClick={addRow}>
          <Plus size={16} />
          Row
        </button>
      </div>
      <div className="sheet-grid-wrap">
        <table className="sheet-table" onPaste={(event) => handleSheetPaste(event, pasteSheet)}>
          <thead>
            <tr>
              <th className="sheet-index" />
              <th>Label</th>
              <th>Value</th>
              <th className="sheet-action-col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <th className="sheet-index">{rowIndex + 1}</th>
                <td>
                  <SheetInput
                    value={row.label}
                    position={{ row: rowIndex, col: 0 }}
                    onFocus={() => setSelectedId(row.id)}
                    onChange={(value) => updateRow(row.id, "label", value)}
                  />
                </td>
                <td>
                  <SheetInput
                    type="number"
                    value={row.value}
                    position={{ row: rowIndex, col: 1 }}
                    onFocus={() => setSelectedId(row.id)}
                    onChange={(value) => updateRow(row.id, "value", value)}
                  />
                </td>
                <td>
                  <button className="table-icon" type="button" onClick={() => removeRow(row.id)} title="Delete row">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function WaterfallDatasheet({ project, setProject, setSelectedId }: Omit<DatasheetModalProps, "onClose">) {
  const data = project.data as WaterfallData;

  function updateRow(id: string, field: "label" | "amount" | "kind", value: string) {
    setProject((current) => ({
      ...current,
      data: {
        rows: (current.data as WaterfallData).rows.map((row) => {
          if (row.id !== id) return row;
          if (field === "amount") return { ...row, amount: Number(value) };
          if (field === "kind") {
            const kind = normalizeWaterfallKind(value) ?? "change";
            return { ...row, kind, amount: isCalculatedWaterfallKind(kind) ? 0 : row.amount };
          }
          return { ...row, label: value };
        })
      }
    }));
  }

  function addRow(kind: WaterfallKind = "change") {
    const id = makeId("wf");
    setProject((current) => ({
      ...current,
      data: {
        rows: [
          ...(current.data as WaterfallData).rows,
          { id, label: kind === "subtotal" ? "Subtotal" : "New change", amount: kind === "subtotal" ? 0 : 10, kind }
        ]
      }
    }));
    setSelectedId(id);
  }

  function removeRow(id: string) {
    setProject((current) => ({
      ...current,
      visualOverrides: omitOverrides(current.visualOverrides, [id]),
      data: { rows: (current.data as WaterfallData).rows.filter((row) => row.id !== id) }
    }));
    setSelectedId(null);
  }

  function pasteSheet(text: string) {
    const parsed = parseWaterfallSheet(text, makeId);
    if (!parsed) return;
    setProject((current) => ({ ...current, data: parsed, visualOverrides: {} }));
    setSelectedId(null);
  }

  return (
    <>
      <div className="datasheet-toolbar">
        <span className="status-chip">{data.rows.length} rows</span>
        <button className="action-button" type="button" onClick={() => addRow("change")}>
          <Plus size={16} />
          Row
        </button>
        <button className="action-button ghost" type="button" onClick={() => addRow("subtotal")}>
          <Plus size={16} />
          Subtotal
        </button>
      </div>
      <div className="sheet-grid-wrap">
        <table className="sheet-table" onPaste={(event) => handleSheetPaste(event, pasteSheet)}>
          <thead>
            <tr>
              <th className="sheet-index" />
              <th>Label</th>
              <th>Amount</th>
              <th>Kind</th>
              <th className="sheet-action-col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => {
              const amountLocked = isCalculatedWaterfallKind(row.kind) && project.settings.waterfall.totalLabelMode !== "amount";
              return (
                <tr key={row.id}>
                  <th className="sheet-index">{rowIndex + 1}</th>
                  <td>
                    <SheetInput
                      value={row.label}
                      position={{ row: rowIndex, col: 0 }}
                      onFocus={() => setSelectedId(row.id)}
                      onChange={(value) => updateRow(row.id, "label", value)}
                    />
                  </td>
                  <td>
                    <SheetInput
                      type="number"
                      value={row.amount}
                      disabled={amountLocked}
                      position={{ row: rowIndex, col: 1 }}
                      onFocus={() => setSelectedId(row.id)}
                      onChange={(value) => updateRow(row.id, "amount", value)}
                    />
                  </td>
                  <td>
                    <select
                      data-sheet-cell={`${rowIndex}:2`}
                      value={row.kind}
                      onFocus={() => setSelectedId(row.id)}
                      onKeyDown={(event) => handleSheetKeyDown(event, { row: rowIndex, col: 2 })}
                      onChange={(event) => updateRow(row.id, "kind", event.target.value)}
                    >
                      <option value="start">Start</option>
                      <option value="change">Change</option>
                      <option value="subtotal">Subtotal</option>
                      <option value="total">Total</option>
                    </select>
                  </td>
                  <td>
                    <button className="table-icon" type="button" onClick={() => removeRow(row.id)} title="Delete row">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MarimekkoDatasheet({ project, setProject, setSelectedId }: Omit<DatasheetModalProps, "onClose">) {
  const data = project.data as MarimekkoData;
  const segmentCount = Math.max(0, ...data.columns.map((column) => column.segments.length));
  const segmentLabels = useMemo(
    () => Array.from({ length: segmentCount }, (_, index) => firstSegmentLabel(data, index)),
    [data, segmentCount]
  );

  function updateColumnLabel(columnId: string, label: string) {
    setProject((current) => ({
      ...current,
      data: {
        columns: (current.data as MarimekkoData).columns.map((column) => (column.id === columnId ? { ...column, label } : column))
      }
    }));
  }

  function updateSegmentLabel(segmentIndex: number, label: string) {
    setProject((current) => ({
      ...current,
      data: {
        columns: (current.data as MarimekkoData).columns.map((column) => ({
          ...column,
          segments: column.segments.map((segment, index) => (index === segmentIndex ? { ...segment, label } : segment))
        }))
      }
    }));
  }

  function updateSegmentValue(columnId: string, segmentIndex: number, value: string) {
    setProject((current) => ({
      ...current,
      data: {
        columns: (current.data as MarimekkoData).columns.map((column) => {
          if (column.id !== columnId) return column;
          return {
            ...column,
            segments: column.segments.map((segment, index) =>
              index === segmentIndex ? { ...segment, value: Number(value) } : segment
            )
          };
        })
      }
    }));
  }

  function addColumn() {
    setProject((current) => {
      const currentData = current.data as MarimekkoData;
      const column: MarimekkoColumn = {
        id: makeId("mekko-col"),
        label: "New market",
        segments: segmentLabels.map((label) => ({ id: makeId("mekko-seg"), label, value: 10 }))
      };
      return { ...current, data: { columns: [...currentData.columns, column] } };
    });
  }

  function removeColumn(columnId: string) {
    setProject((current) => {
      const currentData = current.data as MarimekkoData;
      const removedIds = currentData.columns.find((column) => column.id === columnId)?.segments.map((segment) => segment.id) ?? [];
      return {
        ...current,
        visualOverrides: omitOverrides(current.visualOverrides, removedIds),
        data: { columns: currentData.columns.filter((column) => column.id !== columnId) }
      };
    });
    setSelectedId(null);
  }

  function addSegment() {
    const label = `Segment ${segmentCount + 1}`;
    setProject((current) => ({
      ...current,
      data: {
        columns: (current.data as MarimekkoData).columns.map((column) => ({
          ...column,
          segments: [...column.segments, { id: makeId("mekko-seg"), label, value: 10 }]
        }))
      }
    }));
  }

  function removeSegment(segmentIndex: number) {
    setProject((current) => {
      const currentData = current.data as MarimekkoData;
      const removedIds = currentData.columns.flatMap((column) => column.segments[segmentIndex]?.id ?? []);
      return {
        ...current,
        visualOverrides: omitOverrides(current.visualOverrides, removedIds),
        data: {
          columns: currentData.columns.map((column) => ({
            ...column,
            segments: column.segments.filter((_, index) => index !== segmentIndex)
          }))
        }
      };
    });
    setSelectedId(null);
  }

  function pasteSheet(text: string) {
    const parsed = parseMarimekkoMatrix(text, makeId);
    if (!parsed) return;
    setProject((current) => ({ ...current, data: parsed, visualOverrides: {} }));
    setSelectedId(null);
  }

  return (
    <>
      <div className="datasheet-toolbar">
        <span className="status-chip">{data.columns.length} columns</span>
        <span className="status-chip">{segmentCount} segments</span>
        <button className="action-button" type="button" onClick={addColumn}>
          <Columns3 size={16} />
          Column
        </button>
        <button className="action-button ghost" type="button" onClick={addSegment}>
          <Plus size={16} />
          Segment
        </button>
      </div>
      <div className="sheet-grid-wrap">
        <table className="sheet-table mekko-sheet" onPaste={(event) => handleSheetPaste(event, pasteSheet)}>
          <thead>
            <tr>
              <th className="sheet-index">Segment</th>
              {data.columns.map((column, columnIndex) => (
                <th key={column.id}>
                  <div className="sheet-header-cell">
                    <SheetInput
                      value={column.label}
                      position={{ row: 0, col: columnIndex + 1 }}
                      onChange={(value) => updateColumnLabel(column.id, value)}
                    />
                    <button className="table-icon" type="button" onClick={() => removeColumn(column.id)} title="Delete column">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="sheet-action-col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {segmentLabels.map((label, segmentIndex) => (
              <tr key={`${label}-${segmentIndex}`}>
                <th className="sheet-row-label">
                  <SheetInput
                    value={label}
                    position={{ row: segmentIndex + 1, col: 0 }}
                    onChange={(value) => updateSegmentLabel(segmentIndex, value)}
                  />
                </th>
                {data.columns.map((column, columnIndex) => {
                  const segment = column.segments[segmentIndex];
                  return (
                    <td key={`${column.id}-${segment?.id ?? segmentIndex}`}>
                      <SheetInput
                        type="number"
                        value={segment?.value ?? 0}
                        position={{ row: segmentIndex + 1, col: columnIndex + 1 }}
                        onFocus={() => {
                          if (segment) setSelectedId(segment.id);
                        }}
                        onChange={(value) => updateSegmentValue(column.id, segmentIndex, value)}
                      />
                    </td>
                  );
                })}
                <td>
                  <button className="table-icon" type="button" onClick={() => removeSegment(segmentIndex)} title="Delete segment">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SheetInput({
  value,
  type = "text",
  disabled,
  position,
  onFocus,
  onChange
}: {
  value: string | number;
  type?: "text" | "number";
  disabled?: boolean;
  position: CellPosition;
  onFocus?: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <input
      data-sheet-cell={`${position.row}:${position.col}`}
      type={type}
      disabled={disabled}
      value={value}
      onFocus={onFocus}
      onKeyDown={(event) => handleSheetKeyDown(event, position)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function handleSheetPaste(event: React.ClipboardEvent, callback: (text: string) => void) {
  const text = event.clipboardData.getData("text");
  if (!text.includes("\t") && !text.includes(",") && !text.includes("\n")) return;
  event.preventDefault();
  callback(text);
}

function handleSheetKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, position: CellPosition) {
  if (event.key !== "Tab" && event.key !== "Enter") return;
  event.preventDefault();

  const direction = event.shiftKey ? -1 : 1;
  const colDelta = event.key === "Tab" ? direction : 0;
  const rowDelta = event.key === "Enter" ? direction : 0;
  const dialog = event.currentTarget.closest(".datasheet-dialog");
  if (!dialog) return;

  const next = findFocusableCell(dialog, { row: position.row + rowDelta, col: position.col + colDelta }, direction);
  next?.focus();
}

function findFocusableCell(root: Element, position: CellPosition, direction: number): HTMLInputElement | HTMLSelectElement | null {
  let row = position.row;
  let col = position.col;
  for (let attempts = 0; attempts < 120; attempts += 1) {
    const cell = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-sheet-cell="${row}:${col}"]:not(:disabled)`);
    if (cell) return cell;
    col += direction;
    if (col < 0) {
      row -= 1;
      col = 80;
    }
    if (col > 80) {
      row += 1;
      col = 0;
    }
    if (row < 0) return null;
  }
  return null;
}

function omitOverrides(overrides: ChartProject["visualOverrides"], ids: string[]) {
  const removed = new Set(ids);
  return Object.fromEntries(Object.entries(overrides).filter(([id]) => !removed.has(id)));
}

function firstSegmentLabel(data: MarimekkoData, segmentIndex: number): string {
  return data.columns.find((column) => column.segments[segmentIndex])?.segments[segmentIndex]?.label ?? `Segment ${segmentIndex + 1}`;
}

function datasheetTitle(project: ChartProject): string {
  if (project.type === "pie") return "Pie data";
  if (project.type === "marimekko") return "Marimekko matrix";
  return "Waterfall bridge";
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}
