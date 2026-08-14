# @oge-ui/react-tabs

React tabs from the OGE UI suite — the WAI-ARIA APG tabs pattern with the
overflow, closing and reordering affordances real apps need, running the
**same** framework-free selection / close / reorder pipelines, the same
message catalog and the same stylesheet as the Angular `@oge-ui/tabs`
package.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer is at full
component and feature parity with the Angular tabs family.

## What ships

- **`<OgeTabs>`** — the stand-alone strip, for driving your own content.
- **`<OgeTabPanel>`** — strip plus content panels, with lazy first-activation
  rendering (`deferRendering`), `keepAlive`, fade/slide panel animations and
  animated `dynamicHeight`.
- **`<OgeTabsConfigProvider>`** — the React counterpart of
  `provideOgeTabsConfig()`; defaults and strings are single-sourced in
  `@oge-ui/behavior`.

Both components take declarative `tabs` (each with its own `content`) or
data-driven `items`, and support: automatic/manual APG activation, roving
tabindex with wrap-around and disabled skipping, horizontal or vertical
orientation (RTL-aware arrows), overflow scrolling with nav arrows and an
all-tabs menu, closable tabs with cancelable events and async close guards,
badges, dirty indicators, and drag reordering with an Escape-cancel.

## Installation

```sh
npm install @oge-ui/react-tabs
```

Requires React 18 or 19. Import the stylesheet once at your app entry:

```ts
import '@oge-ui/react-tabs/styles.css';
import '@oge-ui/react-overlay/styles.css'; // the overflow "all tabs" menu
```

## Quick start

```tsx
'use client';

import { useState } from 'react';
import { OgeTabPanel } from '@oge-ui/react-tabs';

export function Workspace() {
  const [index, setIndex] = useState(0);
  return (
    <OgeTabPanel
      selectedIndex={index}
      onSelectedIndexChange={setIndex}
      tabs={[
        { key: 'overview', text: 'Overview', content: <Overview /> },
        { key: 'settings', text: 'Settings', closable: true, content: <Settings /> },
      ]}
      onTabClosed={(event) => removeTab(event.key)}
    />
  );
}
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/tabs>
(pick **React** in the header switch). Machine-readable docs ship inside the
package at `node_modules/@oge-ui/react-tabs/llms.txt`.

## License

MIT
