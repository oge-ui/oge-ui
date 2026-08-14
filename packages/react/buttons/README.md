# @oge-ui/react-buttons

React buttons with semantic severities, design-token theming and interaction
guards no other button ships out of the box — running the **same** framework-free
press machine and the same stylesheet as the Angular `@oge-ui/buttons` package.

The OGE suite is one component engine with a native render layer per framework:
nothing here wraps Angular, and the React layer is heading for full component
and feature parity with the Angular suite, family by family.

## Features

- **Variants** — `severity: normal | accent | success | warning | danger` ×
  `stylingMode: contained | outlined | text` × `size: sm | md | lg`, all driven
  by `--oge-*` design tokens (dark, Bootstrap and Tailwind bridge themes work
  unchanged).
- **Async smart button** — hand `action` a promise-returning function: the
  button turns on `loading`, disables itself, ignores re-clicks while pending
  (single-flight) and calls `onActionDone` / `onActionFailed` when it settles.
- **Click guard** — `clickGuard` throttles or debounces `onClick`; `true` is a
  ready-made 500 ms throttle for spam-sensitive submit buttons.
- **Hold-to-confirm** — `holdToConfirm` arms destructive actions behind an
  uninterrupted press with a CSS-only progress bar; Escape and pointer-cancel
  abort, Space/Enter holds work for keyboard users.
- **Auto-repeat** — `autoRepeat` re-fires while held (spinner/counter buttons)
  with configurable delay and interval.
- **Badge** — number/string pills (capped at `99+`, part of the accessible
  name) or a plain dot.
- **Button group** — `<OgeButtonGroup>` renders a segmented control with
  `selectionMode: none | single | multiple`, controlled (`selectedKeys`) or
  uncontrolled (`defaultSelectedKeys`) selection, WAI-ARIA
  toolbar/radiogroup/group semantics, roving tabindex and arrow-key
  navigation; children inherit the group's styling props.
- **Drop-down button** — `<OgeDropDownButton>` opens an anchored menu
  (`@oge-ui/react-overlay`: flip/clamp positioning, scroll repositioning,
  focus restore) with the full menu-button keyboard pattern incl. type-ahead.
  `items` accepts an array or a lazy promise-returning function (loading /
  empty / error rows, cached). `splitButton` adds an independent action main
  button; `rememberLastAction` turns the last picked item into the main
  button's label and action. Custom panel content via `renderContent`.
- **i18n** — every user-facing string lives in `OgeButtonsMessages`
  (`<OgeButtonsConfigProvider>`), including screen-reader labels.

## Installation

```sh
npm install @oge-ui/react-buttons
```

Requires React 18 or 19. `@oge-ui/behavior` (the shared interaction engine)
comes along as a regular dependency. The components are client components —
`'use client'` ships in the published files, so they work from React Server
Components without any wrapper.

Import the stylesheet once at your app entry — plus the overlay package's
when you use the drop-down button (its panel chrome lives there):

```ts
import '@oge-ui/react-buttons/styles.css';
import '@oge-ui/react-overlay/styles.css'; // drop-down button panels
```

## Quick start

```tsx
'use client';

import { useState } from 'react';
import { OgeButton, OgeButtonGroup } from '@oge-ui/react-buttons';

export function Demo() {
  const [align, setAlign] = useState<readonly string[]>(['left']);
  const save = () => fetch('/api/save', { method: 'POST' });
  const remove = () => fetch('/api/item', { method: 'DELETE' });

  return (
    <>
      <OgeButton text="Save" severity="accent" action={save} />

      <OgeButton text="Delete" severity="danger" stylingMode="outlined" holdToConfirm={{ ms: 1000 }} onClick={() => remove()} />

      <OgeButtonGroup selectionMode="single" selectedKeys={align} onSelectionChange={({ selectedKeys }) => setAlign(selectedKeys)} ariaLabel="Alignment">
        <OgeButton value="left" text="Left" />
        <OgeButton value="center" text="Center" />
        <OgeButton value="right" text="Right" />
      </OgeButtonGroup>
    </>
  );
}
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/buttons>
(pick **React** in the header). Machine-readable docs for coding assistants
ship inside the package at `node_modules/@oge-ui/react-buttons/llms.txt`.

## License

MIT
