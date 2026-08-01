"use client";

import { useEffect, useRef } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

/**
 * Keep keyboard focus inside a modal surface while it is open, move focus into
 * it on mount, and hand focus back to the invoking control on unmount.
 *
 * Attach the returned ref to the dialog element. Escape handling stays with the
 * caller, which owns what "close" means.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function focusable(): HTMLElement[] {
      return Array.from(container!.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement
      );
    }

    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active_ = document.activeElement;

      if (event.shiftKey && (active_ === first || !container!.contains(active_))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active_ === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
