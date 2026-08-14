# @oge-ui/react-overlay

React overlay primitives from the OGE UI suite — viewport-aware anchored
popups and a full WAI-ARIA menu — running the **same** framework-free
positioning, Escape-stack and menu machines as the Angular `@oge-ui/overlay`
package, and the same stylesheet.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer is heading for full
component and feature parity with the Angular suite, family by family.

## What ships today

- **`useAnchoredPanel`** — the anchored-panel machine as a hook: open/close
  state, flip + clamp positioning (RTL-aware), outside-click and Escape
  closing on the shared overlay Escape stack, scroll/resize repositioning,
  content-resize observation and focus restore.
- **`<OgePopup>`** — the presentational popup chrome (fixed positioning,
  surface tokens, first-measure fade-in).
- **`<OgeMenuList>`** — WAI-ARIA `menu`: `aria-activedescendant` pattern,
  wrapping arrow keys that skip disabled items and separators, Home/End,
  printable-key type-ahead, checkbox items, link items, icons, badges,
  shortcuts — and nested submenus at every depth, opened by hover (with the
  suite's dwell timings) or keyboard.
- **`<OgeOverlayConfigProvider>`** — the React counterpart of
  `provideOgeOverlayConfig()`; timing defaults are single-sourced in
  `@oge-ui/behavior`.

Tooltips, modals and toasts follow as the React layer scales out
(see the suite's `ROADMAP-REACT.md`).

## Installation

```sh
npm install @oge-ui/react-overlay
```

Requires React 18 or 19. `@oge-ui/behavior` comes along as a regular
dependency. The components are client components — `'use client'` ships in
the published files.

Import the stylesheet once at your app entry:

```ts
import '@oge-ui/react-overlay/styles.css';
```

## Quick start

```tsx
'use client';

import { useRef } from 'react';
import { OgeMenuList, OgePopup, useAnchoredPanel, type OgeMenuItem } from '@oge-ui/react-overlay';

const items: OgeMenuItem[] = [
  { text: 'Duplicate', action: () => copy() },
  { text: 'Share', items: [{ text: 'Email' }, { text: 'Link' }] },
  { separator: true, text: '' },
  { text: 'Delete', severity: 'danger' },
];

export function Actions() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const panel = useAnchoredPanel({
    anchor: () => anchorRef.current,
    panel: () => popupRef.current,
    restoreFocus: () => anchorRef.current?.focus(),
  });

  return (
    <>
      <button ref={anchorRef} onClick={() => panel.toggle()}>
        Actions
      </button>
      {panel.isOpen && (
        <OgePopup panel={panel} ref={popupRef}>
          <OgeMenuList items={items} onCloseRequest={({ reason }) => panel.close(reason)} />
        </OgePopup>
      )}
    </>
  );
}
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/buttons>
(the drop-down button demos exercise these primitives — pick **React** in the
header). Machine-readable docs for coding assistants ship inside the package
at `node_modules/@oge-ui/react-overlay/llms.txt`.

## License

MIT
