"use client";

import { Plus, Trash2 } from "lucide-react";
import { parseDelimited, toNumber } from "@/lib/csv";
import type {
  ChartProject,
  MarimekkoColumn,
  MarimekkoData,
  PieData,
  WaterfallData,
  WaterfallKind
} from "@/lib/types";

type DataPanelProps = {
  project: ChartProject;
  setProject: React.Dispatch<React.SetStateAction<ChartProject>>;
  setSelectedId: (id: string | null) => void;
};

export function DataPanel({ project, setProject, setSelectedId }: DataPanelProps) {
  return (
    <div className="panel-section data-panel">
      <div className="section-title">Data</div>
      <p className="hint">Paste rows from a spreadsheet into the table.</p>
      {project.type === "pie" && "rows" in project.data ? (
        <PieDataEditor project={project} setProject={setProject} setSelectedId={setSelectedId} />
      ) : null}
      {project.type === "marimekko" && "columns" in project.data ? (
        <MarimekkoDataEditor project={project} setProject={setProject} setSelectedId={setSelectedId} />
      ) : null}
      {project.type === "waterfall" && "rows" in project.data ? (
        <WaterfallDataEditor project={project} setProject={setProject} setSelectedId={setSelectedId} />
      ) : null}
    </div>
  );
}

function PieDataEditor({ project, setProject, setSelectedId }: DataPanelProps) {
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
    setProject((current) => {
      const visualOverrides = { ...current.visualOverrides };
      delete visualOverrides[id];
      return {
        ...current,
        visualOverrides,
        data: { rows: (current.data as PieData).rows.filter((row) => row.id !== id) }
      };
    });
    setSelectedId(null);
  }

  function pasteRows(text: string) {
    const rows = parseDelimited(text);
    if (rows.length === 0) return;

    setProject((current) => ({
      ...current,
      data: {
        rows: rows.map((row, index) => ({
          id: makeId(`pie-${index}`),
          label: row[0] || `Slice ${index + 1}`,
          value: toNumber(row[1] ?? "0")
        }))
      },
      visualOverrides: {}
    }));
    setSelectedId(null);
  }

  return (
    <>
      <table className="data-table" onPaste={(event) => handlePaste(event, pasteRows)}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.id} className={project.visualOverrides[row.id] ? "has-override" : ""}>
              <td>
                <input
                  value={row.label}
                  onFocus={() => setSelectedId(row.id)}
                  onChange={(event) => updateRow(row.id, "label", event.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.value}
                  onFocus={() => setSelectedId(row.id)}
                  onChange={(event) => updateRow(row.id, "value", event.target.value)}
                />
              </td>
              <td>
                <button className="table-icon" type="button" onClick={() => removeRow(row.id)} title="Remove row">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="action-button full" type="button" onClick={addRow}>
        <Plus size={16} />
        Add slice
      </button>
    </>
  );
}

function MarimekkoDataEditor({ project, setProject, setSelectedId }: DataPanelProps) {
  const data = project.data as MarimekkoData;
  const segmentCount = Math.max(0, ...data.columns.map((column) => column.segments.length));
  const segmentLabels = Array.from({ length: segmentCount }, (_, index) => firstSegmentLabel(data, index));

  function updateColumnLabel(columnId: string, label: string) {
    setProject((current) => ({
      ...current,
      data: {
        columns: (current.data as MarimekkoData).columns.map((column) =>
          column.id === columnId ? { ...column, label } : column
        )
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

  function removeColumn(columnId: string) {
    setProject((current) => {
      const currentData = current.data as MarimekkoData;
      const removedIds = new Set(
        currentData.columns.find((column) => column.id === columnId)?.segments.map((segment) => segment.id) ?? []
      );
      return {
        ...current,
        visualOverrides: Object.fromEntries(Object.entries(current.visualOverrides).filter(([id]) => !removedIds.has(id))),
        data: { columns: currentData.columns.filter((column) => column.id !== columnId) }
      };
    });
    setSelectedId(null);
  }

  function removeSegment(segmentIndex: number) {
    setProject((current) => {
      const currentData = current.data as MarimekkoData;
      const removedIds = new Set(currentData.columns.flatMap((column) => column.segments[segmentIndex]?.id ?? []));
      return {
        ...current,
        visualOverrides: Object.fromEntries(Object.entries(current.visualOverrides).filter(([id]) => !removedIds.has(id))),
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

  function pasteMatrix(text: string) {
    const rows = parseDelimited(text);
    if (rows.length < 2) return;

    const hasHeader = rows[0][0] === "" || /segment|category/i.test(rows[0][0]);
    const headers = hasHeader ? rows[0].slice(1) : rows[0].slice(1).map((_, index) => `Column ${index + 1}`);
    const body = hasHeader ? rows.slice(1) : rows;

    const columns: MarimekkoColumn[] = headers.map((header, columnIndex) => ({
      id: makeId(`mekko-col-${columnIndex}`),
      label: header || `Column ${columnIndex + 1}`,
      segments: body.map((row, rowIndex) => ({
        id: makeId(`mekko-seg-${columnIndex}-${rowIndex}`),
        label: row[0] || `Segment ${rowIndex + 1}`,
        value: toNumber(row[columnIndex + 1] ?? "0")
      }))
    }));

    setProject((current) => ({ ...current, data: { columns }, visualOverrides: {} }));
    setSelectedId(null);
  }

  return (
    <>
      <div className="mekko-manager" onPaste={(event) => handlePaste(event, pasteMatrix)}>
        {data.columns.map((column, columnIndex) => (
          <details className="mekko-card" key={column.id} open>
            <summary>
              <span>Column {columnIndex + 1}</span>
              <strong>{column.label}</strong>
            </summary>
            <div className="mekko-column-controls">
              <label className="field">
                <span>Column label</span>
                <input value={column.label} onChange={(event) => updateColumnLabel(column.id, event.target.value)} />
              </label>
              <button className="table-icon" type="button" onClick={() => removeColumn(column.id)} title="Remove column">
                <Trash2 size={15} />
              </button>
            </div>

            <div className="mekko-segments">
              {column.segments.map((segment, segmentIndex) => (
                <div className="mekko-segment-row" key={segment.id}>
                  <button
                    className="color-swatch"
                    type="button"
                    style={{ background: segment.color ?? project.visualOverrides[segment.id]?.fill ?? project.theme.palette[segmentIndex % project.theme.palette.length] }}
                    onClick={() => setSelectedId(segment.id)}
                    title="Select segment"
                  />
                  <input
                    aria-label="Segment label"
                    value={segmentLabels[segmentIndex] ?? segment.label}
                    onFocus={() => setSelectedId(segment.id)}
                    onChange={(event) => updateSegmentLabel(segmentIndex, event.target.value)}
                  />
                  <input
                    aria-label="Segment value"
                    type="number"
                    value={segment.value}
                    onFocus={() => setSelectedId(segment.id)}
                    onChange={(event) => updateSegmentValue(column.id, segmentIndex, event.target.value)}
                  />
                  <button
                    className="table-icon"
                    type="button"
                    onClick={() => removeSegment(segmentIndex)}
                    title="Remove segment across all columns"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="button-row sticky-actions">
        <button className="action-button full" type="button" onClick={addColumn}>
          <Plus size={16} />
          Column
        </button>
        <button className="action-button full" type="button" onClick={addSegment}>
          <Plus size={16} />
          Segment
        </button>
      </div>
      {segmentCount > 0 ? (
        <div className="segment-strip">
          {segmentLabels.map((label, index) => (
            <button key={`${label}-${index}`} type="button" onClick={() => removeSegment(index)} title="Remove this segment across all columns">
              <Trash2 size={13} />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function WaterfallDataEditor({ project, setProject, setSelectedId }: DataPanelProps) {
  const data = project.data as WaterfallData;

  function updateRow(id: string, field: "label" | "amount" | "kind", value: string) {
    setProject((current) => ({
      ...current,
      data: {
        rows: (current.data as WaterfallData).rows.map((row) =>
          row.id === id ? { ...row, [field]: field === "amount" ? Number(value) : value } : row
        )
      }
    }));
  }

  function addRow() {
    const id = makeId("wf");
    setProject((current) => ({
      ...current,
      data: { rows: [...(current.data as WaterfallData).rows, { id, label: "New change", amount: 10, kind: "change" }] }
    }));
    setSelectedId(id);
  }

  function removeRow(id: string) {
    setProject((current) => {
      const visualOverrides = { ...current.visualOverrides };
      delete visualOverrides[id];
      return {
        ...current,
        visualOverrides,
        data: { rows: (current.data as WaterfallData).rows.filter((row) => row.id !== id) }
      };
    });
    setSelectedId(null);
  }

  function pasteRows(text: string) {
    const rows = parseDelimited(text);
    if (rows.length === 0) return;

    setProject((current) => ({
      ...current,
      data: {
        rows: rows.map((row, index) => ({
          id: makeId(`wf-${index}`),
          label: row[0] || `Bar ${index + 1}`,
          amount: toNumber(row[1] ?? "0"),
          kind: normalizeKind(row[2]) ?? (index === 0 ? "start" : index === rows.length - 1 ? "total" : "change")
        }))
      },
      visualOverrides: {}
    }));
    setSelectedId(null);
  }

  return (
    <>
      <table className="data-table" onPaste={(event) => handlePaste(event, pasteRows)}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Amount</th>
            <th>Kind</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.id} className={project.visualOverrides[row.id] ? "has-override" : ""}>
              <td>
                <input
                  value={row.label}
                  onFocus={() => setSelectedId(row.id)}
                  onChange={(event) => updateRow(row.id, "label", event.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.amount}
                  onFocus={() => setSelectedId(row.id)}
                  onChange={(event) => updateRow(row.id, "amount", event.target.value)}
                />
              </td>
              <td>
                <select value={row.kind} onFocus={() => setSelectedId(row.id)} onChange={(event) => updateRow(row.id, "kind", event.target.value)}>
                  <option value="start">Start</option>
                  <option value="change">Change</option>
                  <option value="total">Total</option>
                </select>
              </td>
              <td>
                <button className="table-icon" type="button" onClick={() => removeRow(row.id)} title="Remove row">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="action-button full" type="button" onClick={addRow}>
        <Plus size={16} />
        Add bar
      </button>
    </>
  );
}

function handlePaste(event: React.ClipboardEvent, callback: (text: string) => void) {
  const text = event.clipboardData.getData("text");
  if (!text.includes("\t") && !text.includes(",") && !text.includes("\n")) return;
  event.preventDefault();
  callback(text);
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function firstSegmentLabel(data: MarimekkoData, segmentIndex: number): string {
  return data.columns.find((column) => column.segments[segmentIndex])?.segments[segmentIndex]?.label ?? `Segment ${segmentIndex + 1}`;
}

function normalizeKind(value: string | undefined): WaterfallKind | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("start")) return "start";
  if (normalized.startsWith("total")) return "total";
  if (normalized.startsWith("change")) return "change";
  return null;
}
