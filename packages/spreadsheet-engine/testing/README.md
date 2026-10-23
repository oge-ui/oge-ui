# Golden corpus

What Excel itself shows, recorded on a real Excel and used as the engine's
build gate (ADR 0005 → "Excel-identical display"). Nothing here is published:
the package goes to npm from its build output
(`dist/packages/spreadsheet-engine`), which carries none of it.

## Layout

| Path        | What it holds                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corpus/`   | Workbooks built by `tools/corpus-sources.ts`, opened and **re-saved by Excel**, with `<name>.excel.json` — every cell's displayed text, widths, heights, the window state — and Excel's screenshots of each sheet (`<name>.<sheet>.png`, cell area only)         |
| `captures/` | Measurements: `number-formats.json` (258 format cases), `fit.json` (37,774 text-fitting samples), `border-precedence.json`, `font-metrics.json` (26 fonts × every pixel size), `gdi-advances.json`, `headers.json` (187 header-size samples), `environment.json` |
| `tools/`    | The capture scripts below                                                                                                                                                                                                                                        |

The specs that read them — `*.corpus.spec.ts` under `src/lib/` (reader,
number formats, text fitting, paint, header sizes) and the view specs that open
corpus workbooks — fail when the engine stops matching Excel.

## Regenerating

Windows with Microsoft Excel installed (the captures were taken with Excel
LTSC 2024, 16.0, en-US UI, at 96 dpi):

```sh
node packages/spreadsheet-engine/testing/tools/run.mjs              # everything
node packages/spreadsheet-engine/testing/tools/run.mjs --only metrics,corpus
```

`run.mjs` bundles and writes the source workbooks, runs `capture.ps1` (Excel
opens, measures and re-saves them; sections: `environment`, `numfmt`, `fit`,
`borders`, `metrics`, `corpus`) and `gdi-advances.ps1`, then regenerates
`src/lib/metrics/font-metrics-data.ts` with `font-metrics.mjs`. It also reads
what COM cannot report off Excel's screen: the tables' lines
(`table-lines.ps1` → `corpus/tables.lines.json`) and every sparkline's
pixels (`sparkline-capture.ps1` renders each sheet of `sparklines.xlsx`, its
window captures kept in a temporary folder; `sparkline-boxes.mjs` writes the
runs of the corpus's pure part colours in each cell to
`corpus/sparklines.boxes.json`) — and what Excel's AutoFit does
(`autofit-capture.ps1` AutoFits every case column and row of
`autofit.xlsx` and writes `corpus/autofit.fit.json`).

Two scripts measure Excel's own window and run on their own:

- `chrome-capture.ps1 -Out <folder>` — gridlines, the selection, headers, the
  freeze line, the sheet tabs. Their numbers live in the render layers' tokens
  and in the engine's render model; the screenshots stay in `<folder>`.
- `table-demo.ts` and `sparkline-demo.ts` build the docs' "Tables" and
  "Sparklines" samples; `save-demo.ps1 -Source <built> -Out <sample>` has
  Excel save them into `apps/dev-app/public/demo/spreadsheet/`, so the site
  offers Excel-written files.
- `header-capture.ps1` — row-header width and column-header height per Normal
  font, zoom and row count, into `captures/headers.json`.

## Rules

- **Read Excel, never configure it.** Format codes and formulas are written
  into the source files, not through COM: PowerShell hands Excel the user's
  locale, which would parse them as local syntax. Only numeric setters (column
  width, font size) go through COM, and Excel's application options are never
  changed — some of them persist.
- **Off screen and read-only.** The window captures open a read-only copy in a
  new Excel instance moved far off screen before it becomes visible, render it
  with `PrintWindow` and close it without saving.
- **Numbers, not screenshots of Microsoft's UI.** Window captures stay outside
  the repository; only the values measured from them are committed. The corpus
  screenshots show cell content only.
- **One font per fresh copy.** Excel silently keeps the previous font after
  many Normal-style changes in one workbook, so the metrics capture opens a new
  read-only copy for every font and checks the name took.
