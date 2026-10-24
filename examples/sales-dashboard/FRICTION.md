# Friction Log — Sales Dashboard (`oge-ui@1.1.6`)

Everything below was encountered while building `sales-dashboard` against the published `oge-ui@1.1.6` npm package and its `llms.txt` documentation.

---

## 1. `<oge-button>` does not accept an `[icon]` input (inconsistent with other OGE components)

### What happened
`<oge-chip>`, `<oge-toolbar-item>`, `<oge-menubar-item>`, and `<oge-breadcrumb-item>` all accept an `[icon]="svgPathData"` input. Assuming `<oge-button>` worked the same way produced a template compiler error.

### Exact error text
```text
✘ [ERROR] NG8002: Can't bind to 'icon' since it isn't a known property of 'oge-button'. (If 'oge-button' is an Angular component and it has 'icon' input, then verify that it is part of this module.) [plugin angular-compiler]

    src/app/app.ts:49:14:
      49 │               [icon]="moonIcon"
         ╵               ~~~~~~~~~~~~~~~~~
```

### Resolution
`<oge-button>` requires projecting an `<svg ogeButtonIcon>` element using the `OgeButtonIcon` directive rather than passing an `[icon]` string input.

---

## 2. `OgeDateRangeBox` value type and `ogeDateRangePresets` API shape

### What happened
1. Attempting to import `OgeDateRange` from `oge-ui` failed because the range value type is named `OgeCalendarRange` (`readonly [Date | null, Date | null]`), a 2-tuple rather than `{ start: Date | null; end: Date | null }`.
2. Attempting to call `ogeDateRangePresets({...})` as a function failed because `ogeDateRangePresets` is an object of factory methods (`today()`, `last7Days()`, `last30Days()`, `thisMonth()`, `lastMonth()`).

### Exact error text
```text
✘ [ERROR] TS2724: '"oge-ui"' has no exported member named 'OgeDateRange'. Did you mean 'OgeDateRangeBox'? [plugin angular-compiler]

    src/app/app.ts:27:7:
      27 │   type OgeDateRange,
         ╵        ~~~~~~~~~~~~

✘ [ERROR] TS2349: This expression is not callable.
  Type '{ today(label?: string): OgeDateRangePreset; yesterday(label?: string): OgeDateRangePreset; last7Days(label?: string): OgeDateRangePreset; last30Days(label?: string): OgeDateRangePreset; thisMonth(label?: string): OgeDateRangePreset; lastMonth(label?: string): OgeDateRangePreset; }' has no call signatures. [plugin angular-compiler]

    src/app/app.ts:346:26:
      346 │   protected readonly presets = ogeDateRangePresets({
          ╵                                ~~~~~~~~~~~~~~~~~~~
```

### Resolution
Used `OgeCalendarRange` (`[null, null]`) and passed `[ogeDateRangePresets.today('Today'), ogeDateRangePresets.last7Days('Last 7 days'), ...]`.

---

## 3. Declarative `<oge-column [format]>` does not accept Angular-style preset strings or `precision`

### What happened
Passing `format="mediumDate"`, `format="integer"`, or `{ type: 'currency', currency: 'USD', precision: 0 }` on `<oge-column>` failed type-checking because `OgeColumnFormat` only accepts `(value: unknown) => string` or `OgeValueFormat` (`{ type: 'date', dateStyle: 'medium' }`, `{ type: 'number', maximumFractionDigits: 0 }`, `{ type: 'currency', currency: 'USD', maximumFractionDigits: 0 }`).

### Exact error text
```text
✘ [ERROR] TS2322: Type '"mediumDate"' is not assignable to type 'OgeColumnFormat | undefined'. [plugin angular-compiler]

    src/app/app.ts:198:18:
      198 │                   format="mediumDate"
          ╵                   ~~~~~~

✘ [ERROR] TS2353: Object literal may only specify known properties, and 'precision' does not exist in type 'OgeValueFormat'. [plugin angular-compiler]

    src/app/app.ts:241:61:
      241 │                   [format]="{ type: 'currency', currency: 'USD', precision: 0 }"
          ╵                                                                  ~~~~~~~~~
```

### Resolution
Switched to `{ type: 'date', dateStyle: 'medium' }`, `{ type: 'number', maximumFractionDigits: 0 }`, and `{ type: 'currency', currency: 'USD', maximumFractionDigits: 0 }`.

---

## 4. `provideOge<Family>Config` option and message-key mismatches across families

### What happened
Several config options that exist as component inputs (`rowAlternation` on `<oge-grid>`, `stylingMode` and `size` on `<oge-button>` / `<oge-text-box>`) are not accepted by `provideOgeGridConfig`, `provideOgeInputsConfig`, or `provideOgeButtonsConfig`. In addition, several message catalog keys differ from intuitive names (`groupPanelHint` vs `groupPanelEmpty`, `clearButton` vs `clear`, `toastDisplayTime` vs `toastDurationMs`, `toastClose` / `modalClose` vs `close`).

### Exact error text
```text
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'rowAlternation' does not exist in type 'OgeGridConfigInput'. [plugin angular-compiler]
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'groupPanelEmpty' does not exist in type 'Partial<OgeGridMessages>'. [plugin angular-compiler]
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'clear' does not exist in type 'Partial<OgeInputsMessages>'. [plugin angular-compiler]
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'stylingMode' does not exist in type 'OgeButtonsConfigInput'. [plugin angular-compiler]
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'toastDurationMs' does not exist in type 'OgeOverlayConfigInput'. [plugin angular-compiler]
✘ [ERROR] TS2353: Object literal may only specify known properties, and 'close' does not exist in type 'Partial<OgeOverlayMessages>'. [plugin angular-compiler]
```

### Resolution
Inspected `@oge-ui/behavior` `.d.ts` definitions to find the exact `Oge*ConfigInput` and `Oge*Messages` keys (`groupPanelHint`, `clearButton`, `dropDownToggle`, `noDataText`, `toastDisplayTime`, `toastClose`, `modalClose`).

---

## 5. Angular CLI CommonJS warning when using `@oge-ui/grid/export-excel` (`exceljs`)

### What happened
Importing `exportGridToExcel` from `@oge-ui/grid/export-excel` pulls in `exceljs`, which causes Angular's `@angular/build:application` builder to emit a CommonJS bailout warning unless `"allowedCommonJsDependencies": ["exceljs"]` is added to `angular.json`.

### Exact error text
```text
▲ [WARNING] Module 'exceljs' used by 'node_modules/@oge-ui/behavior/export-excel.esm.js' is not ESM

  CommonJS or AMD dependencies can cause optimization bailouts.
  For more information see: https://angular.dev/tools/cli/build#configuring-commonjs-dependencies
```

### Resolution
Added `"allowedCommonJsDependencies": ["exceljs"]` under `projects.sales-dashboard.architect.build.options` in `angular.json`.

---

## 6. Calling `importXml()` inside an `effect()` freezes the page

### What happened
Loading the sample process with `effect(() => { const editor = this.bpmnEditor(); if (editor) void editor.importXml(xml); })` hung the browser tab the moment the Workflows page opened. `importXml` reads and then writes the editor's own signals; because the call ran inside the effect's reactive context, those signals became dependencies of the effect, every write re-ran it, and the import never finished.

### Exact error text
None — the main thread never yields, so no error is logged.

### Resolution
Wrapped the call in `untracked(() => editor.importXml(xml))` so the effect only depends on the `viewChild` and the active-view signal. A note in the `@oge-ui/bpmn` docs ("call `importXml` from `afterNextRender` or inside `untracked`") would have saved the debugging session.

---

## 7. `display: block` on `<oge-spreadsheet>` collapses the sheet body

### What happened
Sizing the component with `style="display: block; height: 560px"` (the pattern that works for the charts, Gantt and Scheduler hosts) rendered the formula bar, tab strip and status bar but a zero-height sheet body: the host's own stylesheet lays the parts out with a column flex box, and the inline `display: block` switched it off.

### Resolution
Set the height only (`style="height: 560px"`) and left the host's display alone. The same applies to the React `<OgeSpreadsheet style>`.


---

## 8. Overriding `display` on any OGE host breaks its layout (spreadsheet, BPMN, …)

### What happened
The spreadsheet trap above turned out to be general. `<oge-bpmn-editor style="display: block; height: 580px">`
rendered, but its body grew to 945px inside a 580px host: the editor lays out its header and body
with a column flex box, and the inline `display` switched it off. Because `zoomToFit()` centres the
diagram in the *measured* body, every imported diagram sat at the bottom edge, half clipped — it
looked like a fitting bug in the editor.

### Resolution
Size OGE hosts with `height` only and never set `display` on them. All examples now do so, and call
`zoomToFit()` after `importXml()` resolves.
