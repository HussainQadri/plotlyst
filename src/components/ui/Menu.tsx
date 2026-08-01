"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type MenuItem =
  | { kind: "separator"; id: string }
  | { kind: "heading"; id: string; label: string }
  | {
      kind?: "item";
      id: string;
      label: string;
      icon?: LucideIcon;
      hint?: string;
      disabled?: boolean;
      onSelect: () => void;
    };

type MenuProps = {
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
  align?: "start" | "end";
};

function isActionable(item: MenuItem): item is Extract<MenuItem, { onSelect: () => void }> {
  return item.kind !== "separator" && item.kind !== "heading" && !item.disabled;
}

/**
 * Small dropdown for commands that do not earn a permanent slot in the command
 * bar. Handles outside click, Escape, roving arrow-key focus, and returning
 * focus to the trigger on close.
 */
export function Menu({ label, icon: Icon, items, align = "end" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  const actionable = items.filter(isActionable);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!anchorRef.current?.contains(event.target as Node)) close(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const next = current + delta;
          if (next < 0) return actionable.length - 1;
          if (next >= actionable.length) return 0;
          return next;
        });
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        const item = actionable[activeIndex];
        if (!item) return;
        event.preventDefault();
        close();
        item.onSelect();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [actionable, activeIndex, close, open]);

  return (
    <div className="menu-anchor" ref={anchorRef}>
      <button
        ref={triggerRef}
        type="button"
        className="icon-button has-tip tip-below-end"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-tip={label}
        onClick={() => {
          setActiveIndex(0);
          setOpen((current) => !current);
        }}
      >
        <Icon size={15} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          className="menu-popover"
          role="menu"
          aria-label={label}
          style={align === "start" ? { right: "auto", left: 0 } : undefined}
        >
          {items.map((item) => {
            if (item.kind === "separator") {
              return <div key={item.id} className="menu-separator" role="separator" />;
            }
            if (item.kind === "heading") {
              return (
                <div key={item.id} className="menu-heading" role="presentation">
                  {item.label}
                </div>
              );
            }

            const ItemIcon = item.icon;
            const index = actionable.indexOf(item as Extract<MenuItem, { onSelect: () => void }>);
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={item.disabled}
                data-active={index !== -1 && index === activeIndex ? "true" : undefined}
                onPointerEnter={() => {
                  if (index !== -1) setActiveIndex(index);
                }}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
              >
                {ItemIcon ? <ItemIcon size={14} aria-hidden="true" /> : null}
                <span className="menu-item-label">{item.label}</span>
                {item.hint ? <span className="kbd">{item.hint}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
