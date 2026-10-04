"use client";

import { useState, type InputHTMLAttributes } from "react";
import { parseNumberDraft } from "@/lib/datasheet";

type NumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> &
  (
    | { optional?: false; value: number; onCommit: (value: number) => void }
    /** Clearing an optional field commits `undefined` instead of being ignored. */
    | { optional: true; value: number | undefined; onCommit: (value: number | undefined) => void }
  );

/**
 * A number input that holds what the user is typing as a local draft and only
 * commits parseable values, so clearing a cell to retype it never pushes 0 into
 * the chart. On blur the field shows the committed value again.
 */
export function NumberField({ value, optional = false, onCommit, onBlur, ...inputProps }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // A required field never parses to undefined, so either callback accepts what's committed.
  const commit = onCommit as (value: number | undefined) => void;

  return (
    <input
      {...inputProps}
      type="number"
      value={draft ?? (value === undefined || !Number.isFinite(value) ? "" : String(value))}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = parseNumberDraft(event.target.value, optional);
        if (parsed !== null) commit(parsed);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
