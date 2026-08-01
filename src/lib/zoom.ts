/**
 * Stage zoom.
 *
 * Zoom changes the rendered width of the slide frame rather than applying a CSS
 * transform, so SVG text stays crisp and `getScreenCTM()` keeps returning a
 * correct matrix for label dragging.
 */

export const fitZoom = "fit" as const;

export type ZoomLevel = typeof fitZoom | number;

export const zoomStops = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2] as const;

export const minZoom = zoomStops[0];
export const maxZoom = zoomStops[zoomStops.length - 1];

/** Nominal slide width at 100%. Matches the 960x540 viewBox at 1.167x. */
export const slideBaseWidth = 1120;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maxZoom, Math.max(minZoom, value));
}

/**
 * Step to the next stop in `direction`. Leaving fit mode steps relative to 100%
 * so the first click after "fit" always lands on a predictable value.
 */
export function stepZoom(current: ZoomLevel, direction: 1 | -1): number {
  const from = current === fitZoom ? 1 : clampZoom(current);
  const stops = direction === 1 ? zoomStops : [...zoomStops].reverse();
  const next = stops.find((stop) => (direction === 1 ? stop > from + 0.001 : stop < from - 0.001));
  return next ?? clampZoom(from);
}

export function formatZoom(zoom: ZoomLevel): string {
  return zoom === fitZoom ? "Fit" : `${Math.round(zoom * 100)}%`;
}

/**
 * CSS custom properties for `.slide-frame`. Fit mode fills the stage up to the
 * nominal width; a numeric zoom pins an exact pixel width and lets the stage
 * scroll.
 */
export function slideFrameVars(zoom: ZoomLevel): Record<string, string> {
  if (zoom === fitZoom) {
    return { "--slide-w": "100%", "--slide-max": `${slideBaseWidth}px` };
  }
  return { "--slide-w": `${Math.round(slideBaseWidth * clampZoom(zoom))}px`, "--slide-max": "none" };
}
