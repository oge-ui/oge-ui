# @oge-ui/react-inputs

React form editors from the OGE UI suite, with the full oge field chrome —
label modes, prefix/suffix slots, clear button, validation subscript,
grapheme-accurate character counter, password reveal and copy-to-clipboard —
running the **same** framework-free commit pipeline, messages and design
tokens as the Angular `@oge-ui/inputs` package.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer has full component and feature parity with
the Angular suite (see the suite's `docs/REACT-PARITY.md`).

## What ships today

Every editor below shares one field chrome — four label modes, three styling
modes, prefix/suffix props, clear button and the fixed-height validation
subscript — and the standard React controlled/uncontrolled pair
(`value` + `onValueChange`, or `defaultValue`).

- **Text** — **`<OgeTextBox>`** (modes `text/email/password/search/tel/url`,
  grapheme counter, password reveal, copy-to-clipboard, debounce with
  blur/Enter flush, optional input `mask` with `maskRules` / `showMaskMode` /
  `includeLiterals`), **`<OgeMaskedTextBox>`** (mask-first editor on the shared
  `OgeMaskCore`: `0 9 # L l A a C c` slots, custom rules, overwrite editing,
  IME-safe), **`<OgeTextArea>`** (auto-resize with a row clamp) and
  **`<OgeNumberBox>`** (`Intl` formatting, `formatWhileTyping`, mouse-wheel
  `wheelStep`, clamping, spin buttons with hold-to-repeat; empty is `null`,
  never `0`).
- **Toggles and choice groups** — **`<OgeCheckBox>`** (three-state),
  **`<OgeSwitch>`**, **`<OgeRadioGroup>`** (roving tabindex,
  horizontal/vertical layout), **`<OgeCheckBoxGroup>`** (multi-value group with
  select-all) and **`<OgeToggleGroup>`** (single/multiple toggle-button group).
- **Drop-down editors** — **`<OgeSelectBox>`** (search, grouping, lazy items,
  type-ahead, `acceptCustomValue`, `renderItem` / `renderGroup` /
  `renderField` / `renderHeader` / `renderFooter`, cancelable `onOpening` /
  `onClosing`), **`<OgeTagBox>`** (multi-select chips with `renderTag`,
  `showSelectAll`, `maxSelectedItems` and a `+N more` overflow chip),
  **`<OgeAutocomplete>`** (free text with suggestions, `forceSelection`, match
  highlighting), **`<OgeMultiColumnComboBox>`** (a grid-shaped popup with
  columns, APG combobox-with-grid keyboard, single or multiple selection) and
  **`<OgeTreeSelect>`** (the navigation tree as a picker, single or multiple,
  `showSelectionAs="chips"`). The list editors support `virtualScroll` and a
  remote paged `dataSource` (`pageSize`, `onPageLoaded`) that loads on scroll
  with debounced server search and request cancellation.
- **Sliders** — **`<OgeSlider>`** and **`<OgeRangeSlider>`**: the APG slider
  pattern with live drag commits, Escape-to-cancel, ticks, value bubbles and
  the multi-thumb constraint.
- **Dates** — **`<OgeCalendar>`** (month/year/decade drill, single/multiple/
  range selection, week numbers), **`<OgeDateBox>`** (`date`/`time`/`datetime`
  with locale-aware parsing, segment entry via `useMaskBehavior`, `hour12`,
  `showSeconds`, `showNowButton`) and **`<OgeDateRangeBox>`** (`presets`, plus
  `type="time"` / `"datetime"` ranges).
- **Colour** — **`<OgeColorBox>`** (saturation/brightness surface, hue and
  alpha sliders, hex/RGB inputs, swatch palette and the platform eyedropper),
  plus the standalone **`<OgeColorGradient>`** (inline picker with an optional
  WCAG contrast readout) and **`<OgeColorPalette>`** (swatch grid from a preset
  or your own colours).
- **Adaptive popups** — `adaptiveMode` (`'none'` by default) and
  `adaptiveBreakpoint` turn the select box, tag box, autocomplete, tree
  select, multi-column combo box, date box, date range box and colour box
  popups into a bottom sheet or full-screen dialog on small viewports.
- **`<OgeInputsConfigProvider>`** — the React counterpart of
  `provideOgeInputsConfig()`; defaults and strings are single-sourced in
  `@oge-ui/behavior`.

## Installation

```sh
npm install @oge-ui/react-inputs
```

Requires React 18 or 19. Import the stylesheet once at your app entry:

```ts
import '@oge-ui/react-inputs/styles.css';
import '@oge-ui/react-overlay/styles.css'; // drop-down panels (select box, tag box,
// autocomplete, date box, color box, tree select)
import '@oge-ui/react-navigation/styles.css'; // the tree select's popup tree
```

## Quick start

```tsx
'use client';

import { useState } from 'react';
import { OgeTextBox } from '@oge-ui/react-inputs';

export function Profile() {
  const [email, setEmail] = useState('');
  return <OgeTextBox label="E-mail" mode="email" value={email} onValueChange={setEmail} showClearButton required errors={email === '' ? [{ kind: 'required' }] : []} />;
}
```

## Docs

Live demos and the full API reference: <https://www.ogeui.com/components/inputs>
(pick **React** in the header switch).
Machine-readable docs ship inside the package at
`node_modules/@oge-ui/react-inputs/llms.txt`.

## License

MIT
