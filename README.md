<div align="center">
  <h1>Plotlyst</h1>
  <p><strong>Make sharp business charts for decks without wrestling a spreadsheet.</strong></p>
  <p>
    <a href="https://plotlyst-eight.vercel.app/">Live Demo</a>
  </p>
</div>

---

Plotlyst is a small, focused chart editor for presentation work. Pick a chart, paste or edit the data, tweak the labels and colors, then export a clean SVG or PNG.

It is built for the charts that usually end up in strategy decks, board updates, investor slides, and operating reviews:

- **Pie** for simple mix stories
- **Marimekko** for market maps and composition
- **Waterfall** for bridges, deltas, and variance stories

## What Works Today

- Spreadsheet-style datasheet for bulk edits and paste workflows
- Compact side-panel editing for quick changes
- Label formatting, placement, dragging, and reset controls
- Per-mark color and visibility overrides
- Waterfall starts, changes, subtotals, totals, and connectors
- SVG-first rendering with watermarked draft export and paid clean SVG/PNG export
- Local browser persistence through `localStorage`
- Anonymous share links when KV storage is configured

## Try It

Use the hosted version:

```text
https://plotlyst-eight.vercel.app/
```

Projects are saved in your browser by default. Anonymous share links are available only when server-side KV storage is configured.

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

Optional paid export and sharing variables:

```bash
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
EXPORT_TOKEN_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## Build Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Stack

- Next.js
- React
- TypeScript
- SVG rendering
- Vitest

## Project Map

```text
src/components/ChartEditor.tsx      editor state, selection, export
src/components/ChartCanvas.tsx      SVG chart rendering
src/components/DataPanel.tsx        compact data controls
src/components/DatasheetModal.tsx   spreadsheet-like editing
src/components/Inspector.tsx        chart and selection controls

src/lib/chartMath.ts                chart layout math
src/lib/datasheet.ts                paste parsing
src/lib/labels.ts                   label and number formatting
src/lib/storage.ts                  browser persistence
src/lib/projects.ts                 anonymous project share envelopes
src/lib/exportToken.ts              signed clean-export entitlement tokens
src/lib/types.ts                    core chart types
```

## Status

Plotlyst is early, usable, and intentionally narrow. The focus is presentation-grade business charts, not dashboard building.

## License

No license has been selected yet. All rights are reserved until a license is added.
