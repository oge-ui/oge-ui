# @oge-ui/react-layout

React layout containers and loading visuals from the OGE UI suite, running the
**same** framework-free decision functions, the same config defaults, the same
message catalogs and the same stylesheet as the Angular `@oge-ui/layout`
package.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer is at full
component and feature parity with the Angular layout family.

## What ships

- **`<OgeCard>`** — content container with header/subheader, avatar, header
  actions, media, actions and footer slots, styling modes, severities,
  orientations and a loading state that swaps the body for a skeleton.
- **`<OgeAccordion>`** — single or multi expansion, async expand guards, lazy
  and kept-alive content, APG keyboard.
- **`<OgeSplitter>`** — nested, resizable panes with the APG window-splitter
  keyboard, collapse/expand, min/max sizes and persisted layouts.
- **`<OgeToolbar>`** — item groups with a width-aware overflow menu.
- **`<OgeProgressBar>`** — determinate, indeterminate, buffered and chunked,
  with a formattable label that also drives `aria-valuetext`.
- **`<OgeLoadIndicator>`** and **`<OgeSkeleton>`** — the loading visuals, with
  shimmer, pulse and static animations.
- **Config providers** — `<OgeCardConfigProvider>`,
  `<OgeAccordionConfigProvider>`, `<OgeSplitterConfigProvider>`,
  `<OgeToolbarConfigProvider>`, `<OgeProgressBarConfigProvider>`,
  `<OgeLoadIndicatorConfigProvider>` and `<OgeSkeletonConfigProvider>` — the
  React counterparts of the `provideOgeXConfig()` functions; defaults and
  strings are single-sourced in `@oge-ui/behavior`.

## Installation

```sh
npm install @oge-ui/react-layout
```

Requires React 18 or 19. Import the stylesheet once at your app entry:

```ts
import '@oge-ui/react-layout/styles.css';
import '@oge-ui/react-overlay/styles.css'; // the toolbar's overflow menu
```

## Quick start

```tsx
'use client';

import { useState } from 'react';
import { OgeCard, OgeProgressBar } from '@oge-ui/react-layout';

export function UploadCard() {
  const [progress, setProgress] = useState(40);
  return (
    <OgeCard header="Import" subheader="Customers.csv" stylingMode="raised">
      <OgeProgressBar value={progress} showLabel />
    </OgeCard>
  );
}
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/card>
(pick **React** in the header switch). Machine-readable docs ship inside the
package at `node_modules/@oge-ui/react-layout/llms.txt`.

## License

MIT
