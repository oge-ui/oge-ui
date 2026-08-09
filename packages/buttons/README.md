# @oge-ui/buttons

Signal-based Angular buttons with semantic severities, design-token theming and
interaction guards no other button ships out of the box.

## Features

- **Variants** — `severity: normal | accent | success | warning | danger` ×
  `stylingMode: contained | outlined | text` × `size: sm | md | lg`, all driven
  by `--oge-*` design tokens (dark, Bootstrap and Tailwind bridge themes work
  unchanged).
- **Async smart button** — hand `action` a promise-returning function: the
  button turns on `loading`, disables itself, ignores re-clicks while pending
  (single-flight) and emits `actionDone` / `actionFailed` when it settles.
- **Click guard** — `clickGuard` throttles or debounces the `clicked` output;
  `true` is a ready-made 500 ms throttle for spam-sensitive submit buttons.
- **Hold-to-confirm** — `holdToConfirm` arms destructive actions behind an
  uninterrupted press with a CSS-only progress bar; Escape and pointer-cancel
  abort, Space/Enter holds work for keyboard users.
- **Auto-repeat** — `autoRepeat` re-fires while held (spinner/counter buttons)
  with configurable delay and interval.
- **Badge** — number/string pills (capped at `99+`, part of the accessible
  name) or a plain dot.
- **Button group** — `<oge-button-group>` renders a segmented control with
  `selectionMode: none | single | multiple`, two-way `selectedKeys`,
  WAI-ARIA toolbar/radiogroup/group semantics, roving tabindex and arrow-key
  navigation; children inherit the group's styling inputs.
- **Drop-down button** — `<oge-drop-down-button>` opens an anchored menu
  (`@oge-ui/overlay`: flip/clamp positioning, scroll repositioning, focus
  restore) with the full menu-button keyboard pattern incl. type-ahead.
  `items` accepts an array or a lazy promise-returning function (loading /
  empty / error rows, cached). `splitButton` adds an independent action main
  button; `rememberLastAction` turns the last picked item into the main
  button's label and action. Custom panel content via `*ogeDropDownContent`.
- **i18n** — every user-facing string lives in `OgeButtonsMessages`
  (`provideOgeButtonsConfig`), including screen-reader labels.

## Installation

```sh
npm install @oge-ui/buttons
```

Requires Angular ≥ 22. All components are standalone.

## Quick start

```ts
import { Component } from '@angular/core';
import { OgeButton, OgeButtonGroup, OgeButtonIcon } from '@oge-ui/buttons';

@Component({
  selector: 'app-demo',
  imports: [OgeButton, OgeButtonGroup, OgeButtonIcon],
  template: `
    <oge-button text="Save" severity="accent" [action]="save" (actionDone)="onSaved()" />

    <oge-button text="Delete" severity="danger" stylingMode="outlined" [holdToConfirm]="{ ms: 1000 }" (clicked)="remove()" />

    <oge-button-group selectionMode="single" [(selectedKeys)]="align" ariaLabel="Alignment">
      <oge-button value="left" text="Left" />
      <oge-button value="center" text="Center" />
      <oge-button value="right" text="Right" />
    </oge-button-group>
  `,
})
export class DemoComponent {
  align: readonly string[] = ['left'];
  save = () => fetch('/api/save', { method: 'POST' });
  onSaved() {}
  remove() {}
}
```

## Drop-down quick start

```ts
import { OgeDropDownButton } from '@oge-ui/buttons';
import type { OgeMenuItem } from '@oge-ui/overlay';
```

```html
<oge-drop-down-button text="Export" severity="accent" [items]="exportItems" (itemClick)="export($event.item.value)" />

<oge-drop-down-button text="Run" [splitButton]="true" [rememberLastAction]="true" [items]="runTargets" />
```

Non-split triggers only toggle the panel (`(clicked)` fires solely from the
split main button). `holdToConfirm`/`autoRepeat`/`useSubmitBehavior` are not
available on drop-down buttons.

## Reacting to interactions — event reference

| Reference API                                  | OGE                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Button `onClick`                               | `(clicked)` → `{ event }` (+ `(actionDone)`/`(actionFailed)` for async)                |
| ButtonGroup `onItemClick`                      | `(itemClick)` → `{ value, item?, index, event }`                                       |
| ButtonGroup `onSelectionChanged`               | `(selectionChanged)` → `{ selectedKeys, addedKeys, removedKeys }` + `[(selectedKeys)]` |
| DropDownButton `onButtonClick`                 | `(clicked)` (split main button)                                                        |
| DropDownButton `onItemClick`                   | `(itemClick)` → `{ item, event }`                                                      |
| DropDownButton `onSelectionChanged`            | `(selectionChanged)` → `{ item, previousItem }` (`rememberLastAction`)                 |
| `opened` option / popup events                 | `[(opened)]` model (`(openedChange)` fires on both open and close)                     |
| `open()/close()/toggle()`                      | `open()` / `close()` / `toggle()`                                                      |
| `focus()`                                      | `focus()` on button, group (roving target) and drop-down                               |
| `onInitialized/onOptionChanged/onContentReady` | Angular lifecycle, `effect()`, signals — not needed                                    |

## `clicked` vs native `(click)`

Bind the component's **`(clicked)`** output. It is the end of the guarded
pipeline (gesture → `clickGuard` → single-flight → emit). The native DOM
`click` still bubbles for plain buttons, but it bypasses every guard — and in
gesture modes (`holdToConfirm` / `autoRepeat`) native clicks are swallowed and
stopped from propagating so a quick tap can never trigger outer listeners.

## Icons

There is no icon-font dependency; project any SVG with the `ogeButtonIcon`
marker and position it with `iconPosition="before" | "after"`. Icon-only
buttons must provide an accessible name via `hint` or `aria-label`.

## Theming & custom colors

Beyond the built-in severities, every button accepts **any CSS color**:

```html
<oge-button text="Purple" color="#7c3aed" />
```

The soft tint (hover/focus ring) derives automatically via `color-mix`. Text
on contained fills defaults to white — for **light** custom colors set the
contrast var too: `style="--oge-btn-contrast: #111"`. For theme-wide changes,
override the `--oge-*` tokens instead — globally, per theme file, or per
instance (`style="--oge-accent: #ea580c; --oge-accent-soft: …"`).

The host includes the shared `--oge-*` token set. Severity colors add
`--oge-success`, `--oge-warning`, `--oge-danger` (+ `-soft` tints),
`--oge-severity-contrast`, `--oge-badge-bg` and `--oge-badge-color` — override
them per theme exactly like the grid tokens. `.oge-theme-dark` on any ancestor
switches the dark palette. Note: the buttons SCSS consumes the token source in
`@oge-ui/grid` at build time; there is no runtime dependency on the grid.

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/buttons/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
