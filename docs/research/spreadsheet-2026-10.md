# Spreadsheet component — research notes (2026-10-20)

Condensed findings behind [ADR 0005](../adr/0005-spreadsheet.md) and the
Spreadsheet plan in `ROADMAP.md`. Three questions were researched: what the
market ships, what buyers actually ask for, and how to build it with zero
runtime dependencies. Evidence quality is marked: corpus studies and vendor
documentation are strong; review aggregators, reseller price lists and vendor
blogs are weak and flagged `(v)` (vendor claim) or `(?)` (unverified).

## 1. Market: who ships what

| Product                   | Render                  | Formula engine                                            | xlsx fidelity                                                                                         | A11y                                             | Frameworks                 | License / price per dev                                              |
| ------------------------- | ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------- | -------------------------------------------------------------------- |
| Handsontable 18           | DOM, virtualized        | HyperFormula (sibling product), 408 fns, GPLv3/commercial | Export via ExcelJS plugin; import = SheetJS recipe; no workbook model (CF/validation/charts not kept) | Best in class: WCAG 2.1 AA, ACR/VPAT published   | Angular, React, Vue        | Commercial only, quote-based; resellers $979–1,861/yr                |
| AG Grid 36                | DOM, virtualized        | Enterprise "Formulas" (2025) — data grid, not a workbook  | Excel export only                                                                                     | ARIA grid, strong keyboard                       | Angular, React, Vue        | MIT core; Enterprise $999 perpetual; range/fill/clipboard are paid   |
| Univer 0.20 / 1.0-beta    | Canvas                  | Own, 500+ fns (v), Worker/server, Rust runtime            | Pro only, through a server-side exchange service; unlicensed caps 1 MB import / 10k-cell export       | None documented (?)                              | Agnostic + presets         | Core Apache-2.0; Pro watermarked, paid tier quote-only               |
| Luckysheet / FortuneSheet | Canvas                  | Own                                                       | Import-only community plugins                                                                         | None                                             | Vanilla / React, Vue       | MIT; Luckysheet unmaintained, FortuneSheet pre-1.0                   |
| x-spreadsheet             | Canvas                  | Basic                                                     | None                                                                                                  | None                                             | Vanilla                    | MIT; superseded, 400 open issues                                     |
| Jspreadsheet CE / Pro     | DOM (CE unvirtualized)  | CE: arithmetic only; Pro: 400–500 fns (v)                 | Pro Enterprise: xlsx, charts, validation, comments                                                    | Not documented                                   | React, Vue, Angular        | CE MIT; Pro $2,499–4,499/yr per application                          |
| SheetJS CE / Pro          | No UI                   | Pro "Formula Calculator"                                  | Best-in-class file fidelity (styles, CF, validation, images, charts, in-place edit)                   | n/a                                              | n/a                        | CE Apache-2.0; Pro quote-only                                        |
| Syncfusion EJ2            | DOM, virtualized        | Own, 400+ fns, named ranges, UDFs                         | xlsx/xls/csv in, xlsx/csv/pdf out; CF, validation, charts, images, protection; sync parse freezes UI  | WAI-ARIA, keyboard, high contrast (v)            | Angular, React, Vue        | $1,199/yr; free Community tier below revenue/headcount thresholds    |
| Kendo UI / Telerik        | DOM                     | Own; Excel-mismatch bugs reported (INDEX/LINEST, 2024)    | xlsx in/out, PDF (active sheet only); shapes dropped                                                  | WCAG 2.2 AA + 508 claimed, VPAT 2026             | jQuery, Angular, React     | $799–1,299/yr bundles                                                |
| DHTMLX                    | DOM, virtualized        | Own, 170+ fns                                             | xlsx via separate server module; export drops formulas                                                | Not mentioned                                    | Angular, React, Vue        | GPLv2 free; $599–5,799 one-time                                      |
| DevExpress Spreadsheet    | DOM, server-backed .NET | Server-side                                               | High (server engine)                                                                                  | Not found                                        | ASP.NET Core / Blazor only | ASP.NET subscription; **no DevExtreme / pure-JS spreadsheet exists** |
| Infragistics Ignite UI    | Canvas port of XAML (?) | Own, 300+ fns (v)                                         | xlsx/csv; CF, charts, validation pages exist                                                          | Not found for the spreadsheet                    | Angular, React, Blazor     | ~$1,155–1,355/yr                                                     |
| SpreadJS 19 (MESCIUS)     | Canvas                  | Own, 500+ fns, calc Worker                                | Most complete: xlsx/xlsm/csv/pdf, 30+ chart types, pivot add-on, macros preserved                     | Optional `enableAccessibility`, uneven VoiceOver | Angular, React, Vue        | $1,999 (1 dev + 1 hostname); multi-MB bundle (?)                     |
| ONLYOFFICE                | Canvas, iframe editor   | Own, Excel-grade                                          | Near-Excel                                                                                            | Partial                                          | iframe/JS API              | AGPLv3; Developer Edition ~$1,500+/server/yr (?)                     |
| RevoGrid                  | DOM, virtualized        | Pro: 100+ fns, formula bar, names                         | Pro: xlsx/xlsm/xlsb with styles, merges, freeze, formulas                                             | Not documented                                   | Angular, React, Vue, WC    | Core MIT; Pro $199–720/dev/yr                                        |
| IronCalc                  | Engine only (Rust/WASM) | 300–500 fns, WIP                                          | xlsx                                                                                                  | n/a                                              | n/a                        | MIT/Apache — the only permissive embeddable engine; still WIP        |

**Table stakes** (every serious competitor; absence disqualifies): virtualized
rendering; cell + multi-range selection; Excel keyboard parity; Excel-compatible
copy/paste (TSV + HTML); undo/redo; fill handle with series; row/col resize,
hide, insert, delete; freeze panes; merge; sort and filter; a formula bar on a
real engine (300+ functions, cross-sheet refs, named ranges); number formats
and cell styling (font, fill, border, alignment, wrap); context menu; multiple
sheets; xlsx import/export preserving values, formulas, styles, number formats,
merges, frozen panes, column widths; Angular + React; TypeScript; i18n.

**Premium / where paid tiers draw the line:** conditional formatting with
round-trip, data validation, comments, hyperlinks round-trip, charts and
sparklines in-sheet, images/shapes, pivot tables, find & replace, protection,
defined names round-trip, print/PDF, collaboration, Worker/server calc,
WCAG-conformant a11y (only Handsontable and Kendo publish an ACR; every canvas
renderer is weak here), dependency-free client-side xlsx (most OSS rely on
SheetJS/ExcelJS, Univer on a backend, DHTMLX on a server module), small bundle,
headless engine.

**Positioning gap.** No competitor combines (a) a true workbook model with an
Excel-grade engine, (b) dependency-free client-side xlsx round-trip, (c) DOM
rendering with published WCAG conformance and (d) first-class Angular and
React. SpreadJS/Univer win on features but are canvas and a11y-weak;
Handsontable wins on a11y but has no workbook model and no native xlsx import.
Pricing norms 2025–26: entry $199–720/yr, mainstream $899–1,299/yr, high end
$1,999+ with per-deployment add-ons; quote-only pricing is spreading.

## 2. Demand: what buyers ask for

| #   | Feature                                                                                                                       | Demand                       | Evidence                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Paste from Excel/Sheets with correct values and layout (tabs/newlines, merged cells, `####`, Safari)                          | High                         | Largest recurring thread family on the Handsontable forum (GH #9597 dates pasted as `####`, #1366 merged-cell repeats); Univer paste → `undefined` issues                                                |
| 2   | Excel-faithful formula results (same core functions, 15 significant digits, criteria wildcards, empty-as-zero, 1900 leap bug) | High                         | 76% of Enron sheets use only the same 15 functions; EPPlus/LibreOffice document rounding mismatches as the main parity bug class; Univer's most-reacted issues are formula ones (separator, FIND, float) |
| 3   | Excel keyboard parity (Ctrl+D/R, F2, F4, Ctrl+Enter, Ctrl+Shift+Arrow, Ctrl+plus/minus, Ctrl+', paste special)                | High                         | OnlyOffice/LibreOffice/CryptPad forums: "proficient Excel users will not relearn"; missing Ctrl+D called "a major bummer"                                                                                |
| 4   | Locked cells / protected ranges + validation before submit                                                                    | High (ERP, finance, gov)     | Every journal-upload workflow found (Oracle ADFdi, OneStream JEM, Winshuttle, Coins ERP+, Utah, Maryland DBM) locks prior-period cells, uses dropdowns and a validate-fix-reupload loop                  |
| 5   | Accessibility: WCAG 2.1/2.2 AA, VPAT, screen reader, single-tab-stop mode                                                     | High (gov, EU, enterprise)   | AG Grid's top-reacted open issues are screen-reader/keyboard-trap bugs; Handsontable publishes a VPAT 2.5 (WCAG 2.2, Mar 2026); EAA in force since 2025-06-28; US RFPs ask for a VPAT                    |
| 6   | xlsx round-trip that does not destroy unknown parts (charts, images, pivot caches, VBA, names, print areas)                   | High                         | Known failure mode of ExcelJS (charts deleted), SheetJS (round-trip breaks with charts), SpreadJS strips macros unless .xlsm; 8–11% of corpus workbooks hold charts, 51% of EUSES sheets have names      |
| 7   | Locale: decimal comma, semicolon argument/CSV separators, date formats                                                        | High (DACH/TR/ES/IT/PT)      | Benchling 2025 fix for "1,234" misparse; Syncfusion pt-PT thread; Univer #5679 semicolon separator                                                                                                       |
| 8   | 100k+ rows stay smooth                                                                                                        | Medium-High                  | Univer publishes FPS at 1M cells; PHE lost ~16k COVID cases to the 65,536-row cap; median real workbook is small (701 cells, 128 formulas, 1 sheet)                                                      |
| 9   | Audit trail: who changed what, when                                                                                           | Medium-High (SOX, insurance) | SOX commentary, TVA OIG audit, Milliman 2018 (67% of actuaries: spreadsheets critical), ClusterSeven (20% confident in controls). Wanted: a change log, not live collaboration                           |
| 10  | Fill handle: series, weekday/month lists, Ctrl toggle, linear detection                                                       | Medium                       | AG Grid fill handle doc: "match other spreadsheet applications as closely as possible". Flash Fill: no demand evidence                                                                                   |
| 11  | Conditional formatting, number formats, borders/fills                                                                         | Medium                       | Every vendor's "advanced" tier; no corpus prevalence data (uncertain)                                                                                                                                    |
| 12  | CSV/formula injection safety                                                                                                  | Medium (security gate)       | OWASP CSV Injection, CWE-1236                                                                                                                                                                            |
| 13  | Undo/redo, freeze panes, autofilter, sort, find/replace, print/PDF                                                            | Medium (table stakes)        | Absence shows up in reviews, presence does not                                                                                                                                                           |
| 14  | RTL sheets                                                                                                                    | Low-Medium                   | Kendo and Spread.NET support it; Zoho added on Arabic/Hebrew requests                                                                                                                                    |
| 15  | Real-time collaboration, in-browser pivot authoring, chart authoring, macros                                                  | Low                          | Pivots 0.4–1.5%, array formulas ~1.2%, UDFs 0.5–1.2% of corpus workbooks — preserve on round-trip, do not build                                                                                          |
| 16  | Licensing cost / bundle size                                                                                                  | Medium (selection criterion) | Handsontable "$899–979/dev", SpreadJS "$1,999/yr"; aggregators list "overkill/heavy"; AG Grid packaging blocks splitting                                                                                 |

**Per sector.** FP&A: 96% plan in spreadsheets even with EPM tools (AFP 2025,
n=362) — SUMIF(S)/INDEX/MATCH/OFFSET/SUBTOTAL, cross-sheet refs, comments,
audit trail. ERP/accounting: journal and price-list templates with locked
header/prior columns, dropdown validation, per-row pre-upload errors, formulas
honoured on import. Insurance/actuarial: protection, change log, named ranges,
precision parity. Manufacturing/supply chain: large planning grids, paste from
Excel, freeze panes, grouping. HR/payroll (71% use Excel): validation, locked
formulas, protected PII cells, safe CSV. Healthcare: no silent truncation, no
text auto-conversion (`MARCH1`), explicit import diagnostics. Public sector:
Excel budget templates are standard; WCAG/508/EN 301 549, locked templates,
print/PDF. Construction: formulas, formatting, print layout, templates.

**Most-used Excel functions.** Ranks 1–15 are corpus-backed (Hermans & Jansen,
Enron vs EUSES; the top 15 cover ~70% of formula-bearing sheets; operators
alone are 58–71% of formula tokens); 16–60 are ordered tiers inferred from
category shares and search-volume studies.

1 SUM, 2 IF, 3 AVERAGE, 4 VLOOKUP, 5 ROUND, 6 SUBTOTAL, 7 CONCATENATE,
8 COUNTIF, 9 AND, 10 OR, 11 OFFSET, 12 SUMIF, 13 INDEX, 14 MATCH, 15 MIN,
16 MAX, 17 NOW, 18 TODAY, 19 MONTH, 20 YEAR, 21 LOOKUP, 22 HYPERLINK,
23 INDIRECT, 24 ISNUMBER, 25 ISBLANK, 26 COUNT, 27 COUNTA, 28 IFERROR,
29 SUMIFS, 30 COUNTIFS, 31 AVERAGEIF, 32 XLOOKUP, 33 ROUNDUP, 34 ROUNDDOWN,
35 ABS, 36 INT, 37 MOD, 38 SUMPRODUCT, 39 TEXT, 40 LEFT, 41 RIGHT, 42 MID,
43 LEN, 44 TRIM, 45 UPPER, 46 LOWER, 47 FIND, 48 SEARCH, 49 SUBSTITUTE,
50 DATE, 51 DAY, 52 EOMONTH, 53 DATEDIF, 54 NETWORKDAYS, 55 WEEKDAY,
56 ISERROR, 57 NOT, 58 IFS, 59 PMT, 60 RANK.

Median real workbook: 1 sheet, ~700 non-empty cells, 128 formulas (14 unique),
formula length 18–20 characters, nesting depth 2. Charts in 8–11% of
workbooks, pivots < 2%, array formulas ~1%, VBA ~1%.

## 3. Building it without dependencies

### ZIP

- `CompressionStream` / `DecompressionStream('deflate-raw')`: Chrome 103,
  Firefox 113, Safari 16.4 (Baseline since 2023-05); works in Workers.
  `deflate-raw` is headerless RFC 1951, exactly what ZIP method 8 stores, so the
  output is byte-valid for an entry. The API gives no CRC-32, headers or EOCD:
  implement the 256-entry table CRC-32 (`0xEDB88320`) ourselves.
- Safari: WebKit 254021 (16.4, invalid output on flush > ~35 KB, fixed),
  299541 / 307952 (throws on trailing bytes in chunked input, fix landed
  2026-02 — Safari ≤ 18.x in the wild still has it). Feed exactly
  `compressedSize` bytes per entry and keep a ~300-line pure-TS inflate
  fallback (also wanted for synchronous use in tests).
- Writer: buffer each part, compute CRC and sizes up front, write real sizes in
  the local header, **no general-purpose bit 3 / data descriptors**, no ZIP64.
  Reader: EOCD from the tail, central directory authoritative, methods 0 and 8
  only, reject ZIP64/encrypted with a clear error. Cap the inflated size and
  ratio (zip bomb).

### SpreadsheetML essentials

- Required parts: `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`,
  `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheetN.xml`. Practically
  required: `xl/styles.xml` with non-empty `fonts/fills/borders/cellStyleXfs/cellXfs/cellStyles`
  (Excel drops the whole part on any invalid xf reference; `cellXfs[0]` must
  exist) and `xl/theme/theme1.xml` whenever a `theme="N"` colour is used. Theme
  slot order is **not** XML order: 0 lt1, 1 dk1, 2 lt2, 3 dk2, 4–9 accent1–6,
  10 hlink, 11 folHlink. Tint: RGB→HLS, negative `L' = L·(1+tint)`, positive
  `L' = L·(1−tint) + 255·tint`. Always embed a default theme.
- Shared strings on write (Excel rewrites inline strings anyway); `calcChain`
  may be omitted but then its rel and Override must go too.
- Worksheet child order is a schema sequence; Excel "repairs" on violation:
  `sheetPr, dimension, sheetViews, sheetFormatPr, cols, sheetData, sheetCalcPr, sheetProtection, protectedRanges, scenarios, autoFilter, sortState, dataConsolidate, customSheetViews, mergeCells, phoneticPr, conditionalFormatting, dataValidations, hyperlinks, printOptions, pageMargins, pageSetup, headerFooter, rowBreaks, colBreaks, customProperties, cellWatches, ignoredErrors, smartTags, drawing, legacyDrawing, legacyDrawingHF, picture, oleObjects, controls, webPublishItems, tableParts, extLst`.
- Opaque passthrough (raw bytes + rels + Overrides): `drawings/*`, `charts/*`,
  `media/*`, `pivotCache/*`, `pivotTables/*`, `vmlDrawing*`, `comments*.xml` +
  `threadedComments/*` + `persons/*` (threaded comments need the legacy
  comment + VML pair or Excel deletes them), `vbaProject.bin` (xlsm content
  type `application/vnd.ms-office.vbaProject`, macro-enabled workbook
  override), `customXml/*`, `printerSettings/*`, `externalLinks/*`, `tables/*`.
  Anchors (`xdr:from/to`, pivot sources, table refs) go stale on row/column
  insert — shift `twoCellAnchor`s, warn for the rest.
- Cells: `t` ∈ `s | str | inlineStr | b | e | n | d`; shared formulas
  (`<f t="shared" si ref>`, followers carry only `t/si`, derive by offsetting
  relative refs); array formulas (`t="array"`); dynamic arrays add `cm="1"` and
  `_xlfn.` prefixes; always write cached `<v>`. Dates: 1900 system = days since
  1899-12-30 with phantom serial 60 (1900-02-29); `date1904` offset 1,462 days.
- Built-in numFmt ids (implied, never written): 0 General, 1 `0`, 2 `0.00`,
  3 `#,##0`, 4 `#,##0.00`, 9 `0%`, 10 `0.00%`, 11 `0.00E+00`, 12 `# ?/?`,
  13 `# ??/??`, 14 `mm-dd-yy`, 15 `d-mmm-yy`, 16 `d-mmm`, 17 `mmm-yy`,
  18 `h:mm AM/PM`, 19 `h:mm:ss AM/PM`, 20 `h:mm`, 21 `h:mm:ss`, 22 `m/d/yy h:mm`,
  37 `#,##0 ;(#,##0)`, 38 `#,##0 ;[Red](#,##0)`, 39 `#,##0.00;(#,##0.00)`,
  40 `#,##0.00;[Red](#,##0.00)`, 45 `mm:ss`, 46 `[h]:mm:ss`, 47 `mmss.0`,
  48 `##0.0E+0`, 49 `@`; 5–8 and 41–44 are locale currency/accounting and must
  be written explicitly; custom ids start at 164.
- Column width (ECMA §18.3.1.13): `stored = Trunc((chars·MDW + 5)/MDW·256)/256`,
  `px = Trunc(((256·w + Trunc(128/MDW))/256)·MDW)`, MDW = max digit width of
  the default font (Calibri 11 @ 96 dpi = 7 px → default 8.43 chars = 64 px).
  Row height in points, default 15 pt = 20 px; `px = pt/72·96`.
- Other parts: `mergeCells`; CF rule types `cellIs, expression, colorScale, dataBar, iconSet, top10, uniqueValues, duplicateValues, containsText, notContainsText, beginsWith, endsWith, containsBlanks, notContainsBlanks, containsErrors, notContainsErrors, timePeriod, aboveAverage`
  with `dxfId`, `priority`, `stopIfTrue`, `x14` extras in `extLst`;
  `dataValidation` types `whole, decimal, list, date, time, textLength, custom`
  (`showDropDown="1"` _hides_ the dropdown); hyperlinks via rels
  (`TargetMode="External"`) or `location`; `definedNames` with `localSheetId`
  and the reserved `_xlnm.Print_Area`, `_xlnm.Print_Titles`,
  `_xlnm._FilterDatabase`; `sheetView` (`tabSelected`, `zoomScale`,
  `showGridLines`, `rightToLeft`) + `pane` (`xSplit/ySplit/topLeftCell/state="frozen"`)
  - `selection`; `sheetProtection` (`algorithmName="SHA-512"`, `hashValue`,
    `saltValue`, `spinCount`); `autoFilter`; outline via `outlineLevel`; print
    via `printOptions`, `pageMargins`, `pageSetup`, `headerFooter`,
    `rowBreaks/colBreaks`.

### Number-format language

Up to four sections `pos;neg;zero;text`, at most two conditional and three
numeric sections; `[Red]`/`[ColorN]` first; conditions `[>=100]`; placeholders
`0 # ?`; `,` as separator or ×1/1000 scaling when trailing; `%` ×100; `E+/E-`;
fractions `# ?/?` and fixed denominators; `@` text; `*x` fill, `_x` pad;
quoted/escaped literals; date tokens with `m` disambiguated by adjacency to
`h`/`ss`; `AM/PM`; elapsed `[h] [mm] [ss]`; `[$€-407]` currency + LCID,
`[$-F800]` system long date. Test the "General" 11-character rule and `###`
overflow, half-away-from-zero display rounding, `(…)` negatives, `0.0,,"M"`,
`?` alignment, serial 60 display, missing text section. Reference
implementations for behaviour only (clean-room, no code copying): SheetJS SSF
(Apache-2.0), borgar/numfmt (MIT).

### Formula engine

- Lessons from HyperFormula: formulas with the same relative (R1C1-normalised)
  shape share one AST; dependency graph with cell and range vertices, ranges
  decomposed (`B5:D20 = B5:D19 + three cells`) so running sums are O(n);
  topological order, conservative cycle detection; structural edits (insert
  row…) as recorded transformations applied lazily; lazy evaluation;
  RAND/NOW/TODAY volatile, ROW/COLUMN structurally volatile; array broadcasting
  of size-1 dims, spill only into empty cells. Univer: lexer → AST → dependency
  analysis → interpreter, interruptible, whole engine in a Worker over RPC.
- Excel semantics: precedence high→low `: (space) ,` > unary `−` > `%` > `^`
  > `* /` > `+ −` > `&` > comparisons (so `-2^2 = 4`); `@` implicit
  > intersection; A1/R1C1, `$` anchors, `Sheet1:Sheet3!A1`, `A:A`, `1:1`,
  > structured refs; errors `#DIV/0! #N/A #NAME? #NULL! #NUM! #REF! #VALUE! #SPILL! #CALC!`;
  > arithmetic coerces numeric text and booleans, `&` coerces through General,
  > comparisons are case-insensitive with number < text < logical; empty cell is
  > 0 in math, `""` in concat, equals both; criteria strings take an operator
  > prefix and `* ? ~` wildcards; IEEE double with 15 significant digits on entry
  > and display, overflow → `#NUM!`, near-zero `+`/`−` results snapped to 0.
- Recalc: dirty set + on-demand topological evaluation, Tarjan SCC to isolate
  cycles (circular error unless iterative mode: 100 iterations / 0.001
  default), volatile set every tick, spill ranges as one vertex. Targets: full
  load of 100k formulas ≲ 1 s, typical edit < 16 ms. Engine as pure data plus a
  command log so the same bundle runs on the main thread or in a Worker.

### Rendering

- Canvas (Google Sheets, Univer, SpreadJS, Luckysheet; Quadratic uses WebGL):
  O(visible) paint, pixel control, cheap merges/frozen panes; costs are text
  metrics, HiDPI, and **no native selection / IME / RTL / accessibility** — every
  canvas product that is accessible at all maintains a parallel DOM anyway
  (Google Docs' "side DOM", SpreadJS' opt-in mode). DOM (Handsontable, AG Grid,
  Syncfusion, Kendo): free a11y/IME/selection/CSS/print/forced colours, layout
  cost past ~10k live nodes.
- A spreadsheet viewport is ~1–2k visible cells; the suite's grid already
  recycles that many at 60 fps with row + column virtualization. APG explicitly
  supports partial-DOM grids via `aria-rowcount` / `aria-rowindex`.
- Virtualization: `Float64Array` prefix sums of widths/heights (hidden = 0),
  binary search for the first visible index, suffix invalidation on resize;
  frozen panes as four quadrants with independent translate + clip; merges in a
  per-sheet interval index so a merge anchored outside the window still paints;
  `measureText` LRU cache keyed by font + text; wrapped-text layout cached per
  (cell, width, font). Scroll ceiling: Chrome ≈ 33.5M px, Firefox ≈ 17.9M px —
  1,048,576 rows × 20 px = 21M px exceeds Firefox, so the scroller must map a
  short native track to row indices (the grid's virtualizer already does).
- Editor: a DOM `<textarea>` over the active cell (IME composition works
  natively; `EditContext` is Chromium-only). RTL: `sheetView@rightToLeft`
  flips column order; logical CSS does the rest.

### Clipboard

- Excel puts TSV (`text/plain`) and HTML (`text/html`) on the clipboard; the
  HTML carries `<td class=xl65 x:num="1234.5">` (raw value, full precision;
  Mac Excel may omit `x:num`), `x:str`, and number formats in a `<style>` block
  as `.xl65{mso-number-format:"0\.00"}`. Writing back: inline styles only
  (Chrome's sanitizer strips `<style>`/`<head>`), `mso-number-format` is enough
  for Excel to apply the format, `\@` for text. Google Sheets uses
  `data-sheets-value='{"1":3,"3":42}'` and `data-sheets-formula` in R1C1.
- Handle the synchronous `copy`/`paste` events (unsanitized `DataTransfer`);
  write TSV + HTML with inline styles + `data-oge-*` JSON per cell for lossless
  internal paste; keep an in-memory clipboard keyed by a GUID embedded in the
  HTML for same-app paste; `navigator.clipboard` only for button-driven copy.
  Chrome 104+ custom formats (`web application/x-…`) are Chrome-only.

### Printing

Clone the print area into a hidden `<table>`: `@page { size; margin }`,
`thead { display: table-header-group }` for print titles, `tr { break-inside: avoid }`,
`table-layout: fixed`, CSS `zoom` for fit-to-width, `break-before` at
`rowBreaks/colBreaks`. Page math from row heights in points against paper
size minus margins.

### Performance targets (no vendor publishes hard numbers)

Open a 1M-cell xlsx in a Worker < 3 s; first paint < 100 ms after parse;
60 fps scroll over the full 1,048,576 × 16,384 virtual grid; cold recalc of
100k formulas < 1 s, typical edit < 16 ms; ≤ ~60 B per populated cell.

## Sources

Market: handsontable.com/pricing, handsontable.com/hyperformula, docs.handsontable.com (export-to-excel, accessibility-conformance-report), ag-grid.com/license-pricing, ag-grid.com/blog/whats-new-in-ag-grid-36, univer.ai, docs.univer.ai (pro, import-export, pro-features), blog.univer.ai (univer-vs-handsontable), github.com/dream-num/luckysheet, bestofjs.org/projects/fortunesheet, github.com/myliang/x-spreadsheet, jspreadsheet.com/pricing, bossanova.uk (jspreadsheet-ce-vs-pro), sheetjs.com/pro, syncfusion.com (js-spreadsheet, pricing, ej2 feature-list, angular-spreadsheet-freezing-large-excel-import), telerik.com (purchase, kendo spreadsheet overview/accessibility, feedback 1449114), dhtmlx.com (dhtmlxSpreadsheet, forum 32408), docs.devexpress.com/AspNetCore/400375, infragistics.com (spreadsheet-overview, pricing), developer.mescius.com (spreadjs, pricing, accessibility-support), g2.com (mescius spread), helpcenter.onlyoffice.com/docs/faq/developer, rv-grid.com/pricing, github.com/ironcalc/IronCalc, quadratichq.com/technology, getgrist.com/developers, depscope.dev.

Demand: ar5iv.labs.arxiv.org/html/1503.04055 (Enron vs EUSES), felienne.com/archives/3634, ar5iv.labs.arxiv.org/html/1808.10642 (charts/pivots/arrays), arxiv.org/pdf/0908.0935 (names), spreadsheetdaddy.com/?p=3870, financialprofessionals.org (AFP FP&A 2025), hyperformula.handsontable.com (compatibility-with-microsoft-excel, known-limitations), github.com/EPPlusSoftware/EPPlus/wiki, git.sheetjs.com/sheetjs/sheetjs/issues/2824, forum.handsontable.com (8789, 2805, 6963, 7205, 440, 8398), github.com/dream-num/univer/issues (by reactions), docs.univer.ai/guides/pro/performance-report, github.com/ag-grid/ag-grid/issues (by reactions), ag-grid.com (cell-selection-fill-handle), dev.to/pavkode (round-trip loss), lightrun.com (sheetjs charts round-trip), syncfusion.com/blogs (excel-charts-images-break), help.benchling.com (locale parsing), syncfusion.com/forums/130595, xebia.com (no-point-for-google-sheets), techcommunity.microsoft.com (3928184), userapps.support.sap.com (2179631), documentation.onestream.com (JEM), financialservices.utah.edu (e-journals), help-coins.theaccessgroup.com, dbm.maryland.gov (MFR), dof.ca.gov (upload templates), nutrient.io (VPAT), accessible.org (wcag-version-vpat), milliman.com (insurers-spreadsheets), actuarialpost.co.uk (1739), nhimg.org (SOX), tvaoig.gov, vietnamnews.vn (1549792), aimms.com, businesswire.com (20210727005401), mhrglobal.com, theregister.com (test_and_trace), retractionwatch.com (genomics spreadsheet), forconstructionpros.com (10741682), community.onlyoffice.com (11024), forum.onlyoffice.com (4519), owasp.org (CSV_Injection), cwe.mitre.org/1236, us.fitgap.com (handsontable), softwareadvice.com (spreadjs), capterra.com (228226), telerik.com design-system spreadsheet globalization, help.zoho.com (rtl).

Technical: github.com/mdn/browser-compat-data (DecompressionStream), developer.mozilla.org (DecompressionStream, EditContext), web.dev/blog/compressionstreams, compression.spec.whatwg.org, bugs.webkit.org (254021, 299541, 307952, 306235), git.sheetjs.com (62_columns.md, 59_theme.js), learn.microsoft.com (cc802410, numberingformat, excel-recalculation, multithreaded-recalculation, floating-point-arithmetic, 257675, cc804093), support.microsoft.com (custom number format guidelines, date systems, implicit intersection, SPILL, limits 1672b34d), github.com/borgar/numfmt, techcommunity.microsoft.com (3851237), webapp.docx4java.org (color, f), issues.apache.org/bugzilla/51710, exceljet.net (excel-date, wildcard), blog.loslab.com (threaded comments), docs.sheetjs.com (vba, clipboard), handsontable.com/docs/hyperformula (key-concepts, dependency-graph, arrays, volatile-functions), handsontable.com/blog/?p=9180, docs.univer.ai/introduction/architecture (formula, rendering, web-worker), fast-formula-parser README, ablebits.com (iterative, not-equal), excelforum.com/766725, excelatfinance.com (errors), thenewstack.io (google-docs-canvas), quadratichq.com/blog (webgl renderer), developer.mescius.com (suspendPaint, optimize-spreadjs-performance), meyerweb.com (infinite-pixels), bugzilla.mozilla.org/1126391, w3.org/WAI/ARIA/apg/patterns/grid, ag-grid.com (accessibility), docs.handsontable.com (aria-grid recipe), support.google.com/docs/answer/6282736, workspaceupdates.googleblog.com (2018-01), lists.gnome.org/orca-list (2019-06), caniuse.com/wf-edit-context, pro.rv-grid.com (clipboard-json), graphpad.com (pasting), medium.com (mso-number-format), iter.ca/post/docs-html, developer.chrome.com (web-custom-formats, unsanitized-html-async-clipboard), webkit.org/blog/8170, chromium.googlesource.com (81c0fc6d), handsontable.com/docs/performance.
