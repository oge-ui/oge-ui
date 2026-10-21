# @oge-ui/spreadsheet-engine

The framework-free engine of the OGE UI Spreadsheet — an Excel-faithful
workbook viewer and editor with no runtime dependencies. The Angular
(`@oge-ui/spreadsheet`) and React (`@oge-ui/react-spreadsheet`) components
will both be thin render layers over this package, so the two cannot drift:
one workbook model, one xlsx codec, one number-format renderer, one formula
engine.

The engine never touches the DOM. It runs on the main thread, in a Web Worker
(where a million-cell workbook is parsed) and in Node (server-side xlsx
pipelines).

> **Status: phase P0 of ADR 0005.** This package holds the foundation the
> viewer (P1), editor (P2) and formula engine (P3) build on. It is not
> published yet; it joins the release with P1.

## What ships today

- **Workbook model** — `createOgeWorkbook`, `OgeWorkbook` (sheets, defined
  names with sheet scope, date system, theme colours, default font) and
  `OgeWorksheet` (sparse cells, row and column formatting, merged ranges,
  frozen panes and the rest of the sheet view). Styles are interned in an
  `OgeStyleRegistry`, so a million styled cells cost one record per distinct
  style. Sheet and defined names are validated against Excel's rules.
- **Addresses** — A1 and R1C1 parsing and formatting with `$` anchors, whole
  rows and columns, quoted and 3-D sheet prefixes, range arithmetic and the
  relative offsetting Excel applies when it copies a formula.
- **Number formats** — `formatOgeCellValue` renders values through Excel
  format codes the way Excel displays them: up to four sections and
  conditions, grouping and scaling commas, percent, scientific and
  engineering notation, continued-fraction fractions, dates and times with
  elapsed fields and sub-seconds, `AM/PM`, colours, `_x` padding and `*x`
  fills, `[$-xxxx]` locale prefixes and the system long date/time, and
  Excel's General format. Rounding works on the 15-significant-digit decimal
  Excel keeps, so `2.675` shows `2.68`. Locale data comes from `Intl`
  (`ogeFormatLocale('tr-TR')`); the default is United States English, the
  meaning of an xlsx file's built-in format ids.
- **Dates** — serials in the 1900 system (with Lotus 1-2-3's phantom
  1900-02-29) and the 1904 system, without `Date` or time-zone dependence.
- **Colours and metrics** — theme slots (in SpreadsheetML's swapped order),
  the indexed palette, tint, and Excel's column-width (maximum digit width)
  and row-height arithmetic.

```ts
import { createOgeWorkbook, formatOgeCellValue, ogeFormatLocale } from '@oge-ui/spreadsheet-engine';

const workbook = createOgeWorkbook();
const sheet = workbook.sheets[0];
const style = workbook.styles.intern({ numberFormat: '#,##0.00 "TL"' });
sheet.setCell(0, 0, { value: 1234.5, style });

const cell = sheet.getCell(0, 0);
formatOgeCellValue(cell?.value as number, '#,##0.00 "TL"', {
  locale: ogeFormatLocale('tr-TR'),
}).text; // "1.234,50 TL"
```

## License

Source-available commercial software — free for evaluation and development,
a paid license is required for production use. See [`LICENSE`](./LICENSE)
and https://www.ogeui.com/license.
