export type Shortcut = { key: string; mod?: boolean; shift?: boolean };

/** True on macOS and iOS, where the modifier key is Command rather than Ctrl. */
export function isApplePlatform(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

/** Display text for a shortcut: "⇧⌘Z" on Apple platforms, "Ctrl+Shift+Z" elsewhere. */
export function shortcutLabel({ key, mod = false, shift = false }: Shortcut, apple: boolean): string {
  if (apple) return `${shift ? "⇧" : ""}${mod ? "⌘" : ""}${key}`;
  return [mod ? "Ctrl" : null, shift ? "Shift" : null, key].filter(Boolean).join("+");
}
