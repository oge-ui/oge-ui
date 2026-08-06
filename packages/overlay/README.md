# @oge-ui/overlay

Anchored-popup primitives for the OGE suite: viewport-aware positioning, an
open/close behavior model and an accessible menu list. This is the foundation
drop-down buttons build on today and selects/menus/tooltips (and the grid's
popup migration) build on next.

## Features

- **`resolvePopupPosition`** — pure, framework-free placement math: preferred
  side with **flip** when the opposite side has more room, cross-axis
  alignment fallback, viewport **clamping**, RTL-aware logical placements
  (`bottom-start`, `top-end`, `left-start`, …).
- **`OgeAnchoredPanel`** — a DI-free behavior model (slice pattern): open/close
  signals, position recomputed on open and on **scroll/resize** (repositions,
  never detaches), outside-pointerdown and Escape closing with typed close
  reasons, focus restore, generated `panelId` for `aria-controls`.
- **`<oge-popup>`** — presentational chrome bound to a panel model:
  `position: fixed`, `--oge-z-popup` stacking, popup surface tokens, hidden
  until the first measure (no flash at 0,0).
- **`<oge-menu-list>`** — WAI-ARIA `menu` with the `aria-activedescendant`
  pattern: wrapping arrow navigation that skips disabled items and separators,
  Home/End, **type-ahead**, Enter/Space activation, `menuitemcheckbox`
  support; closing is delegated to the owner via `closeRequest`.
- **`OgeMenuItem`** — the canonical menu item model of the suite
  (`text`, `value`, `disabled`, `checked`, `severity: 'danger'`, `separator`,
  `action`).
- **`ogeTooltip`** — an accessible tooltip directive for any element: hover
  dwell + instant keyboard-focus show, Escape/blur/leave hide, viewport-aware
  centered placements (`top`, `bottom`, `left`, `right`) with flip,
  `aria-describedby` wiring onto the focusable control (existing ids
  preserved), a body-appended bubble that never clips or catches pointer
  events, and per-trigger `tooltipShowDelay` / `tooltipHideDelay` /
  `tooltipDisabled` overrides.
- **`[ogeContextMenu]`** — right-click (and Shift+F10 / menu key) context
  menu bound to an `OgeMenuItem[]`: opens at the pointer (or anchored to the
  element for keyboard invocations), full menu keyboard support with
  first-item focus, outside/Escape/activation closing with focus restore, and
  `contextMenuItemClick` / `contextMenuOpened` / `contextMenuClosed` outputs.

### Positioning niceties

- Bare-side placements (`'top'`, `'bottom'`, `'left'`, `'right'`) center the
  panel on the anchor edge — used by tooltips; `start`/`end` variants keep
  the alignment-fallback behavior.
- `OgeAnchoredPanelOptions.anchorRect` positions against a virtual rectangle
  (e.g. the pointer location of a context menu) while the anchor element
  keeps handling outside-click and RTL detection.
- `OgeAnchoredPanelOptions.transient` keeps ephemeral surfaces (tooltips) out
  of the Escape stack so they never swallow the Escape meant for the popup
  underneath.
- `<oge-popup>` plays a reduced-motion-aware fade/scale entrance from the
  anchored edge (`data-placement` drives the transform origin).

## Installation

```sh
npm install @oge-ui/overlay
```

Requires Angular ≥ 22. All components are standalone.

## Quick start

```ts
import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { OgeAnchoredPanel, OgePopup, OgeMenuList, type OgeMenuItem } from '@oge-ui/overlay';

@Component({
  selector: 'app-demo',
  imports: [OgePopup, OgeMenuList],
  template: `
    <button #trigger type="button" (click)="panel.toggle()" aria-haspopup="menu" [attr.aria-expanded]="panel.isOpen()" [attr.aria-controls]="panel.panelId">Actions</button>
    @if (panel.isOpen()) {
      <oge-popup [panel]="panel">
        <oge-menu-list [items]="items" (closeRequest)="panel.close($event.reason)" />
      </oge-popup>
    }
  `,
})
export class DemoComponent {
  private readonly trigger = viewChild.required('trigger', { read: ElementRef });
  private readonly popup = viewChild(OgePopup, { read: ElementRef });

  readonly items: OgeMenuItem[] = [{ text: 'Duplicate' }, { separator: true, text: '' }, { text: 'Delete', severity: 'danger', action: () => this.remove() }];

  readonly panel = new OgeAnchoredPanel({
    anchor: () => this.trigger()?.nativeElement ?? null,
    panel: () => this.popup()?.nativeElement ?? null,
    restoreFocus: () => this.trigger()?.nativeElement.focus(),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.panel.destroy());
  }

  remove(): void {}
}
```

## Design notes

- Panels render **inline in the owner's template** — there is no portal. The
  popup escapes clipping with `position: fixed` and viewport-relative
  coordinates from the panel model.
- The overlay renders no user-facing strings, so it has no `messages` config;
  `provideOgeOverlayConfig` covers behavioral defaults only (`offset`,
  `viewportPadding`, `typeAheadMs`).
- `OgeMenuItem` here is the canonical successor of the grid's internal menu
  item type; the grid migrates to it in a future wave.

## License

MIT
