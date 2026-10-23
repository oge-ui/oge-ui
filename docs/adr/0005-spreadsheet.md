# ADR 0005 — Spreadsheet: a dependency-free, Excel-faithful workbook component

- **Status:** Accepted — architecture by the maintainers, the three product
  decisions (packaging and price, MIT viewer, replacing `exceljs`) by the
  product owner, all on 2026-10-20 (see _Product decisions_); P1 built
  2026-10-21 (see _P1 — what the viewer changed_)
- **Date:** 2026-10-20
- **Decided by:** product owner (tier, packaging, price), maintainers (architecture)
- **Related:** ADR 0001 (multi-framework), ADR 0003 (commercial engine
  packages), ADR 0004 (license keys — amended here: the Pro bundle covers seven
  families), `docs/research/spreadsheet-2026-10.md` (the research this rests
  on), `ROADMAP.md` → _Spreadsheet_ (the phase plan)

## Context

The suite is asked for a component that opens an Excel workbook in the
browser, shows it the way Excel does, lets the user edit it the way Excel
does, and saves it back — with **no runtime dependency** (no SheetJS, ExcelJS,
HyperFormula, or WASM engine).

What the research says (details and sources in the research notes):

- **Market.** Every serious competitor (Syncfusion, Kendo, SpreadJS,
  Handsontable, Jspreadsheet Pro, DHTMLX, Infragistics) sells the spreadsheet
  in a paid tier at $600–2,000 per developer per year; the open-source
  alternatives are either unmaintained (Luckysheet, x-spreadsheet), a data grid
  without a workbook model (AG Grid, Jspreadsheet CE) or canvas-rendered with
  no accessibility and a backend-only xlsx path (Univer). DevExtreme, Angular
  Material and PrimeNG have no spreadsheet at all. Nobody combines a real
  workbook model, dependency-free client-side xlsx round-trip, DOM rendering
  with WCAG conformance and first-class Angular + React. That is the gap.
- **Demand.** High: paste from Excel that keeps values and layout;
  Excel-identical formula results (15 significant digits, criteria wildcards,
  empty-cell semantics, 1900 leap-year serial); Excel keyboard parity; locked
  cells and validation for ERP/finance/government templates; WCAG 2.2 AA with a
  VPAT; xlsx round-trip that does not destroy charts, images, pivots, macros or
  names; locale separators (decimal comma, semicolon). Medium: 100k+ rows,
  change log, fill-handle series, conditional formatting, print. Low:
  real-time collaboration, pivot and chart _authoring_, macros — preserve them,
  do not build them. The median real workbook is one sheet, ~700 cells, 128
  formulas, nesting depth 2; the top 15 functions cover ~70% of formula sheets.
- **Platform.** `DecompressionStream('deflate-raw')` is Baseline (Chrome 103,
  Firefox 113, Safari 16.4), so ZIP needs only a CRC-32 and the container
  headers from us; SpreadsheetML's required parts, number-format language,
  theme colour slots, column-width arithmetic and Excel's calculation
  semantics are all documented well enough to implement clean-room. Excel's
  clipboard HTML (`x:num`, `mso-number-format`) is documented by its consumers.

What the suite already has: the grid's range selection, TSV clipboard, fill
handle, edit history and conditional-format resolver (`@oge-ui/behavior`);
`OffsetTree` virtualization, CSV formula guard, state-snapshot sanitizers and
the offline license check (`@oge-ui/core`); the pointer-gesture machine, the
reactivity adapter and keyboard maps (`behavior`); toolbar, menus, popups,
modal, colour palette, select box and form dialogs (`layout`, `overlay`,
`inputs`, `forms`); the commercial engine-package pattern (ADR 0003); the
locale packs; the AI-facing docs pipeline. Today's Excel _export_ is a thin
builder over `exceljs` (optional peer) in `behavior`.

## Decisions

1. **Commercial family, three packages.** `@oge-ui/spreadsheet-engine`
   (framework-free, `platform:agnostic`, rollup, commercial LICENSE),
   `@oge-ui/spreadsheet` (Angular, `oge-spreadsheet`) and
   `@oge-ui/react-spreadsheet` (`<OgeSpreadsheet>`), exactly the ADR 0003
   shape. It is the seventh Pro family and calls `ogeCheckSpreadsheetLicense()`
   like the others (ADR 0004). Rationale: the engine and the codec are the
   hardest intellectual property in the suite, every competitor charges for
   them, and the Pro bundle's value proposition grows more than its price.
   Consequence: nothing MIT may depend on the engine; the MIT grid keeps its
   `exceljs` export until the thin MIT writer of product decision 3 replaces it.
2. **Zero runtime dependencies, clean-room.** Own ZIP reader/writer
   (`DecompressionStream`/`CompressionStream` with a pure-TS inflate fallback
   for Safari ≤ 18 and synchronous use), own SpreadsheetML reader/writer, own
   number-format renderer, own formula parser/evaluator. HyperFormula (GPLv3 or
   paid), SheetJS/ExcelJS (dependencies, and ExcelJS drops charts) and IronCalc
   (WASM, pre-1.0, a dependency) are rejected. Behaviour is taken from
   ECMA-376, Microsoft's documentation and public bug trackers; no code is
   copied from SSF, numfmt or any engine. The optional `jspdf` peer for
   `/export-pdf` follows the suite's existing exception for charts and Gantt;
   printing itself is CSS and needs nothing.
3. **DOM rendering over a renderer-agnostic paint model.** The engine builds a
   _paint model_ for the visible window — cells with resolved style (fonts,
   fills, borders with Excel's precedence rules, number-formatted text, rich
   runs, wrap layout), merges, frozen quadrants, gridlines, selection — and
   the render layers draw it as virtualized DOM (`role="grid"`,
   `aria-rowcount`/`aria-colcount`, roving focus, the house `.oge-*` classes and
   tokens, forced-colours blocks, logical properties for RTL). Rationale: a
   viewport is one to two thousand cells, which the grid already recycles at
   60 fps; DOM gives accessibility, IME, text selection, print, forced colours
   and theming for free, and every accessible canvas product maintains a side
   DOM anyway. The paint model is the seam: a canvas painter for the same model
   is a documented later option, not a rewrite. Consequences: merges must work
   under virtualization (the grid's "no spans while virtualized" rule does not
   carry over — merged owners render as positioned cells in the window), and
   the scroller maps a short native track to row indices (Firefox's 17.9M px
   ceiling is below 1,048,576 × 20 px).
4. **Engine shape.** A workbook document with sparse per-row storage, interned
   style records (fonts/fills/borders/xfs as in `styles.xml`), shared strings on
   write; every mutation is a command on an undo/redo stack (the grid's
   edit-history idiom, extended to structure: insert/delete rows and columns,
   merges, sheet operations) and the command log is the one transport a Web
   Worker adapter replays later. The formula engine keeps a dependency graph
   with cell and range vertices (ranges decomposed so running sums stay
   linear), relative-shape AST sharing, dirty marking with on-demand
   topological evaluation, Tarjan SCC for cycles (circular error unless
   iterative mode), a volatile set, spill ranges as one vertex, interruptible
   evaluation. Excel semantics are a checklist, not an aspiration: operator
   precedence (`-2^2 = 4`), implicit intersection, coercion rules, empty-cell
   semantics, criteria strings with wildcards, 15-significant-digit entry and
   display, near-zero snapping, 1900 serial 60, `date1904`, locale-dependent
   argument and decimal separators. Functions ship in tiers (research list:
   the corpus-backed top 60 first, then ~200, then 300+), as a tree-shakable
   registry.
5. **Fidelity contract.** Open → edit → save → open in Excel must not trigger
   a repair and must not lose what we do not model: drawings, charts, media,
   pivot caches/tables, comments + VML + threaded comments, `vbaProject.bin`
   (xlsm), custom XML, printer settings, external links and tables are carried
   as opaque parts with their rels and content-type overrides; two-cell anchors
   are shifted on row/column insert, anything else we cannot shift is reported.
   Import never truncates silently and never auto-converts text: every dropped
   or approximated construct lands in an `importIssues` list the host can show.
   Worksheet child order follows the schema sequence; `cellXfs[0]` and a default
   theme are always written; `calcChain` is omitted together with its rel.
6. **Security.** XML is read by the engine's own streaming pull parser, not
   `DOMParser` (changed during P0): there is no `DOMParser` in Web Workers or
   Node, a DOM of a million-cell sheet costs gigabytes, and a parser that
   builds documents is a Trusted Types sink — so the spreadsheet adds no
   policy to `SECURITY.md`. The parser refuses DOCTYPE declarations (no
   external entities, no entity-expansion bombs), decodes only the five
   predefined entities and numeric character references, and caps nesting;
   the engine's package lint forbids every DOM global in library code. The ZIP
   reader caps entry count and inflated sizes, checks every CRC-32 and refuses
   ZIP64, encryption and OLE containers by name; hyperlinks go through
   `sanitizeUrl`; external links are never fetched; TSV/CSV/HTML clipboard and
   export writes apply the formula guard; formulas are interpreted by our
   evaluator, never by `eval` or `new Function`; persisted view state ships
   with a `sanitize*StateSnapshot` validator and a fuzz spec.
7. **A consumer of the MIT suite.** Like the scheduler and Gantt: the toolbar
   is `layout`'s APG toolbar, menus/context menus/popups/modal come from
   `overlay`, colour and font pickers from `inputs`, dialogs (sort, validation,
   number format, protection) from `forms`, the sheet strip from `tabs`
   (reorderable, closable with guards). Messages live in the engine's catalog
   and `@oge-ui/locales` grows a typed `spreadsheet` slice (import type only).
8. **Ship in phases, viewer first.** The phase plan is in `ROADMAP.md`. P1 is
   a read-only viewer because it is valuable on its own (preview attachments,
   reports), it de-risks the codec and the paint model before any editing
   exists, and it is the half of the market gap (dependency-free, accessible
   xlsx preview) no one fills today.

## Options considered

| Question  | Options                                                                                       | Chosen                                      | Why not the others                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier      | (a) MIT; (b) commercial; (c) MIT viewer + commercial editor                                   | (b); (c) revisited after P1                 | (a) gives away the costliest engine in the suite against a market that charges $600–2,000; (c) cannot be taken back once MIT, so it waits for P1  |
| Engine    | (a) own; (b) HyperFormula; (c) IronCalc (WASM); (d) formula.js bodies + own parser            | (a)                                         | (b) GPLv3 or paid, a dependency; (c) pre-1.0, WASM payload, a dependency; (d) MIT but still a dependency and no parser                            |
| Codec     | (a) own; (b) SheetJS CE; (c) ExcelJS                                                          | (a)                                         | both are dependencies; ExcelJS loses charts and threaded comments; SheetJS CE keeps no styles                                                     |
| Rendering | (a) DOM; (b) canvas; (c) canvas + side DOM for a11y                                           | (a) over a paint model that (b)/(c) can use | (b) has no a11y/IME/print/forced-colours and breaks the token system; (c) is (a) plus a second renderer — pay for it only if (a) measurably fails |
| Storage   | (a) `Map<row, cells>` sparse rows; (b) dense typed arrays; (c) per-cell objects in a flat map | (a) with interned styles                    | (b) wastes memory on the median sparse workbook; (c) misses row-wise iteration the painter and the writer both need                               |

## Product decisions (2026-10-20)

The owner was given three choices with a recommendation each and took all
three recommendations.

1. **In the Pro bundle, price unchanged.** The spreadsheet joins OGE UI Pro as
   its seventh family at the current $299 per developer per year; ADR 0004's
   "one bundle for all six families" now reads seven. Why: ADR 0004's
   one-product model is ten days old, a price change under its first buyers
   costs trust, a second SKU splits the purchase decision, and the bundle
   becomes far better value than Syncfusion ($1,199) or SpreadJS ($1,999). A
   price change is revisited when P3 (formulas) ships and announced in
   advance; existing keys keep every release dated on or before their expiry
   (ADR 0004's perpetual fallback). Implementation: `'spreadsheet'` joins
   `OgeCommercialFamily` (`@oge-ui/core`, P0 — the engine's license hook needs
   it) and `tools/license/sign.mjs`; a bundle key (`families: ['all']`) covers
   it without being reissued. It joins `tools/commercial-families.json` with
   P1, because the license-boundary gate requires all three packages of a
   listed family to be release projects.
2. **No MIT viewer for now.** Every spreadsheet package ships commercial. The
   asymmetry decides it: commercial code may become MIT later, MIT code never
   becomes commercial again ("will remain MIT"), so the free viewer stays an
   option that costs nothing to keep open. It is revisited after P1 ships,
   against P1's download and inquiry numbers. Until then the funnel is the
   existing one: the component works in full without a key and shows only the
   corner notice on production hosts (ADR 0004).
3. **A thin MIT xlsx writer replaces `exceljs`, after P2.** When the writer
   passes P2's round-trip gate, the subset the suite's exports need (values,
   number formats, styles, merges, column widths, frozen panes, outline levels,
   auto-filter) is extracted into MIT code and `exceljs` leaves the grid,
   tree-list, pivot, Gantt, kanban and scheduler exports — a fully
   dependency-free suite. That extraction gets its own ADR. The reader, the full
   writer, the formula engine and the paint model stay commercial.
   Consequence for P0: the ZIP container is internal to the engine (not part of
   its public entry), so the extraction can move it without breaking a
   published import path.

## P1 — what the viewer changed (2026-10-21)

The viewer was built against this ADR; these are the points where building it
added to or departed from the plan above.

1. **Excel-identical display is the product (owner direction, 2026-10-20).**
   "It must look exactly as in Excel — that is what sets us apart." Every
   visual rule is measured on a real Excel 16.0 and checked, not approximated:
   COM-driven captures of widths, heights, header sizes, text and status-bar
   output (the golden corpus, `packages/spreadsheet-engine/testing`), and pixel
   diffs of Excel's own screen for borders, fills, the 17 pattern masks,
   gridlines, the selection and text positions. The same direction re-planned
   four things (the phase table in `ROADMAP.md` has them): macros are kept
   and never run, with a message bar (a `macroRequested` hook later); pictures
   moved into P1; charts follow right after P1 (P1b), drawn with
   `@oge-ui/charts` from the kept chart parts; dynamic arrays show their cached
   spill values, the spill frame and the greyed follower formula in P1, and
   their recalculation moved from P4 to P3.
2. **The engine holds the whole viewer** (decision 3 taken further).
   `OgeSpreadsheetCore` owns the selection, keyboard map, find bar, copy,
   notes, pointer gestures, scroll memory and the grid frame (pane and header
   placement, pictures, notes, the pointer → cell mapping); the Angular and
   React components only bind its output. Browser work the layers share
   (fetching a URL source, object URLs, the clipboard, printing, opening a
   link) lives in the engine's `browser.ts` and takes the document or window
   from the render layer, so decision 6's lint rule — no DOM global in engine
   code — stands unchanged.
3. **The sheet strip is drawn as Excel draws it, not with `@oge-ui/tabs`**
   (departs from decision 7). Its geometry, tab colours, the active tab's
   underline and the scroll buttons are part of the look; a viewer needs none
   of the tab panel's reorder and close semantics. P2's sheet editing (rename,
   reorder, add, delete, colour) will put `overlay` menus and `forms` dialogs
   around the same strip; decision 7 stands for the toolbar, menus, pickers and
   dialogs.
4. **Messages are templates.** The catalog is plain strings with `{name}`
   placeholders and ICU plurals, filled by `@oge-ui/core`'s `ogeFormatMessage`
   in the viewer's locale, like every family's — so the `@oge-ui/locales`
   `spreadsheet` slice is data the locale gate checks, translated in all eleven
   packs. (An early P1 draft used functions; it changed before release.)
5. **Tokens.** The `--oge-spreadsheet-*` tokens joined the shared token set
   every package's stylesheet emits, like the charts and editor tokens; that
   costs each stylesheet ~0.7 kB gzip, and the size baseline was re-taken in
   the same change.
6. **A P0 rule corrected by the corpus:** a date-only number format rounds the
   serial to the second exactly as a time format does (45292.9999999 shows the
   next day), which P0's renderer truncated.
7. **Charts are drawn by the engine as Excel lays them out, not with
   `@oge-ui/charts`** (departs from 1's plan, 2026-10-22). Measured against
   Excel's own pictures of the corpus charts, `@oge-ui/charts` could only
   approach them by bending its public API: its plot, legend and title layout,
   bar spacing, axis lines and tick marks are its own, and it has no notion of
   a file's manual layout. The engine's `ogeChartView` lays a chart out with
   Excel's spacing, scale and bar geometry (the plot lands within 2 px of
   Excel's on all sixteen corpus charts) into SVG paths and texts both layers
   draw as they are — no chart package, no lazy chunk, nothing focusable in
   the panes. `@oge-ui/charts` stays the product for charts an app draws from
   its own data.
8. **Excel tables are formatted by the engine, Excel's 60 built-in styles
   embedded** (2026-10-23). Files only name a built-in table style, so the
   engine carries Excel's own definitions — read through COM, 7.4 kB as
   generated data — and lays a style under each cell's own formatting by the
   rules measured on Excel's `DisplayFormat` and screen (element order,
   stripes over visible rows, a cell's own fill, borders and non-Normal font
   properties winning, lines decided per line). The tables corpus also
   corrected a P0 rule: tints are Excel's integer HLS arithmetic, not the
   specification's floating-point formula, which was a step off in a quarter
   of the colours.
9. **Sparklines move from P4 into P1b, drawn by the engine** (2026-10-23).
   They are cell content, and a workbook with them showed empty cells. Like
   charts (7), they follow Excel's rules rather than `@oge-ui/charts`'
   sparkline: a plot inset by 2 and 4 px of zoom, an axis end moved a hair
   under 1/99 of the span, half-pixel rules that differ by direction, columns
   that touch under a 2 px gap, markers that step with the line weight — read
   off Excel's screen, 1,694 of 1,699 corpus sparklines pixel-exact. The
   `extension-not-shown` issue code, which only ever meant sparklines, is gone
   before the first release.

## Consequences

- Three new packages, a new locale slice, docs pages, `AGENTS.md`/llms
  entries, schematics and a `check-parity` family entry — all in the same
  change that ships each phase (CLAUDE.md's definition of done).
- **P0 ships nothing.** `@oge-ui/spreadsheet-engine` is built, linted and
  tested from P0 on, but it joins `release.projects`, the docs manifest (its
  `llms.txt`), the size budgets and the root README with P1, its first release
  — publishing a spreadsheet engine with no spreadsheet would advertise a
  product that does not exist yet. `tools/docs-tools/lib/manifest.mjs` lists it
  under `UNRELEASED_PACKAGES`, so the llms gap report names it as held back
  instead of warning that it was forgotten.
- A golden-workbook corpus under `packages/spreadsheet-engine/testing/`
  (small hand-made xlsx files with Excel-computed cached values) becomes a
  build gate: parser round-trip, number-format rendering and formula results
  are compared against what Excel wrote.
- Performance targets are part of the acceptance criteria: open a 1M-cell file
  < 3 s (Worker), first paint < 100 ms after parse, 60 fps scroll, cold recalc
  of 100k formulas < 1 s, typical edit < 16 ms.
- The spreadsheet does **not** replace the data grid: the grid stays the
  component for bound row data with columns; the spreadsheet is for
  cell-addressed workbooks. The docs say so on both pages.
