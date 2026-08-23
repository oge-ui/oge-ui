# @oge-ui/react-overlay

React overlay surfaces from the OGE UI suite — viewport-aware anchored popups,
a full WAI-ARIA menu, tooltips, a context menu, a modal dialog and toast
notifications — running the **same** framework-free positioning, Escape-stack,
timing and notification machines as the Angular `@oge-ui/overlay` package, and
the same stylesheet.

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
- **`<OgeTooltip>`** — an accessible tooltip on any child element: hover dwell
  or instant on keyboard focus, `aria-describedby` wiring, viewport-aware
  placement, transient (never swallows the Escape meant for a popup).
- **`<OgeContextMenu>`** — right-click / Shift+F10 menu at the pointer over the
  `OgeMenuItem` model, focus-managed and body-appended.
- **`<OgeModal>`** — centered dialog with backdrop, focus trap, body scroll
  lock, Escape/backdrop closing, focus restore, cancelable `onClosing`, async
  `closeGuard` (single-flight), full-screen toggle, header drag, corner resize,
  busy veil, typed results and render-prop slots (`renderTitle`,
  `renderHeaderActions`, `renderFooter`).
- **`<OgeModalProvider>` + `useOgeModals()`** — imperative, body-appended modals
  (the counterpart of Angular's `OgeModalService`): `open(content, { data })`
  returns a ref whose `closed` promise carries the typed result; content reads
  `useOgeModalData()` / `useOgeModalRef()`.
- **`<OgeToastProvider>` + `useOgeToasts()`** — stacked toasts in six logical
  positions with a FIFO queue, severity sugar, pause-on-hover/focus/hidden-tab
  timers, progress bar, action buttons, coalescing with a ×N badge, in-place
  `update()` and `promise()` morphing, live-region announcements.
- **`<OgeOverlayConfigProvider>`** — the React counterpart of
  `provideOgeOverlayConfig()`; every default and every message string is
  single-sourced in `@oge-ui/behavior`.

This completes the overlay family's parity with the Angular package.

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

### Modal and toast

```tsx
'use client';

import { useState } from 'react';
import { OgeModal, OgeToastProvider, useOgeToasts } from '@oge-ui/react-overlay';

function Editor() {
  const toasts = useOgeToasts();
  const [opened, setOpened] = useState(false);
  return (
    <>
      <button onClick={() => setOpened(true)}>Edit</button>
      <OgeModal
        title="Edit row"
        opened={opened}
        onOpenedChange={setOpened}
        closeGuard={() => confirm('Discard changes?')}
        renderFooter={({ close }) => (
          <button
            onClick={() => {
              close('saved');
              toasts.success('Saved');
            }}
          >
            Save
          </button>
        )}
      >
        <form>…</form>
      </OgeModal>
    </>
  );
}

export function App() {
  return (
    <OgeToastProvider>
      <Editor />
    </OgeToastProvider>
  );
}
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/overlay>
(pick **React** in the header). Machine-readable docs for coding assistants
ship inside the package at `node_modules/@oge-ui/react-overlay/llms.txt`.

## License

MIT
