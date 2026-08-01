export type Appearance = "light" | "dark";

export const appearanceStorageKey = "plotlyst.appearance.v1";

/**
 * Resolve the chrome appearance. An explicit stored choice always wins;
 * otherwise follow the operating system.
 */
export function resolveAppearance(stored: string | null, prefersDark: boolean): Appearance {
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark ? "dark" : "light";
}

/**
 * Inlined in the document head so the first paint already carries the right
 * theme. Keep it dependency-free and exception-safe: localStorage throws in
 * some privacy modes.
 */
export const appearanceBootstrapScript = `try{var s=localStorage.getItem("${appearanceStorageKey}");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export function readStoredAppearance(): Appearance {
  if (typeof window === "undefined") return "light";
  try {
    return resolveAppearance(
      window.localStorage.getItem(appearanceStorageKey),
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  } catch {
    return "light";
  }
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = appearance;
  try {
    window.localStorage.setItem(appearanceStorageKey, appearance);
  } catch {
    // Persisting the preference is best-effort.
  }
}
