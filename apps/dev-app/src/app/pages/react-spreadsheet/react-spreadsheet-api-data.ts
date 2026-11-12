// Hand-compiled from packages/react/spreadsheet/src/lib/** — keep in sync with
// the source TSDoc.
//
// Mirrors `pages/spreadsheet/spreadsheet-api-data.ts` block for block and
// group for group, so the two views read as one page across the switch and
// the parity gate can diff them member by member. What differs is the idiom —
// controlled/uncontrolled pairs instead of `model()`, `on`-prefixed callbacks
// instead of outputs, a `ref` handle instead of public methods, a context
// provider instead of DI.
import type { ApiSections } from '../../shared/api-reference';
import { SPREADSHEET_TYPE_BLOCKS } from '../spreadsheet/spreadsheet-api-data';

export const OGE_REACT_SPREADSHEET_API: ApiSections = {
  properties: [
    {
      title: 'Content',
      entries: [
        {
          name: 'source',
          type: 'OgeSpreadsheetSource | null',
          default: 'null',
          description:
            'The workbook to open: bytes, a <code>Blob</code> / <code>File</code>, or a URL. A new value opens it, cancelling a read still running; back to <code>null</code>, it closes what it opened (a <code>workbook</code> given directly stays). Read in the browser by the dependency-free reader; nothing is uploaded.',
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
            'BCP 47 locale of the built-in number formats, separators and month names — Excel takes them from the reader&#39;s region. Default: the provider&#39;s locale, else the browser&#39;s. Pass it in server-rendered apps.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeSpreadsheetMessages&gt;',
          default: '{}',
          description:
            'Per-instance overrides of the message catalog, merged over the provider&#39;s. Every user-facing string lives there — aria labels and live-region announcements included.',
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
      title: 'State (controlled / uncontrolled)',
      entries: [
        {
          name: 'activeSheet / defaultActiveSheet',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'The active sheet&#39;s index (controlled), or the first one (uncontrolled). A value given before the workbook opens is held until it does, and wins over the file&#39;s own active sheet; hidden sheets are refused. Each sheet keeps its selection, zoom and scroll position.',
        },
        {
          name: 'onActiveSheetChange',
          type: '(index: number) =&gt; void',
          description:
            'The active sheet changed — a tab, Ctrl+Page Down, find, a link.',
        },
        {
          name: 'zoom / defaultZoom',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'The active sheet&#39;s zoom in percent (10–400; controlled), or the first one (uncontrolled); each sheet keeps its own. Geometry stays in whole pixels per row and column, as Excel draws it.',
        },
        {
          name: 'onZoomChange',
          type: '(zoom: number) =&gt; void',
          description:
            'The zoom changed — the status bar, Ctrl+wheel, Ctrl+= / Ctrl+−, a sheet switch.',
        },
      ],
    },
    {
      title: 'Host',
      entries: [
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Classes and styles of the root element — give it a height.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'core',
          type: 'OgeSpreadsheetCore',
          description:
            'The framework-free controller from <code>@oge-ui/spreadsheet-engine</code> (ADR 0003) — selection, keyboard map, find, copy, the grid frame, pointer gestures, column widths and row heights (<code>resizeColumns</code>, <code>resizeRows</code>, <code>autofitColumns</code>, <code>autofitRows</code>, as dragging and double-clicking a header&#39;s edge do; <code>contextMenu</code>, <code>openHeaderMenu</code>, <code>openSizeDialog</code>, <code>submitSizeDialog</code> and <code>unhide</code> behind a header&#39;s menu) and announcements. The Angular viewer runs the same class.',
        },
        {
          name: 'open(source)',
          type: '(source: OgeSpreadsheetSource) =&gt; Promise&lt;void&gt;',
          description:
            'Opens a workbook; resolves once it is shown (or failed) and <code>onLoaded</code> / <code>onLoadError</code> ran.',
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
      title: 'Callbacks',
      entries: [
        {
          name: 'onLoaded',
          type: '(event: OgeSpreadsheetLoadedEvent) =&gt; void',
          description:
            'A workbook opened from <code>source</code> or <code>open()</code>.',
        },
        {
          name: 'onLoadError',
          type: '(event: OgeSpreadsheetLoadErrorEvent) =&gt; void',
          description:
            'Opening failed; the placeholder shows the error&#39;s message.',
        },
        {
          name: 'onSelectionChange',
          type: '(event: OgeSpreadsheetSelectionChangeEvent) =&gt; void',
          description:
            'The selection changed — keys, pointer, find, go to, a sheet switch.',
        },
        {
          name: 'onHyperlinkClick',
          type: '(event: OgeSpreadsheetHyperlinkClickEvent) =&gt; void',
          description:
            'An external link is about to open (a click, or Alt+Enter); set <code>event.cancel</code> to keep it. It opens in a new browsing context without an opener.',
        },
        {
          name: 'onCellClick',
          type: '(event: OgeSpreadsheetCellClickEvent) =&gt; void',
          description:
            'A cell was clicked (<code>event.event</code> is the native pointer event).',
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
          name: 'OgeSpreadsheetConfigProvider',
          type: '({ config?: OgeSpreadsheetConfigInput; children }) =&gt; JSX.Element',
          description:
            'Configures every viewer below: <code>messages</code> (merged over the defaults) and <code>locale</code>. Nested providers merge over the outer one; a new <code>config</code> object re-resolves the subtree (switching the UI language is a state change).',
        },
        {
          name: 'useOgeSpreadsheetConfig()',
          type: '() =&gt; OgeSpreadsheetConfig',
          description: 'The resolved config of the current subtree.',
        },
        {
          name: 'OGE_DEFAULT_SPREADSHEET_CONFIG / OGE_DEFAULT_SPREADSHEET_MESSAGES',
          type: 'OgeSpreadsheetConfig / OgeSpreadsheetMessages',
          description:
            'The English defaults a partial config or catalog merges over (from the engine, shared with Angular).',
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
        {
          name: 'OgeSpreadsheetProps / OgeSpreadsheetHandle',
          type: 'interface',
          description: 'The props above, and what a <code>ref</code> receives.',
        },
      ],
    },
  ],
};

export const OGE_REACT_PRESENTATION_API: ApiSections = {
  properties: [
    {
      title: 'Content',
      entries: [
        {
          name: 'source',
          type: 'OgePresentationSource | null',
          default: 'null',
          description:
            'The presentation to open: bytes, a <code>Blob</code> / <code>File</code>, or a URL.',
        },
        {
          name: 'slideIndex',
          type: 'number',
          default: '0',
          description:
            '0-based current slide; with <code>onSlideIndexChange</code> it is controlled.',
        },
        {
          name: 'thumbnails',
          type: 'boolean',
          default: 'true',
          description: 'Shows the slide rail.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgePresentationMessages&gt;',
          default: '{}',
          description: 'Overrides of the message catalog.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'onSlideIndexChange',
          type: '(index: number) =&gt; void',
          description: 'When the slide changes.',
        },
        {
          name: 'onLoaded',
          type: 'OgePresentationLoadedEvent',
          description:
            'After a presentation opened, with what could not be shown.',
        },
        {
          name: 'onLoadError',
          type: 'OgePresentationLoadErrorEvent',
          description: 'When a presentation did not open.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgePresentationConfig / OgePresentationConfigInput',
          type: 'interface',
          description:
            'Defaults for viewers below <code>OgePresentationConfigProvider</code>: <code>{ messages }</code>, merged over the built-in text.',
        },
        {
          name: 'OgePresentationSource',
          type: 'ArrayBuffer | Uint8Array | Blob | string',
          description:
            'What the viewer opens: the file&#39;s bytes, a <code>Blob</code> / <code>File</code>, or a URL fetched with same-origin credentials.',
        },
        {
          name: 'OgePresentationLoadedEvent',
          type: 'interface',
          description:
            '<code>{ slideCount, issues }</code> — the number of slides and everything not shown as PowerPoint shows it.',
        },
        {
          name: 'OgePresentationLoadErrorEvent',
          type: 'interface',
          description:
            '<code>{ code, message }</code> — why the file did not open.',
        },
        {
          name: 'OgePresentationErrorCode',
          type: "'not-pptx' | 'encrypted-or-legacy' | 'corrupt' | 'too-large' | 'aborted' | 'fetch-failed'",
          description:
            '<code>encrypted-or-legacy</code> covers password-protected files and the old <code>.ppt</code> format.',
        },
        {
          name: 'OgePresentationMessages',
          type: 'interface',
          description:
            'The viewer&#39;s text: <code>viewerLabel</code>, <code>slideLabel</code> (with <code>{current}</code> and <code>{total}</code>), <code>previousSlide</code>, <code>nextSlide</code>, <code>thumbnails</code>, <code>loading</code>, <code>empty</code>, <code>loadError</code> and <code>encryptedOrLegacy</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_WORD_DOCUMENT_API: ApiSections = {
  properties: [
    {
      title: 'Content',
      entries: [
        {
          name: 'source',
          type: 'OgeWordDocumentSource | null',
          default: 'null',
          description:
            'The document to open: bytes, a <code>Blob</code> / <code>File</code>, or a URL.',
        },
        {
          name: 'pageIndex',
          type: 'number',
          default: '0',
          description:
            '0-based page to show; with <code>onPageIndexChange</code> it is controlled.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeWordDocumentMessages&gt;',
          default: '{}',
          description: 'Overrides of the message catalog.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'onPageIndexChange',
          type: '(index: number) =&gt; void',
          description:
            'When the page nearest the viewport&#39;s middle changes.',
        },
        {
          name: 'onLoaded',
          type: 'OgeWordDocumentLoadedEvent',
          description: 'After a document opened, with what could not be shown.',
        },
        {
          name: 'onLoadError',
          type: 'OgeWordDocumentLoadErrorEvent',
          description: 'When a document did not open.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeWordDocumentSource',
          type: 'ArrayBuffer | Uint8Array | Blob | string',
          description:
            'What the viewer opens: the file&#39;s bytes, a <code>Blob</code> / <code>File</code>, or a URL fetched with same-origin credentials.',
        },
        {
          name: 'OgeWordDocumentLoadedEvent',
          type: 'interface',
          description:
            '<code>{ pageCount, issues }</code> — the number of pages and everything not shown as Word shows it.',
        },
        {
          name: 'OgeWordDocumentLoadErrorEvent',
          type: 'interface',
          description:
            '<code>{ code, message }</code> — why the file did not open.',
        },
        {
          name: 'OgeWordDocumentErrorCode',
          type: "'not-docx' | 'encrypted-or-legacy' | 'corrupt' | 'too-large' | 'aborted' | 'fetch-failed'",
          description:
            '<code>encrypted-or-legacy</code> covers password-protected files and the old <code>.doc</code> format.',
        },
        {
          name: 'OgeWordDocumentMessages',
          type: 'interface',
          description:
            'The viewer&#39;s text: <code>viewerLabel</code>, <code>pageLabel</code> (with <code>{current}</code> and <code>{total}</code>), <code>previousPage</code>, <code>nextPage</code>, <code>loading</code>, <code>empty</code>, <code>loadError</code> and <code>encryptedOrLegacy</code>.',
        },
        {
          name: 'OgeWordDocumentConfig / OgeWordDocumentConfigInput',
          type: 'interface',
          description:
            'Defaults for viewers below the config provider: <code>{ messages }</code>, merged over the built-in text.',
        },
      ],
    },
  ],
};

export const OGE_REACT_PDF_VIEWER_API: ApiSections = {
  properties: [
    {
      title: 'Content',
      entries: [
        {
          name: 'source',
          type: 'OgePdfSource | null',
          default: 'null',
          description:
            'The PDF to open: bytes, a <code>Blob</code> / <code>File</code>, or a URL.',
        },
        {
          name: 'pageIndex',
          type: 'number',
          default: '0',
          description:
            '0-based page to show; with <code>onPageIndexChange</code> it is controlled.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgePdfViewerMessages&gt;',
          default: '{}',
          description: 'Overrides of the message catalog.',
        },
      ],
    },
    {
      title: 'View',
      entries: [
        {
          name: 'zoom',
          type: 'OgePdfZoom',
          default: "'fit-width'",
          description:
            'A scale or a fit; with <code>onZoomChange</code> it is controlled. Ctrl + / − / 0 zoom from the keyboard.',
        },
        {
          name: 'showThumbnails',
          type: 'boolean',
          default: 'false',
          description:
            'The page thumbnail sidebar; with <code>onShowThumbnailsChange</code> it is controlled.',
        },
        {
          name: 'toolbar',
          type: 'boolean',
          default: 'true',
          description:
            'The toolbar: pages, zoom, the two fits, find in document and print.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'onPageIndexChange',
          type: '(index: number) =&gt; void',
          description:
            'When the page nearest the viewport&#39;s middle changes.',
        },
        {
          name: 'onZoomChange',
          type: '(zoom: OgePdfZoom) =&gt; void',
          description: 'When the toolbar or the keyboard changes the zoom.',
        },
        {
          name: 'onShowThumbnailsChange',
          type: '(show: boolean) =&gt; void',
          description: 'When the toolbar toggles the thumbnails.',
        },
        {
          name: 'onLoaded',
          type: 'OgePdfLoadedEvent',
          description: 'After a document opened.',
        },
        {
          name: 'onLoadError',
          type: 'OgePdfLoadErrorEvent',
          description: 'When a document did not open.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'print()',
          type: '() =&gt; Promise&lt;void&gt;',
          description:
            'Prints every page at print resolution (the toolbar&#39;s Print button).',
        },
        {
          name: 'search(query)',
          type: '(query: string) =&gt; Promise&lt;void&gt;',
          description:
            'Finds <code>query</code> (case- and accent-insensitive) on every page and moves to the first match.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgePdfSource',
          type: 'ArrayBuffer | Uint8Array | Blob | string',
          description:
            'What the viewer opens: the file&#39;s bytes, a <code>Blob</code> / <code>File</code>, or a URL fetched with same-origin credentials.',
        },
        {
          name: 'OgePdfZoom',
          type: "number | 'fit-width' | 'fit-page'",
          description:
            'A scale (<code>1</code> = 100 %, from 0.25 to 4) or one of the two fits, which follow the viewer&#39;s size.',
        },
        {
          name: 'OgePdfLoadedEvent',
          type: 'interface',
          description: '<code>{ pageCount }</code> — the number of pages.',
        },
        {
          name: 'OgePdfLoadErrorEvent',
          type: 'interface',
          description:
            '<code>{ code, message }</code> — why the file did not open.',
        },
        {
          name: 'OgePdfErrorCode',
          type: "'fetch-failed' | 'password' | 'invalid' | 'pdfjs-missing'",
          description:
            '<code>pdfjs-missing</code>: <code>pdfjs-dist</code> is not installed or the <code>pdfjs</code> loader failed.',
        },
        {
          name: 'OgePdfViewerMessages',
          type: 'interface',
          description:
            'The viewer&#39;s text: <code>viewerLabel</code>, <code>pageLabel</code> (with <code>{current}</code> and <code>{total}</code>), <code>previousPage</code>, <code>nextPage</code>, <code>zoomIn</code>, <code>zoomOut</code>, <code>fitWidth</code>, <code>fitPage</code>, <code>zoomLevel</code> (<code>{zoom}</code>), <code>thumbnails</code>, <code>search</code>, <code>searchNext</code>, <code>searchPrevious</code>, <code>matchCount</code>, <code>noMatches</code>, <code>print</code>, <code>loading</code>, <code>empty</code>, <code>loadError</code> and <code>passwordProtected</code>. Defaults in <code>OGE_DEFAULT_PDF_VIEWER_MESSAGES</code>.',
        },
        {
          name: 'OgePdfViewerConfig / OgePdfViewerConfigInput',
          type: 'interface',
          description:
            'Defaults for viewers below the config provider: <code>{ messages, pdfjs, workerSrc }</code>. <code>workerSrc</code> is the URL your app serves <code>pdfjs-dist/build/pdf.worker.min.mjs</code> from; <code>pdfjs</code> replaces the default <code>() =&gt; import(&#39;pdfjs-dist&#39;)</code> loader.',
        },
        {
          name: 'OgePdfViewerHandle',
          type: 'interface',
          description:
            'What a <code>ref</code> reaches: <code>print()</code> and <code>search(query)</code>.',
        },
        {
          name: 'OgePdfViewerConfigProvider / useOgePdfViewerConfig',
          type: 'component / hook',
          description:
            'Wrap a subtree in <code>&lt;OgePdfViewerConfigProvider config={{ workerSrc }}&gt;</code> to set the worker URL, the loader and the text; nested providers merge over the outer one.',
        },
      ],
    },
  ],
};
