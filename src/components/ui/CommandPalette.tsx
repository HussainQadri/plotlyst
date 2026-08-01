"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";

export type Command = {
  id: string;
  group: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  keywords?: string;
  disabled?: boolean;
  run: () => void;
};

/** All terms must appear somewhere in the label, group or keywords. */
export function matchCommands(commands: Command[], query: string): Command[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return commands;
  const terms = needle.split(/\s+/);
  return commands.filter((command) => {
    const haystack = `${command.label} ${command.group} ${command.keywords ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Cmd/Ctrl+K launcher. Most editor commands are icon-only or nested in a panel
 * tab, so the palette is the discoverability layer: one searchable list of
 * everything the chrome can do, with the keyboard shortcut spelled out.
 *
 * Mounted only while open, so query and cursor reset without an effect.
 */
export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  const results = useMemo(() => matchCommands(commands, query), [commands, query]);
  const clampedIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [clampedIndex, results.length]);

  function runCommand(command: Command | undefined) {
    if (!command || command.disabled) return;
    onClose();
    command.run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((clampedIndex + delta + results.length) % results.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand(results[clampedIndex]);
    }
  }

  return (
    <div className="palette-overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="palette-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={query}
            placeholder="Search commands"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-autocomplete="list"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
        </div>

        <div className="palette-list" id="palette-results" role="listbox" aria-label="Commands" ref={listRef}>
          {results.length === 0 ? <p className="palette-empty">No matching command.</p> : null}
          {results.map((command, index) => {
            const Icon = command.icon;
            const showGroup = index === 0 || results[index - 1].group !== command.group;
            return (
              <div key={command.id}>
                {showGroup ? (
                  <div className="palette-group" role="presentation">
                    {command.group}
                  </div>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === clampedIndex}
                  className="palette-item"
                  disabled={command.disabled}
                  data-active={index === clampedIndex ? "true" : undefined}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span className="palette-item-label">{command.label}</span>
                  {command.hint ? <span className="kbd">{command.hint}</span> : null}
                </button>
              </div>
            );
          })}
        </div>

        <div className="palette-footer">
          <span>
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> navigate
          </span>
          <span>
            <span className="kbd">
              <CornerDownLeft size={10} aria-hidden="true" />
            </span>{" "}
            run
          </span>
          <span>
            <span className="kbd">Esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
