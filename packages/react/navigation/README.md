# @oge-ui/react-navigation

React navigation and wayfinding components from the OGE UI suite, running the
**same** framework-free tree/menu/step engines, the same config defaults, the
same message catalogs and the same stylesheet as the Angular
`@oge-ui/navigation` package.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer is at full
component and feature parity with the Angular navigation family.

## What ships

- **`<OgeTreeView>`** — flat or nested data, tri-state checkboxes, search with
  match highlighting, lazy children, virtual scrolling, drag reparenting and
  the full APG tree keyboard.
- **`<OgeDrawer>`** — `overlay` / `push` / `side` modes with **modality
  derived from the mode**, logical positions (RTL mirrors on its own),
  `compactBelow` downgrades, focus trap, the shared Escape stack and async
  close guards.
- **`<OgeStepper>`** — linear or free navigation, both orientations, per-step
  validity and optional/editable flags, async step guards. One ARIA semantic
  in both orientations: `aria-current="step"` with `role="group"` bodies —
  never a tablist, which would promise panels may be browsed freely.
- **`<OgeMenubar>`** — the APG menubar with nested submenus, type-ahead,
  hover mode and a container-width hamburger collapse.
- **`<OgeBreadcrumb>`** — collapsing trail with an overflow menu.
- **`<OgePagination>`** — adaptive page navigator with page-size selector,
  jump-to-page and an info label.
- **Config providers** — `<OgeTreeViewConfigProvider>`,
  `<OgeDrawerConfigProvider>`, `<OgeStepperConfigProvider>`,
  `<OgeMenubarConfigProvider>`, `<OgeBreadcrumbConfigProvider>` and
  `<OgePaginationConfigProvider>` — the React counterparts of the
  `provideOgeXConfig()` functions; defaults and strings are single-sourced in
  `@oge-ui/behavior`.

## Installation

```sh
npm install @oge-ui/react-navigation
```

Requires React 18 or 19. Import the stylesheet once at your app entry:

```ts
import '@oge-ui/react-navigation/styles.css';
import '@oge-ui/react-overlay/styles.css'; // menubar submenus, breadcrumb overflow
```

## Quick start

```tsx
'use client';

import { useState } from 'react';
import { OgeTreeView } from '@oge-ui/react-navigation';

export function FolderPicker() {
  const [keys, setKeys] = useState<readonly string[]>([]);
  return <OgeTreeView items={folders} keyExpr="id" parentIdExpr="parentId" displayExpr="name" checkBoxesMode="normal" selectedKeys={keys} onSelectedKeysChange={setKeys} searchEnabled />;
}
```

## Docs

Live demos and the full API reference:
<https://ogeui.com/components/tree-view> (pick **React** in the header
switch). Machine-readable docs ship inside the package at
`node_modules/@oge-ui/react-navigation/llms.txt`.

## License

MIT
