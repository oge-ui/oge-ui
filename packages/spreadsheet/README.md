# @oge-ui/spreadsheet

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> Spreadsheet is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> Without a license key, production pages show a small corner notice (never on development hosts). See [LICENSE](LICENSE) and
> [ogeui.com/license](https://www.ogeui.com/license).

A signal-based Angular spreadsheet viewer: `<oge-spreadsheet>` shows `.xlsx`
workbooks the way Excel does. Its engine, `@oge-ui/spreadsheet-engine`, reads
the file in the browser without a dependency and lays every sheet out by
rules measured on a real Excel — not approximated.

**Looks like Excel**

- Column widths, row heights and header sizes from Excel's own font metrics
  (26 fonts, every size); text fitting, `####`, spill over empty neighbours
  and General's digit budget checked against 37,774 Excel samples
- Number formats (258 Excel-recorded cases), the reader's regional built-ins,
  rich text, theme colours and tints, pattern and gradient fills
- Borders drawn on Excel's pixels — thin on the gridline, medium beside it,
  thick and double around it — with Excel's precedence between neighbours
  and its dash patterns
- Excel's gridline grey, its green selection with the white inner line and
  the fill handle, frozen panes with the freeze line, merges, hidden rows and
  columns, zoom with whole-pixel geometry, right-to-left sheets
- Conditional formats (colour scales, data bars, all twenty icon sets, the
  value rules), notes with Excel's red marker, hyperlinks, AutoFilter
  buttons, pictures (cropped, rotated, flipped), dynamic-array spills
- The sheet tabs with tab colours, the name box and formula bar, and the
  status bar's Average / Count / Sum in the active cell's format

**Works like Excel**

- Arrows, Ctrl+arrows (data edges), Shift to extend, Shift+F8 add mode,
  Home / Ctrl+Home / Ctrl+End, Page Up/Down, Alt+Page, Tab/Enter cycling,
  Shift/Ctrl+Space, Ctrl+A (region, then everything), Ctrl+Page Up/Down
  between sheets, Ctrl+= / Ctrl+− and Ctrl+wheel to zoom
- Ctrl+C copies text and Excel-compatible HTML; Ctrl+F finds (wildcards,
  match case, whole cell, all sheets); the name box goes to a reference or a
  defined name; links follow on a click (cancelable `hyperlinkClick`)
- Macros are kept and never run; what the reader cannot show as Excel does
  is reported in `(loaded)`'s `issues`

**Accessibility**

The grid is a `role="grid"` whose active cell is its
`aria-activedescendant`: a screen reader hears the address, the value, the
formula, a merge, a link and a note as you move. Range selections, sheet
switches, copying, zooming and find results are announced politely. All
strings live in `OgeSpreadsheetMessages` (`provideOgeSpreadsheetConfig`).

```html
<oge-spreadsheet [source]="file" (loaded)="issues = $event.issues" />
```

Docs: [ogeui.com/components/spreadsheet](https://www.ogeui.com/components/spreadsheet)
· AI reference: [`llms.txt`](llms.txt)
