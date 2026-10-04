"use client";

import { useSyncExternalStore } from "react";
import { isApplePlatform } from "@/lib/shortcuts";

const subscribe = () => () => {};

/**
 * Whether shortcut hints should use Command glyphs. The server renders the
 * Ctrl form; the client corrects it after hydration without a mismatch.
 */
export function useApplePlatform(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isApplePlatform(navigator.platform || navigator.userAgent),
    () => false
  );
}
