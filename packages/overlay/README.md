# @oge-ui/overlay

Overlay primitives for the OGE suite: viewport-aware positioning, an
open/close behavior model, an accessible menu list, tooltips and context
menus, plus two standalone surfaces — the `<oge-modal>` dialog and
`OgeToastService` notifications. The anchored primitives are the foundation
the suite's drop-down buttons and select editors build on.

## Features

- **`resolvePopupPosition`**: pure, framework-free placement math — preferred
  side with **flip** when the opposite side has more room, cross-axis
  alignment fallback, viewport **clamping**, RTL-aware logical placements
  (`bottom-start`, `top-end`, `left-start`, …).
- **`OgeAnchoredPanel`** — a DI-free behavior model (slice pattern): open/close
  signals, position recomputed on open and on **scroll/resize** (repositions,
  never detaches), outside-pointerdown and Escape closing with typed close
  reasons, focus restore, generated `panelId` for `aria-controls`.
- **`<oge-popup>`**: presentational chrome bound to a panel model —
  `position: fixed`, `--oge-z-popup` stacking, popup surface tokens, hidden
  until the first measure (no flash at 0,0).
- **`<oge-menu-list>`** — WAI-ARIA `menu` with the `aria-activedescendant`
  pattern: wrapping arrow navigation that skips disabled items and separators,
  Home/End, **type-ahead**, Enter/Space activation, `menuitemcheckbox`
  support; closing is delegated to the owner via `closeRequest`.
- **`OgeMenuItem`** — the canonical menu item model of the suite
  (`text`, `value`, `disabled`, `checked`, `severity: 'danger'`, `separator`,
  `action`).
- **`ogeTooltip`**: an accessible tooltip directive for any element — hover
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

## Modal dialog

`<oge-modal>` is a dialog with backdrop, focus trap, body scroll lock,
Escape/backdrop/close-button closing and focus restore. Content renders
lazily behind the `[(opened)]` model, and the modal participates in the
shared overlay Escape stack, so a popup opened inside it closes before the
modal itself. Slots: `*ogeModalTitle`, `*ogeModalHeaderActions` and
`*ogeModalFooter` — the footer template receives a `close` function whose
argument becomes the close result.

```html
<oge-modal #modal title="Edit row" [(opened)]="visible" [closeGuard]="confirmDiscard">
  <form>…</form>
  <div *ogeModalFooter="let close">
    <oge-button text="Save" (clicked)="close(form.value)" />
  </div>
</oge-modal>
```

User gestures (Escape, backdrop, the close button) and `close()` run the full
close pipeline: a cancelable `(closing)` event, then the async `closeGuard`
(`() => boolean | Promise<boolean>`), which is the hook for "discard unsaved
changes?" prompts. A direct `opened.set(false)` write closes immediately.
Optional chrome: `dragEnabled` (header drag; `restorePosition` resets the
offset on reopen), `resizeEnabled` (bottom-end handle,
`resizeStarted`/`resized` events), `fullScreen` with `showMaximizeButton`,
`placement: 'center' | 'top'`, `shading`, `inertBackground`, `busy` and an
`autoFocus` strategy (`'first-tabbable' | 'panel'` | CSS selector).

For prompt/confirm flows, or when a `transform`ed ancestor would break the
inline modal's `position: fixed`, `OgeModalService.open()` renders a
component or template into a body-appended modal instead:

```ts
private readonly modals = inject(OgeModalService);

async confirmDelete(): Promise<void> {
  const ref = this.modals.open<string>(ConfirmDelete, {
    title: 'Delete file?',
    width: 360,
    data: { name: 'report.xlsx' },
  });
  const { result } = await ref.closed;
  if (result === 'delete') this.remove();
}
```

The content component injects `OGE_MODAL_DATA` for its input and
`OgeModalRef` to close itself with a result. `OgeModalOpenConfig` accepts the
declarative inputs minus the slots.

## Toasts

`OgeToastService` shows stacked notifications from anywhere; there is no
component to declare. `show()` takes a message or an options object, and
`success` / `info` / `warning` / `error` are severity shorthands. Toasts
render in body-appended fixed regions (six logical positions, `top-start`
through `bottom-end`, RTL-aware), never take focus and never join the Escape
stack; they announce through permanently mounted live regions (`error`
asserts, the rest are polite). Auto-dismiss timers pause on hover,
focus-within and while the tab is hidden, and resume with the remaining time.

```ts
private readonly toasts = inject(OgeToastService);

save(): void {
  this.toasts.success('Saved');
  this.toasts.show({
    message: 'Row deleted',
    sticky: true,
    action: { text: 'Undo', handler: () => this.restore() },
  });
  this.toasts.promise(this.api.publish(), {
    loading: 'Publishing…',
    success: 'Published',
    error: (e) => `Failed: ${String(e)}`,
  });
}
```

`show()` returns an `OgeToastRef` with `close()`, `update(patch)` (patches
the toast in place; message changes re-announce, timing changes restart the
timer) and a `closed` promise. `promise()` builds on that: a loading toast
morphs in place when the promise settles and only then starts its dismiss
timer. With `coalesce` enabled (per toast or via config), an identical
visible toast absorbs the new one and shows a `×N` count badge instead of
stacking. Defaults for position, display time, progress bar, coalescing and
max visible per region live in `provideOgeOverlayConfig` (`toastPosition`,
`toastDisplayTime`, `toastProgressBar`, `toastCoalesceDuplicates`,
`toastMaxVisible`).

## Design notes

- Panels render **inline in the owner's template** — there is no portal. The
  popup escapes clipping with `position: fixed` and viewport-relative
  coordinates from the panel model.
- The anchored primitives render no user-facing strings (their consumers own
  i18n). The modal and toast strings — close/maximize aria labels, the toast
  region label and count badge — live in `OgeOverlayMessages` and are
  overridable via `provideOgeOverlayConfig({ messages })`, which also carries
  the behavioral defaults (`offset`, `viewportPadding`, `typeAheadMs`,
  tooltip delays, toast defaults).
- `OgeMenuItem` here is the canonical successor of the grid's internal menu
  item type; the grid migrates to it in a future wave.

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/overlay/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
