"use client";

import { useState, type InputHTMLAttributes } from "react";
import { parseNumberDraft } from "@/lib/datasheet";

type NumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number | undefined;
  /** Clearing the field commits `undefined` instead of being ignored. */
  optional?: boolean;
  onCommit: (value: number | undefined) => void;
};

/**
 * A number input that holds what the user is typing as a local draft and only
 * commits parseable values, so clearing a cell to retype it never pushes 0 into
 * the chart. On blur the field shows the committed value again.
 */
export function NumberField({ value, optional = false, onCommit, onBlur, ...inputProps }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      {...inputProps}
      type="number"
      value={draft ?? (value === undefined || !Number.isFinite(value) ? "" : String(value))}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = parseNumberDraft(event.target.value, optional);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
