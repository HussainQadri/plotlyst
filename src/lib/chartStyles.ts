/**
 * Typography for the chart artifact itself.
 *
 * These rules must travel with the SVG. Previously they lived in globals.css,
 * which meant a serialized export carried `class="svg-title"` with no matching
 * stylesheet: downloaded SVGs and rasterized PNGs both lost every font size,
 * weight and halo. So the single source of truth is this string, rendered into
 * a <style> element inside the <svg> for the live editor and cloned verbatim on
 * export.
 *
 * Constraints:
 * - No CSS custom properties from the app theme. An exported file is standalone.
 * - `--halo` is the one variable, set inline on the <svg> from the chart theme
 *   background so text outlines match the slide rather than assuming paper.
 * - Editor-only state (selection underlines, cursors) belongs in
 *   app/styles/canvas.css, never here.
 */

export const chartFontStack = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

export const chartArtifactCss = `
.chart-svg{font-family:${chartFontStack};font-weight:400}
.svg-title{font-size:28px;font-weight:600;letter-spacing:-0.01em}
.svg-label{font-size:13px;font-weight:500;paint-order:stroke;stroke:var(--halo,#ffffff);stroke-width:3px;stroke-linejoin:round}
.svg-label.light{font-size:12px;font-weight:500;stroke:rgba(0,0,0,0.22);stroke-width:2px}
.svg-axis{font-size:12px;font-weight:400}
.svg-note{font-size:12px;font-weight:500}
.svg-mekko-total{font-size:11px;font-weight:600;paint-order:stroke;stroke:var(--halo,#ffffff);stroke-width:3px;stroke-linejoin:round}
.annotation-label{font-size:12px;font-weight:600;paint-order:stroke;stroke:var(--halo,#ffffff);stroke-width:4px;stroke-linejoin:round}
.toolbar-text{font-size:10px;font-weight:600}
`.trim();

export const chartStyleMarker = "data-chart-style";

/** True when the SVG already carries its artifact stylesheet. */
export function hasChartArtifactStyle(svg: SVGSVGElement): boolean {
  return svg.querySelector(`style[${chartStyleMarker}]`) !== null;
}

/**
 * Guarantee the serialized SVG owns its typography. The live renderer already
 * inlines the <style>; this is the export-time safety net.
 */
export function ensureChartArtifactStyle(svg: SVGSVGElement) {
  if (hasChartArtifactStyle(svg)) return;
  const style = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "style");
  style.setAttribute(chartStyleMarker, "true");
  style.textContent = chartArtifactCss;
  svg.insertBefore(style, svg.firstChild);
}
