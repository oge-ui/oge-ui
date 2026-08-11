# @oge-ui/inputs

Signal-based Angular form editors sharing one field chrome and working with
three form systems at once. Fifteen editors ship today: `oge-text-box`,
`oge-text-area`, `oge-number-box`, the dropdown family (`oge-select-box`,
`oge-tag-box`, `oge-autocomplete`), toggle controls (`oge-check-box`,
`oge-switch`, `oge-radio-group`), date editors (`oge-calendar`,
`oge-date-box`, `oge-date-range-box`), the APG sliders (`oge-slider`,
`oge-range-slider` — arrows/PageUp/Home/End, live drag commits with
Escape-to-cancel, dynamic aria constraints between range thumbs) and the
color editor (`oge-color-box`).

## Features

- **One field chrome**: label modes `static | floating | hidden | outside`,
  styling modes `outlined | filled | underlined`, sizes `sm | md | lg`
  (28/34/42px, the button scale), `[ogeInputPrefix]`/`[ogeInputSuffix]`
  slots, clear button, tooltip, and a subscript region for hint/error/counter
  with `subscriptSizing: fixed | dynamic | none` — `fixed` reserves the line
  so appearing errors never shift your layout.
- **Triple forms integration**: standalone `[(value)]`; **Signal Forms**
  via `[formField]` (the components implement the `FormValueControl`
  contract, so schema constraints like `required`/`min`/`maxLength`
  auto-bind); classic reactive/template forms via a `ControlValueAccessor`
  bridge.
- **Validation UX**: messages resolve from the i18n config
  (`provideOgeInputsConfig`), display per `errorDisplay: touched | dirty |
always`, announce via `aria-live`, and chain `aria-describedby` across
  hint/error/counter. `errorText` overrides everything; `invalid`/`pending`
  work manually for non-forms usage.
- **Grapheme-accurate counter**: `showCounter` counts what users perceive
  (`Intl.Segmenter`): an emoji family is 1 character, not 8 code units.
  `counterMode: 'soft'` allows typing past the limit and flags the counter.
- **Password reveal & copy** — `mode="password"` auto-adds a reveal toggle
  that flips the type in place (caret preserved, `aria-pressed`);
  `showCopyButton` adds one-click copy with a live-region "Copied"
  announcement.
- **Async indicator** — `pending` renders a spinner in the rail;
  `showSuccessIcon: 'touched' | 'always'` completes the triad.
- **Debounced commits** — `debounce` batches `value`/forms updates; blur and
  Enter flush immediately; `inputChange` streams every keystroke regardless.
- **Number box**: `value: number | null` (empty is `null`, never
  `0`), locale-aware parsing (`1.234,56`, NBSP groups, `−`),
  `Intl.NumberFormat` display on blur with raw editing on focus, clamp to
  `min`/`max` on commit, spin buttons with hold-to-repeat plus
  ArrowUp/ArrowDown.
- **Auto-resize textarea** — `autoResize` grows between `minRows`/`maxRows`
  using CSS `field-sizing: content` with a measurement fallback.
- **Color box**: `value` is a CSS color string normalized to `format:
'hex' | 'rgb' | 'rgba' | 'hsl'` on commit; the popup dialog composes a
  saturation/brightness surface, hue/alpha APG sliders (`aria-valuetext`),
  hex + channel inputs and a `role="grid"` swatch palette
  (`view: 'gradient' | 'palette' | 'both'`); typed text parses any CSS color
  incl. named colors; `applyValueMode: 'instantly' | 'useButtons'`.
- **Select box**: WAI-ARIA combobox with `aria-activedescendant` (focus
  never leaves the input), `displayExpr`/`valueExpr` data mapping (string or
  function), debounced client-side search (`searchEnabled`, `searchMode`,
  `searchExpr`, `searchTimeout`, `minSearchLength`, `showDataBeforeSearch`)
  with a `searchChanged` + `loading` server-side escape hatch, flat-data
  grouping via `groupBy`, custom values (`acceptCustomValue` +
  `customItemCreating`), lazy `items` functions with loading/error rows,
  per-item `disabledExpr`, `itemTemplate`, select-only type-ahead, and a
  flip-aware popup from `@oge-ui/overlay` that matches the field width.

## Installation

```sh
npm install @oge-ui/inputs
```

Requires Angular ≥ 22 (`@angular/forms` peer). All components are standalone.

## Quick start

```ts
import { Component, signal } from '@angular/core';
import { form, required, minLength } from '@angular/forms/signals';
import { FormField } from '@angular/forms/signals';
import { OgeTextBox, OgeNumberBox } from '@oge-ui/inputs';

@Component({
  selector: 'app-demo',
  imports: [OgeTextBox, OgeNumberBox, FormField],
  template: `
    <!-- standalone -->
    <oge-text-box label="Search" [(value)]="query" [debounce]="300" [showClearButton]="true" />

    <!-- Signal Forms: schema constraints auto-bind -->
    <oge-text-box label="Username" [formField]="f.username" />
    <oge-number-box label="Price" [formField]="f.price" [format]="{ style: 'currency', currency: 'EUR' }" [showSpinButtons]="true" />
  `,
})
export class DemoComponent {
  readonly query = signal('');
  readonly model = signal({ username: '', price: null as number | null });
  readonly f = form(this.model, (p) => {
    required(p.username);
    minLength(p.username, 3);
  });
}
```

Reactive forms work unchanged: `<oge-text-box [formControl]="control" />`.

## Dropdown editors

`oge-select-box` (described above) is the single-value combobox. Two siblings
share its data mapping, search and popup machinery. `oge-tag-box` is the
multi-select variant: `value` is a readonly array, selected items render as
chips in the field, options get checkboxes (`showSelectionControls`),
`maxDisplayedTags` collapses overflow into a `+N` chip and
`hideSelectedItems` removes picked options from the list.
`oge-autocomplete` is free text with suggestions: `value` is the string
itself, not a picked item. `minSearchLength` and `maxItemCount` bound the
list, `forceSelection` snaps to a matching item on blur, `searchHighlight`
marks the matched substring, and `items` also accepts a lazy function for
server-side lookups.

`oge-tree-select` is the hierarchical one: the same field chrome with a full
`oge-tree-view` (from `@oge-ui/navigation`) as the popup. `value` is the
selected node's key — or an array of keys with `selectionMode="multiple"` —
and it forwards the tree's whole surface: flat or nested data,
`showCheckBoxes` with the tri-state cascade, in-popup `searchEnabled`,
`loadChildren` for lazy branches and `virtualScroll`. `selectedKeysMode`
picks what a cascade actually stores (`'leavesOnly'` is usually it).

All of them support `displayExpr`/`disabledExpr` data mapping,
`virtualScroll` for large lists and the flip-aware popup from
`@oge-ui/overlay`.

```html
<oge-tag-box label="Regions" [items]="regions" [searchEnabled]="true" [(value)]="selected" /> <oge-autocomplete label="City" [items]="cities" [minSearchLength]="2" [(value)]="city" /> <oge-tree-select label="Folder" [items]="folders" displayExpr="name" [(value)]="folderId" />
```

## Toggle controls

`oge-check-box` binds `value: boolean | null` and supports an indeterminate
third state via `threeState`; `text` renders an inline label next to the box.
`oge-switch` is the on/off variant with optional `onText`/`offText` in the
track. `oge-radio-group` renders one radio per entry in `items`, maps objects
with `displayExpr`/`valueExpr` like the select box, lays out `vertical` or
`horizontal`, and accepts an `itemTemplate`. All of them plug into the same
three form systems as the text editors.

```html
<oge-check-box text="Accept terms" [(value)]="accepted" />
<oge-switch label="Notifications" [(value)]="notify" />
<oge-radio-group label="Priority" [items]="['Low', 'Normal', 'High']" [(value)]="priority" />
```

## Date editors

The date stack is built on the native `Date` object and the `Intl` APIs;
there is no date library in the dependency tree. Typed input parses
locale-aware (`parseDateText`), and display formats are plain
`Intl.DateTimeFormatOptions` or a custom function.

`oge-calendar` is the standalone picker: `selectionMode` of `single`,
`multiple` or `range`, drill-down between `month`/`year`/`decade` zoom
levels, one or two side-by-side views (`viewsCount`), `min`/`max` and
`disabledDates`, optional week numbers and today button, and an
`*ogeCalendarCellTemplate` for custom cells. `oge-date-box` wraps a calendar
in the field chrome with `type: 'date' | 'time' | 'datetime'` (time picking
as a `list` or `columns` view, `interval` minutes apart) and
`applyValueMode: 'instantly' | 'useButtons'`. `oge-date-range-box` edits a
`[start, end]` tuple through a single field backed by a two-view range
calendar.

```html
<oge-calendar [(value)]="date" [showTodayButton]="true" />
<oge-date-box label="Due" type="datetime" [(value)]="due" />
<oge-date-range-box label="Period" [(value)]="period" />
```

## Suffix rail order (contract)

`prefix | input | pending-spinner ⊻ success-icon | copy | reveal | clear |
spin | custom suffix`. The counter renders in the subscript end slot, never in
the rail. Reveal and copy are tabbable; clear and spin are pointer
affordances (`tabindex="-1"` — keyboard users clear via select-all+Delete and
step via arrow keys).

## Reacting to changes — event reference

Everything you would wire through callback-style widget APIs exists here, signal-first:

| Reference API                                  | OGE                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `onValueChanged`                               | `(valueCommitted)` → `{ value, previousValue, event }` (`event === undefined` = programmatic) — or the `value` model / `(valueChange)` |
| `onInput`                                      | `(inputChange)` → `{ text, event }` every keystroke                                                                                    |
| `valueChangeEvent: 'keyup'`                    | `[debounce]="0"` (default: live); any ms batches; blur/Enter flush                                                                     |
| `onEnterKey`                                   | `(enterKey)`                                                                                                                           |
| `onFocusIn` / `onFocusOut`                     | `(focused)` / `(blurred)`                                                                                                              |
| `onKeyDown` / `onKeyUp`                        | native `(keydown)` / `(keyup)` on the host — events bubble from the inner input                                                        |
| `onCut/onCopy/onPaste`                         | native `(cut)` / `(copy)` / `(paste)` on the host                                                                                      |
| `isValid` + `validationError`                  | `[invalid]` + `[errorText]`                                                                                                            |
| `reset()` / `focus()` / `blur()`               | `reset(value?)` / `focus()` / `blur()`                                                                                                 |
| `onInitialized/onOptionChanged/onContentReady` | Angular lifecycle, `effect()`, signals — not needed                                                                                    |

**Cross-field rules** ("if A changes, disable B") need no callbacks at all —
bind state to state:

```html
<oge-text-box label="Country" [(value)]="country" /> <oge-text-box label="City" [disabled]="country() === ''" />
```

…and use `(valueCommitted)` when you truly need the imperative hook:

```html
<oge-number-box label="Min" [(value)]="min" /> <oge-number-box label="Max" [min]="min() ?? undefined" (valueCommitted)="log('was', $event.previousValue, 'now', $event.value)" />
```

## CVA house pattern

These components set the repo's ControlValueAccessor pattern: there is **no**
`NG_VALUE_ACCESSOR` provider. The constructor injects `NgControl`
(`optional: true, self: true`) and assigns `ngControl.valueAccessor = this` —
a provider-free constructor assignment — which lets the component render validation state from
the control without a circular DI. Control state (incl. `markAllAsTouched`)
bridges into signals via the unified `control.events` stream.

## i18n

Every string — validation patterns (`{min}`, `{requiredLength}`…), rail
button aria labels, counter templates — lives in `OgeInputsMessages`:

```ts
provideOgeInputsConfig({
  messages: { requiredError: 'Bu alan zorunludur', clearButton: 'Temizle' },
});
```

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/inputs/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
