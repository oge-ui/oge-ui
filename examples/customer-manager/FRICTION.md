# Friction Log — Customer Manager (`@oge-ui/react@1.1.6`)

Everything below was encountered while building `customer-manager` against the published `@oge-ui/react@1.1.6` npm package and its `llms.txt` documentation.

---

## 1. `<OgeForm>` custom validation rule `validate` must return `string | null`, not `boolean`

### What happened
In `<OgeForm>`, writing a `type: 'custom'` rule whose `validate` callback returned a `boolean` (with a separate `message` property on the rule) failed TypeScript compilation because `OgeCustomRule.validate` returns `string | null` (the error string when invalid, or `null` when valid).

### Exact error text
```text
src/App.tsx(302,13): error TS2322: Type '({ value }: OgeValidationContext) => boolean' is not assignable to type '(context: OgeValidationContext) => string | null'.
  Type 'boolean' is not assignable to type 'string | null'.
```

### Resolution
Updated `validate: ({ value }) => ... ? 'A customer with this email address already exists.' : null`.

---

## 2. `<OgeForm>` `type: 'range'` validation rule is for `Date` bounds, whereas numeric bounds use `type: 'numeric'`

### What happened
Using `{ type: 'range', min: 0, max: 250000 }` on a number field (`mrr` / `seats`) failed TypeScript compilation because `OgeRangeRule` types `min` and `max` as `Date` (`OgeNumericRule` with `type: 'numeric'` carries numeric `min` / `max`).

### Exact error text
```text
src/App.tsx(354,13): error TS2322: Type 'number' is not assignable to type 'Date'.
src/App.tsx(355,13): error TS2322: Type 'number' is not assignable to type 'Date'.
```

### Resolution
Switched the numeric bounds rules on `mrr` and `seats` to `{ type: 'numeric', min: 0, max: 250000, message: '...' }`.

---

## 3. `<OgeButton toggle>` `onSelectedChange` passes `{ selected, event }`, not a `boolean`

### What happened
Passing React's state setter `onSelectedChange={setDarkMode}` directly to `<OgeButton toggle selected={darkMode} />` failed TypeScript compilation because `onSelectedChange` emits `OgeButtonSelectedChangeEvent` (`{ selected: boolean; event: ... }`) rather than a bare `boolean`.

### Exact error text
```text
src/App.tsx(445,15): error TS2322: Type 'Dispatch<SetStateAction<boolean>>' is not assignable to type '(event: OgeButtonSelectedChangeEvent) => void'.
  Types of parameters 'value' and 'event' are incompatible.
    Type 'OgeButtonSelectedChangeEvent' is not assignable to type 'SetStateAction<boolean>'.
```

### Resolution
Changed the handler to `onSelectedChange={(event) => setDarkMode(event.selected)}`.

---

## 4. `OgeGridMessages` and `OgeUploadMessages` catalog property names

### What happened
In `src/main.tsx`, configuring `<OgeGridConfigProvider>` and `<OgeUploadConfigProvider>` with `searchPlaceholder` (instead of `search`), `browse` (instead of `selectSingle`), and `hint` (instead of `labelSingle`) produced TypeScript errors.

### Exact error text
```text
src/main.tsx(26,9): error TS2353: Object literal may only specify known properties, and 'searchPlaceholder' does not exist in type 'Partial<OgeGridMessages>'.
src/main.tsx(59,11): error TS2353: Object literal may only specify known properties, and 'browse' does not exist in type 'Partial<OgeUploadButtonMessages>'.
src/main.tsx(62,11): error TS2353: Object literal may only specify known properties, and 'hint' does not exist in type 'Partial<OgeUploadDropZoneMessages>'.
```

### Resolution
Used the exact catalog keys from `@oge-ui/behavior`: `search` on `OgeGridMessages`, `selectSingle` on `OgeUploadButtonMessages`, and `labelSingle` on `OgeUploadDropZoneMessages`.

---

## 5. `<OgeAvatar src>` rejects `data:image/svg+xml` URLs via `sanitizeResourceUrl`, logging `net::ERR_UNKNOWN_URL_SCHEME`

### What happened
Passing an inline SVG data URL (`data:image/svg+xml;utf8,...`) to `<OgeAvatar src={...}>` caused `@oge-ui/behavior`'s `sanitizeResourceUrl` (`isMarkupDataUrl`) to rewrite `src` to `"about:blank"`, which made Chromium log a console network error for every avatar image.

### Exact error text
```text
Failed to load resource: net::ERR_UNKNOWN_URL_SCHEME
```

### Resolution
Generated raster `data:image/png;base64,...` data URLs (via `<canvas>`) for sample avatars and `blob:` object URLs (`URL.createObjectURL`) for uploaded files, both of which `sanitizeResourceUrl` allows cleanly.

---

## 6. `<OgeGrid>` built-in command column header (`editing={{ mode: 'row' }}`) lacks an `aria-label`, triggering axe `empty-table-header`

### What happened
When `<OgeGrid editing={{ mode: 'row', allowUpdating: true, allowDeleting: true }} />` renders its trailing command column, the header cell `<div class="oge-header-cell oge-command-cell" role="columnheader"></div>` is emitted with no `aria-label` or screen-reader text (unlike `.oge-drag-cell`, `.oge-expander-cell`, and `.oge-checkbox-cell`, which read `reorderColumnHeader`, `detailColumnHeader`, and `selectAllColumnHeader` from `OgeGridMessages`). Running `@axe-core/playwright` flagged an `empty-table-header` violation.

### Exact error text
```json
{
  "id": "empty-table-header",
  "impact": "minor",
  "description": "Ensure table headers have discernible text",
  "nodes": [
    {
      "html": "<div class=\"oge-header-cell oge-command-cell\" role=\"columnheader\"></div>",
      "summary": "Fix any of the following:\n  Element does not have text that is visible to screen readers"
    }
  ]
}
```

### Resolution
Used `editing={{ mode: 'cell', allowUpdating: true }}` for inline cell editing and declared an explicit `{ caption: 'Actions', ... }` column rendering the Delete `<OgeButton>`, resulting in 0 axe violations.

---

## 7. `display: 'block'` on `<OgeSpreadsheet style>` collapses the sheet body

### What happened
Sizing the component with `style={{ display: 'block', height: 560 }}` (the pattern that works for the charts, Gantt and Scheduler hosts) rendered the formula bar, tab strip and status bar but a zero-height sheet body: the host's own stylesheet lays the parts out with a column flex box, and the inline `display` switched it off.

### Resolution
Set the height only (`style={{ height: 560 }}`) and left the host's display alone.

---

## 8. `<OgeSelectBox>` has no `ariaLabel` prop

### What happened
A compact filter without a visible caption needed an accessible name, but `ariaLabel` is not part of `OgeSelectBoxProps` (TS2322), unlike `<OgeGrid>`, `<OgeKanban>` or `<OgeAvatarGroup>`.

### Resolution
Used `label="Region"` with `labelMode="hidden"`, which keeps the name for assistive technology while hiding the caption.


---

## 9. Overriding `display` on any OGE host breaks its layout (spreadsheet, BPMN, …)

### What happened
The spreadsheet trap above turned out to be general. `<OgeBpmnEditor style={{ display: 'block', height: 580 }}>`
rendered, but its body grew to 945px inside a 580px host: the editor lays out its header and body
with a column flex box, and the inline `display` switched it off. Because `zoomToFit()` centres the
diagram in the *measured* body, every imported diagram sat at the bottom edge, half clipped — it
looked like a fitting bug in the editor.

### Resolution
Size OGE hosts with `height` only and never set `display` on them. All examples now do so, and call
`zoomToFit()` after `importXml()` resolves.
