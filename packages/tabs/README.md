# @oge-ui/tabs

Signal-based Angular tab family for the OGE suite: `OgeTabs` (stand-alone tab
strip) and `OgeTabPanel` (strip + content panels).

```sh
npm install @oge-ui/tabs
```

```html
<oge-tab-panel [(selectedIndex)]="index">
  <oge-tab text="Overview">Overview content</oge-tab>
  <oge-tab text="Settings" [closable]="true">
    <ng-template ogeTabContentTemplate>Rendered lazily on first visit.</ng-template>
  </oge-tab>
</oge-tab-panel>
```

- Declarative `<oge-tab>` children **and** a data-driven `[items]` array — mixed
  freely; items render after the projected children.
- Two-way `[(selectedIndex)]` and `[(selectedKey)]`, cancelable
  `selectionChanging` pre-event.
- Lazy rendering (`deferRendering`) with keep-alive (`keepAlive`) — rendered
  panels stay mounted and keep their state while hidden.
- Closable tabs with an async per-tab `closeGuard`
  (`() => boolean | Promise<boolean>`), cancelable `tabClosing`, and the APG
  Delete-key convention with correct focus hand-off. The ✕ stays presentational
  so nothing focusable is nested inside `role="tab"`.
- Overflow handling: scrollable strip, auto-hiding nav arrows and an optional
  all-tabs menu (`showTabListButton`).
- Drag & drop tab reordering (`allowTabReordering`) with a cancelable
  `tabReordering` pre-event.
- WAI-ARIA APG tabs pattern: roving tabindex, arrow/Home/End navigation,
  `automatic` and `manual` activation modes, RTL-aware keys.
- Optional panel transitions: `panelAnimation` (`fade`/`slide`, RTL-mirrored)
  and `dynamicHeight` so the page never jumps between differently sized panels —
  both suppressed under `prefers-reduced-motion`.
- Layout control: `tabAlignment` (`start`/`center`/`end`/`justify`/`stretch`),
  `indicatorFit` for a label-width selection indicator, and a `messages.noData`
  empty state.
- Router-driven tabs need no separate component — bind `selectedKey` from the
  URL and navigate in `selectionChanged`.
- Badges, dirty-tab indicators, icons via projected SVG, custom header
  templates, `stylingMode` / `size` variants, dark/bootstrap/tailwind themes.

Every user-facing string is overridable via `provideOgeTabsConfig()`.

Docs & demos: https://ogeui.com — MIT licensed.

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/tabs/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).
