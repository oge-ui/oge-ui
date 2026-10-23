// Hand-compiled from packages/spreadsheet/src/lib/** and the engine's
// `view/events.ts` — keep in sync with the source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

/**
 * Type blocks shared verbatim by the Angular and React API pages: the source,
 * the event payloads, find, import issues and the keyboard map live in
 * `@oge-ui/spreadsheet-engine`, so both layers export the same names.
 */
export const SPREADSHEET_TYPE_BLOCKS: NonNullable<ApiSections['types']> = [
  {
    title: 'Types',
    entries: [
      {
        name: 'OgeSpreadsheetSource',
        type: 'ArrayBuffer | Uint8Array | Blob | string',
        description:
          'What the viewer opens: the workbook&#39;s bytes, a <code>Blob</code> / <code>File</code>, or a URL it fetches with same-origin credentials. A URL that cannot be fetched fails with <code>fetch-failed</code>.',
      },
      {
        name: 'OgeSpreadsheetLoadedEvent',
        type: 'interface',
        description:
          '<code>{ workbook, issues }</code> — the open <code>OgeWorkbook</code> and what the reader could not show as Excel does, aggregated per code and place.',
      },
      {
        name: 'OgeSpreadsheetLoadErrorEvent',
        type: 'interface',
        description: '<code>{ error }</code> — an <code>OgeXlsxError</code>.',
      },
      {
        name: 'OgeSpreadsheetSelectionChangeEvent',
        type: 'interface',
        description:
          '<code>{ sheet, ranges, active, address }</code> — the active sheet&#39;s index, the selected ranges (zero-based, inclusive), the active cell and its address (<code>B4</code>).',
      },
      {
        name: 'OgeSpreadsheetHyperlinkClickEvent',
        type: 'interface',
        description:
          '<code>{ href, link, cancel }</code> — an external link about to open (the target is sanitised; <code>javascript:</code> and friends never reach it). Set <code>cancel = true</code> to open it yourself, or not at all. Internal links (<code>Sheet2!A1</code>, a defined name) navigate without the event.',
      },
      {
        name: 'OgeSpreadsheetCellClickEvent',
        type: 'interface',
        description:
          '<code>{ row, col, address, text, event }</code> — a click: down and up on one cell without a drag. <code>text</code> is what the cell shows.',
      },
      {
        name: 'OgeFindOptions',
        type: 'interface',
        description:
          '<code>{ matchCase?, entireCell?, formulas?, workbook? }</code> — Excel&#39;s Find options: case, the whole cell, formulas instead of what cells show, every visible sheet. Queries take Excel&#39;s <code>*</code> and <code>?</code> wildcards (<code>~</code> escapes them).',
      },
      {
        name: 'OgeImportIssue',
        type: 'interface',
        description:
          '<code>{ code, severity, count, sheet?, part?, ref?, detail? }</code> — one kind of thing shown differently from Excel (or kept without being shown), counted per sheet and part; <code>ref</code> is the first occurrence, <code>detail</code> an English note for logs.',
      },
      {
        name: 'OgeImportIssueCode',
        type: 'string union',
        description:
          "What the reader reports, e.g. <code>'macros-kept'</code> (a <code>vbaProject.bin</code> is kept and never run — the viewer shows a message bar), <code>'drawing-not-shown'</code> (shapes and chart sheets, kept for saving), <code>'chart-type-not-shown'</code> (radar, stock, surface, pie-of-pie and Excel 2016 charts, kept for saving), <code>'table-style-not-shown'</code> (a table style neither the workbook nor Excel defines), <code>'uncalculated-formulas'</code>, <code>'external-link'</code> (kept, never fetched), <code>'truncated'</code>, <code>'strict-conformance'</code>.",
      },
      {
        name: 'OgeSheetChart',
        type: 'interface',
        description:
          'A chart floating over a sheet (<code>sheet.charts</code>): its <code>anchor</code>, <code>name</code>, alt text (<code>description</code>) and the chart part read into an <code>OgeChartModel</code> — chart groups with their series and cached values, axes, legend, title and formatting. The viewer draws bar, column, line, area, pie, doughnut, scatter and bubble charts the way Excel lays them out and colours them (3-D ones flat); assistive tech hears each chart&#39;s alt text, title or name in a list under the grid.',
      },
      {
        name: 'OgeTable',
        type: 'interface',
        description:
          'An Excel table on a sheet (<code>sheet.tables</code>): its <code>range</code>, header and totals rows, <code>columns</code>, filter buttons (<code>autoFilter</code>) and <code>style</code> — a built-in name such as <code>TableStyleMedium2</code> with its first-column, last-column and stripe options. The viewer formats tables as Excel does: all 60 built-in styles (<code>ogeBuiltinTableStyle</code>) and the workbook&#39;s own (<code>workbook.tableStyles</code>), under each cell&#39;s own formatting, with the header&#39;s filter buttons and the resize handle.',
      },
      {
        name: 'OgeSparklineGroup',
        type: 'interface',
        description:
          'A group of sparklines on a sheet (<code>sheet.sparklineGroups</code>, read from Excel 2010&#39;s <code>extLst</code>): its <code>type</code> (<code>line</code>, <code>column</code> or <code>stacked</code> win/loss), <code>sparklines</code> (each a <code>cell</code> and its data <code>ref</code>), <code>colors</code>, <code>lineWeight</code>, the marked points (<code>markers</code>, <code>high</code>, <code>low</code>, <code>first</code>, <code>last</code>, <code>negative</code>), <code>displayXAxis</code>, <code>displayHidden</code>, <code>displayEmptyCellsAs</code>, axis ends (<code>minAxisType</code> / <code>maxAxisType</code>, <code>manualMin</code> / <code>manualMax</code>), <code>rightToLeft</code> and a date axis (<code>dateRef</code>). The viewer draws them in their cells pixel for pixel as Excel does.',
      },
      {
        name: 'OgeWorkbook',
        type: 'class',
        description:
          'The engine&#39;s workbook model (<code>@oge-ui/spreadsheet-engine</code>): sheets, styles, names, opaque parts. Build one in code and pass it to <code>workbook</code>, or read it from <code>loaded</code>.',
      },
      {
        name: 'OgeXlsxError',
        type: 'class',
        description:
          "Why a file could not be read: <code>code</code> is <code>'not-xlsx'</code>, <code>'encrypted-or-legacy'</code> (a password-protected workbook or an old <code>.xls</code>), <code>'xlsb'</code>, <code>'corrupt'</code>, <code>'too-large'</code>, <code>'aborted'</code> or <code>'fetch-failed'</code>.",
      },
    ],
  },
  {
    title: 'Keyboard',
    entries: [
      {
        name: 'Arrows / Ctrl+arrows / Shift',
        type: 'move',
        description:
          'Move the active cell over hidden rows, hidden columns and merges; Ctrl jumps to the data edge as <code>Range.End</code> does; Shift extends from the anchor.',
      },
      {
        name: 'Home / Ctrl+Home / Ctrl+End / Page Up / Page Down / Alt+Page',
        type: 'move',
        description:
          'Start of the row, the first cell below the frozen panes, the last used cell, a screen up or down, a screen sideways.',
      },
      {
        name: 'Tab / Enter (Shift)',
        type: 'move',
        description:
          'Step right / down — inside a multi-cell selection they cycle within it.',
      },
      {
        name: 'Shift+Space / Ctrl+Space / Ctrl+A / Shift+F8',
        type: 'select',
        description:
          'Whole rows, whole columns, the current region then everything, add mode (arrows move, clicks add ranges).',
      },
      {
        name: 'Ctrl+C / Ctrl+F / F5 or Ctrl+G / Shift+F2 / Alt+Enter',
        type: 'act',
        description:
          'Copy as text and Excel HTML, find, go to (the name box), show the active cell&#39;s note, open its link.',
      },
      {
        name: 'Ctrl+Page Up / Ctrl+Page Down / Ctrl+= / Ctrl+− / Ctrl+wheel',
        type: 'view',
        description:
          'Previous / next sheet, zoom in and out on Excel&#39;s steps.',
      },
      {
        name: 'Alt+Shift+Down / Alt+Shift+Up',
        type: 'outline',
        description:
          'Shows the details of the collapsed group the active cell sums up, or hides those of the innermost group it is in — rows first, then columns; the active cell says when its group&#39;s details are hidden. The gutter&#39;s group and level buttons do the same with the pointer.',
      },
      {
        name: 'Ctrl+Shift+U',
        type: 'view',
        description:
          'Expands the formula bar to the whole text, up to five lines, and back — as its chevron button does.',
      },
      {
        name: 'All sheets / Defined names lists',
        type: 'menu',
        description:
          'The button beside the sheet tabs lists every visible sheet, the active one checked; the name box&#39;s chevron lists the defined names Excel&#39;s name box shows. Down or Up on the button opens a list; arrows, Home, End and a first letter move, Enter or Space pick (the sheet shows, or the name is gone to), Escape gives focus back to the button and Tab moves on.',
      },
      {
        name: 'Escape',
        type: 'close',
        description:
          'Closes the find bar, add mode or an open note — and when nothing is open the key stays the page&#39;s (a dialog around the viewer still closes).',
      },
    ],
  },
];

export const OGE_SPREADSHEET_API: ApiSections = {
  properties: [
    {
      title: 'Content',
      entries: [
        {
          name: 'source',
          type: 'OgeSpreadsheetSource | null',
          default: 'null',
          description:
            'The workbook to open: bytes, a <code>Blob</code> / <code>File</code>, or a URL. A newer value cancels a read still running; back to <code>null</code>, it closes what it opened (a <code>workbook</code> given directly stays). Read in the browser by the dependency-free reader; nothing is uploaded.',
        },
        {
          name: 'workbook',
          type: 'OgeWorkbook | null',
          default: 'null',
          description:
            'A workbook built or read elsewhere; wins over <code>source</code> when both change.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'BCP 47 locale of the built-in number formats, separators and month names — Excel takes them from the reader&#39;s region. Default: the configured locale, else the browser&#39;s.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeSpreadsheetMessages&gt;',
          default: '{}',
          description:
            'Per-instance overrides of the message catalog, merged over the configured one. Every user-facing string lives there — aria labels and live-region announcements included.',
        },
      ],
    },
    {
      title: 'Chrome',
      entries: [
        {
          name: 'showFormulaBar',
          type: 'boolean',
          default: 'true',
          description:
            'The name box (type a reference or a defined name, Enter goes there) and the read-only formula bar (a dynamic array&#39;s followers show the anchor&#39;s formula in grey).',
        },
        {
          name: 'showSheetTabs',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'The sheet tabs, with tab colours. Default: the workbook&#39;s own setting.',
        },
        {
          name: 'showStatusBar',
          type: 'boolean',
          default: 'true',
          description:
            'The status bar: the selection&#39;s Average, Count and Sum in the active cell&#39;s number format (Excel&#39;s rules), and the zoom slider.',
        },
        {
          name: 'showHeaders',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Row and column headers. Default: each sheet&#39;s own setting.',
        },
        {
          name: 'showGridLines',
          type: 'boolean | undefined',
          default: 'undefined',
          description: 'Gridlines. Default: each sheet&#39;s own setting.',
        },
        {
          name: 'showOutlineSymbols',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'The outline&#39;s brackets, group buttons and level buttons beside the headers (Excel&#39;s Show outline symbols). Default: each sheet&#39;s own setting.',
        },
      ],
    },
    {
      title: 'State (two-way)',
      entries: [
        {
          name: 'activeSheet',
          type: 'model&lt;number | undefined&gt;',
          default: 'undefined',
          description:
            'The active sheet&#39;s index. A value set before the workbook opens is held until it does, and wins over the file&#39;s own active sheet; hidden sheets are refused. Each sheet keeps its selection, zoom and scroll position.',
        },
        {
          name: 'zoom',
          type: 'model&lt;number | undefined&gt;',
          default: 'undefined',
          description:
            'The active sheet&#39;s zoom in percent (10–400); each sheet keeps its own. Geometry stays in whole pixels per row and column, as Excel draws it.',
        },
      ],
    },
    {
      title: 'Controller',
      entries: [
        {
          name: 'core',
          type: 'OgeSpreadsheetCore',
          description:
            'The framework-free controller from <code>@oge-ui/spreadsheet-engine</code> (ADR 0003) — selection, keyboard map, find, copy, the grid frame, pointer gestures, column widths and row heights (<code>resizeColumns</code>, <code>resizeRows</code>, <code>autofitColumns</code>, <code>autofitRows</code>, as dragging and double-clicking a header&#39;s edge do) and announcements. The React viewer runs the same class.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Methods',
      entries: [
        {
          name: 'open(source)',
          type: '(source: OgeSpreadsheetSource) =&gt; Promise&lt;void&gt;',
          description:
            'Opens a workbook; resolves once it is shown (or failed) and <code>loaded</code> / <code>loadError</code> fired.',
        },
        {
          name: 'getWorkbook()',
          type: '() =&gt; OgeWorkbook | null',
          description: 'The open workbook.',
        },
        {
          name: 'selectSheet(index)',
          type: '(index: number) =&gt; boolean',
          description:
            'Shows a sheet; <code>false</code> for a hidden or missing one.',
        },
        {
          name: 'goTo(reference)',
          type: '(reference: string) =&gt; boolean',
          description:
            'Goes to <code>B4</code>, <code>Sheet2!A1:C3</code>, <code>C:C</code>, <code>3:3</code> or a defined name — as the name box does; <code>false</code> when unknown.',
        },
        {
          name: 'setZoom(percent)',
          type: '(percent: number) =&gt; void',
          description: 'Sets the zoom (clamped to 10–400%).',
        },
        {
          name: 'find(query, options?)',
          type: '(query: string, options?: OgeFindOptions) =&gt; void',
          description:
            'Opens the find bar on <code>query</code> and selects the first match after the active cell.',
        },
        {
          name: 'copy()',
          type: '() =&gt; Promise&lt;boolean&gt;',
          description:
            'Copies the active range through the async clipboard API: what the cells show as text, plus Excel-compatible HTML. A whole row or column copies its used part.',
        },
        {
          name: 'print()',
          type: '() =&gt; void',
          description:
            'Prints the active sheet&#39;s used range as a table (the sheet&#39;s page setup decides the gridlines) from a hidden frame built node by node, never from markup.',
        },
        {
          name: 'focus()',
          type: '() =&gt; void',
          description: 'Focuses the grid.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'loaded',
          type: 'OgeSpreadsheetLoadedEvent',
          description:
            'A workbook opened from <code>source</code> or <code>open()</code>.',
        },
        {
          name: 'loadError',
          type: 'OgeSpreadsheetLoadErrorEvent',
          description:
            'Opening failed; the placeholder shows the error&#39;s message.',
        },
        {
          name: 'selectionChange',
          type: 'OgeSpreadsheetSelectionChangeEvent',
          description:
            'The selection changed — keys, pointer, find, go to, a sheet switch.',
        },
        {
          name: 'hyperlinkClick',
          type: 'OgeSpreadsheetHyperlinkClickEvent',
          description:
            'An external link is about to open (a click, or Alt+Enter); cancelable. It opens in a new browsing context without an opener.',
        },
        {
          name: 'cellClick',
          type: 'OgeSpreadsheetCellClickEvent',
          description: 'A cell was clicked.',
        },
      ],
    },
  ],
  types: [
    ...SPREADSHEET_TYPE_BLOCKS,
    {
      title: 'Configuration',
      entries: [
        {
          name: 'provideOgeSpreadsheetConfig(config)',
          type: '(config: OgeSpreadsheetConfigInput | (() =&gt; OgeSpreadsheetConfigInput)) =&gt; Provider',
          description:
            'DI-level configuration for every viewer below: <code>messages</code> (merged over the defaults) and <code>locale</code>. A function makes it live — viewers re-render when a signal it reads changes, e.g. switching the UI language.',
        },
        {
          name: 'OGE_SPREADSHEET_CONFIG',
          type: 'InjectionToken&lt;OgeSpreadsheetConfig&gt;',
          description:
            'The token behind the provider; injects the resolved config.',
        },
        {
          name: 'OGE_DEFAULT_SPREADSHEET_CONFIG / OGE_DEFAULT_SPREADSHEET_MESSAGES',
          type: 'OgeSpreadsheetConfig / OgeSpreadsheetMessages',
          description:
            'The English defaults a partial config or catalog merges over (from the engine, shared with React).',
        },
        {
          name: 'OgeSpreadsheetConfig / OgeSpreadsheetConfigInput',
          type: 'interface',
          description:
            '<code>{ messages, locale? }</code>; the input takes every field optionally and <code>messages</code> partially.',
        },
        {
          name: 'OgeSpreadsheetMessages',
          type: 'interface',
          description:
            'Every user-facing string, as templates with <code>{name}</code> placeholders and ICU plurals (filled by <code>ogeFormatMessage</code> in the viewer&#39;s locale): grid, tab, name box, formula bar and status bar labels, the find bar, the placeholders, the <code>errors</code> and <code>issues</code> blocks (one text per error and import-issue code), and the live-region announcements (<code>cellAnnouncement</code>, <code>selectionAnnouncement</code>, <code>sheetAnnouncement</code>, <code>copied</code>, <code>zoomLabel</code>, …). A partial override replaces a nested block whole; <code>@oge-ui/locales</code> ships translated packs (<code>ogeMergeMessages(OGE_DEFAULT_SPREADSHEET_MESSAGES, tr.spreadsheet)</code>).',
        },
      ],
    },
  ],
};
