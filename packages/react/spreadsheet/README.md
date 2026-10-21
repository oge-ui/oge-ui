# @oge-ui/react-spreadsheet

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> Spreadsheet is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> Without a license key, production pages show a small corner notice (never on development hosts). See [LICENSE](LICENSE) and
> [ogeui.com/license](https://www.ogeui.com/license).

A React spreadsheet viewer: `<OgeSpreadsheet>` shows `.xlsx` workbooks the
way Excel does — column widths, row heights and fonts from Excel's own
metrics, its number formats, borders, fills, conditional formats, frozen
panes, merges, pictures, notes and links, with Excel's selection, keyboard
map, find, copy and status bar.

It runs the same framework-free engine as the Angular
[`@oge-ui/spreadsheet`](https://www.npmjs.com/package/@oge-ui/spreadsheet) —
[`@oge-ui/spreadsheet-engine`](https://www.npmjs.com/package/@oge-ui/spreadsheet-engine),
installed with it, which reads the file in the browser without a dependency —
and renders the same markup, so it loads the same stylesheet.

```sh
npm install @oge-ui/react-spreadsheet
```

```tsx
import { OgeSpreadsheet } from '@oge-ui/react-spreadsheet';
import '@oge-ui/react-spreadsheet/styles.css';

export function Viewer({ file }: { file: File }) {
  return <OgeSpreadsheet source={file} style={{ height: 480 }} />;
}
```

`onLoaded` reports what could not be shown as Excel shows it (`event.issues`).

- Every Angular input is a prop, every output an `onX` callback, the two-way
  models are controlled/uncontrolled pairs (`activeSheet` +
  `defaultActiveSheet` + `onActiveSheetChange`, `zoom` + `defaultZoom` +
  `onZoomChange`), and the public methods live on the `ref` handle (`open`,
  `goTo`, `find`, `copy`, `print`, …).
- Accessibility: the grid is a `role="grid"` whose active cell is its
  `aria-activedescendant` — a screen reader hears the address, the value, the
  formula, a merge, a link and a note as you move; selections, sheet
  switches, copying, zooming and find results are announced politely.
- Macros are kept and never run; what the reader cannot show as Excel does is
  reported in `onLoaded`'s `issues`.
- Configuration and i18n: `<OgeSpreadsheetConfigProvider config={{ messages, locale }}>`.
- StrictMode- and SSR-safe: the controller survives React's double mount, and
  a server render paints the chrome without touching the DOM.

Docs and live demos: [ogeui.com/components/spreadsheet](https://www.ogeui.com/components/spreadsheet)
(switch the header to React).

## License

Source-available commercial software — free for evaluation and development,
a paid license for production. See [LICENSE](LICENSE) and
[ogeui.com/license](https://www.ogeui.com/license).
