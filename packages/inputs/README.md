# @oge-ui/inputs

Signal-based Angular form editors — `oge-text-box`, `oge-text-area`,
`oge-number-box` — sharing one field chrome and working with three form
systems at once.

## Features

- **One field chrome** — label modes `static | floating | hidden | outside`,
  styling modes `outlined | filled | underlined`, sizes `sm | md | lg`
  (28/34/42px, the button scale), `[ogeInputPrefix]`/`[ogeInputSuffix]`
  slots, clear button, tooltip, and a subscript region for hint/error/counter
  with `subscriptSizing: fixed | dynamic | none` — `fixed` reserves the line
  so appearing errors never shift your layout.
- **Triple forms integration** — standalone `[(value)]`; **Signal Forms**
  via `[formField]` (the components implement the `FormValueControl`
  contract, so schema constraints like `required`/`min`/`maxLength`
  auto-bind); classic reactive/template forms via a `ControlValueAccessor`
  bridge.
- **Validation UX** — messages resolve from the i18n config
  (`provideOgeInputsConfig`), display per `errorDisplay: touched | dirty |
always`, announce via `aria-live`, and chain `aria-describedby` across
  hint/error/counter. `errorText` overrides everything; `invalid`/`pending`
  work manually for non-forms usage.
- **Grapheme-accurate counter** — `showCounter` counts what users perceive
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
- **Number box done right** — `value: number | null` (empty is `null`, never
  `0`), locale-aware parsing (`1.234,56`, NBSP groups, `−`),
  `Intl.NumberFormat` display on blur with raw editing on focus, clamp to
  `min`/`max` on commit, spin buttons with hold-to-repeat plus
  ArrowUp/ArrowDown.
- **Auto-resize textarea** — `autoResize` grows between `minRows`/`maxRows`
  using CSS `field-sizing: content` with a measurement fallback.

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

## License

MIT
