# @oge-ui/layout

Layout containers for the [OGE](https://ogeui.com) Angular UI suite. Signal-based,
standalone, zoneless-ready, MIT.

Today the package ships **`OgeAccordion`** with its declarative child
**`OgeAccordionItem`**, **`OgeCard`** with its attribute slots, **`OgeSplitter`**
with **`OgeSplitterPane`**, **`OgeToolbar`** with **`OgeToolbarItem`**, and the
loading trio — **`OgeProgressBar`** (buffer/chunked variants, severity colors,
`value: null` = indeterminate with `aria-valuenow` correctly omitted),
**`OgeLoadIndicator`** (the canonical ring; reduced motion slows it rather than
freezing it) and **`OgeSkeleton`** (shimmer/pulse placeholder, always
`aria-hidden` — the loading region owns the announcement).

```sh
npm install @oge-ui/layout
```

## Accordion

```html
<oge-accordion [multiple]="true" [collapsible]="true" [(expandedKeys)]="open">
  <oge-accordion-item key="account" title="Account" description="Name and e-mail"> Account settings… </oge-accordion-item>
  <oge-accordion-item key="billing" title="Billing" [invalid]="billing.invalid"> Billing settings… </oge-accordion-item>
</oge-accordion>
```

Panels come from projected children, from a data-driven `items` array, or both
(children first).

```ts
protected readonly sections: OgeAccordionItemData[] = [
  { key: 'general', title: 'General', description: 'Language and time zone' },
  { key: 'security', title: 'Security', badge: 2 },
];
```

### What it does

- **Expansion** — `[(expandedKeys)]` for multi-expand, `[(selectedIndex)]` for
  single, and `[(expanded)]` on each panel; `multiple` and `collapsible`
  control the rest. `expand()`/`collapse()`/`toggle()` resolve a promise
  telling you whether the change actually committed.
- **Accessibility** — the WAI-ARIA APG accordion pattern: each title is a
  `<button>` inside a heading, every header stays in the page Tab sequence, and
  an open panel that may not be collapsed is `aria-disabled` (never `disabled`).
  `keyboardNavigation` adds Up/Down/Home/End, type-ahead and
  `Ctrl+PageUp`/`Ctrl+PageDown` — the last two work from inside panel content.
  Collapsing a panel that holds focus hands focus back to its header, since a
  collapsed panel is `inert`.
- **Lazy content** — `deferRendering` creates a panel's body on first expand,
  `keepAlive` keeps it mounted afterwards.
- **Async expand guard** — `expandGuard` per panel vetoes an expand _or_ a
  collapse; it may return a promise (spinner, single-flight), and rejecting or
  throwing is treated as a veto.
- **Invalid sections** — flag a panel `invalid` for a danger rail plus a screen
  reader announcement, and call `expandInvalid()` after a rejected form submit.
- **Async content loader** — `contentLoader` per panel shows a skeleton while
  pending, passes the resolved value to the content template, and renders a
  retry button on failure.
- **Actions** — `[ogeAccordionHeaderActionsTemplate]` puts real buttons beside
  the toggle rather than inside it, so there is no `nested-interactive`
  violation; `[ogeAccordionActionRow]` is the footer bar inside the panel.
- **Theming** — height animation via `grid-template-rows`, honours
  `prefers-reduced-motion`, logical properties throughout for RTL, and the
  shared `--oge-*` design tokens.

See the [API reference](https://ogeui.com/components/accordion/api) for the full
surface.

## Card

```html
<oge-card header="Mountains" subheader="Alps, 2026" stylingMode="raised">
  <img ogeCardMedia src="alps.jpg" alt="" style="aspect-ratio: 16 / 9" />
  <p>Four days above the tree line.</p>
  <div ogeCardActions align="end">
    <button type="button">Share</button>
  </div>
</oge-card>
```

One component, not a sub-component trio: the sections are attribute slots —
`[ogeCardMedia]`, `[ogeCardActions]`, `[ogeCardFooter]`, `[ogeCardAvatar]`,
`[ogeCardHeaderActions]`, `[ogeCardSeparator]` — and everything else projected
is the content.

### What it does

- **Chrome** — `stylingMode` (`'outlined' | 'raised' | 'filled' | 'flat'`);
  `raised` rests on the `--oge-shadow-card` token. Simple titles come from the
  `header` / `subheader` inputs, richer headers from the avatar and
  header-actions slots. `size` (`'sm' | 'md' | 'lg'`) scales padding and type
  together.
- **States** — `severity` draws a status rail on the inline-start edge
  (`accent`/`success`/`warning`/`danger`), `loading` swaps content and actions
  for an `aria-busy` shimmer skeleton, and `interactive` adds the
  hover/focus-within lift for the stretched-link pattern — visual only, no
  role or wrapper.
- **Media** — full-bleed, sized by your own CSS (`aspect-ratio`,
  `block-size`); `orientation="horizontal"` moves it into an inline-start
  column spanning every other section.
- **Actions** — `align` on the actions row: `'start' | 'center' | 'end' |
'stretched'`.
- **Accessibility** — there is no WAI-ARIA card pattern, so the card renders no
  role and never wraps itself in a link or button (that is the
  `nested-interactive` trap). Give a clickable card one primary `<a>` in its
  content and stretch its hit area with CSS; add `role="article"` or
  `role="region"` on the host where the context calls for it.
- **Theming** — the shared `--oge-*` design tokens, logical properties for RTL,
  and `--oge-card-pad` / `--oge-card-media-size` sub-tokens for per-card tuning.

See the [API reference](https://ogeui.com/components/card/api) for the full
surface.

## Splitter

```html
<oge-splitter [(sizes)]="sizes">
  <oge-splitter-pane key="side" size="240px" minSize="160px" [collapsible]="true"> Navigation… </oge-splitter-pane>
  <oge-splitter-pane key="main" [minSize]="20"> Editor… </oge-splitter-pane>
</oge-splitter>
```

Panes come from projected children, from a data-driven `panes` array, or both
(children first). A `panes` entry may carry its own `panes`, which renders a
nested splitter on the opposite axis.

### What it does

- **Sizing** — sizes are **ratios**, not percentages: `[30, 30]` lays out the
  same as `[50, 50]`, so a configuration that does not add up to 100 is never
  an error. A `'240px'` size pins a pane instead, and `minSize`/`maxSize` accept
  either unit. Layout is one CSS grid where the separators are real tracks, so
  panes mirror automatically in RTL.
- **Accessibility** — the WAI-ARIA APG window splitter pattern: each separator
  is a focusable `role="separator"` carrying `aria-orientation`, `aria-controls`
  pointing at its primary pane, and `aria-valuenow`/`valuemin`/`valuemax` on one
  0–100 scale. Arrow keys move it by `step`, Home/End jump to the primary pane's
  limits, and Enter collapses or restores it.
- **Collapsing** — a separator grows one grip per collapsible neighbour, so
  either side can be collapsed; Enter targets the pane before it and
  `Ctrl`+Arrow reaches both. Panes collapse to `collapsedSize` and come back at
  the size they left. A collapsed pane stays in the DOM as `inert`, and focus
  inside it is handed to the separator first.
- **Persistence** — `[(sizes)]` is the whole state: persist it anywhere in a few
  lines. `resizeStarted`/`resized`/`resizeEnded` and the cancelable
  `paneCollapsing`/`paneExpanding` round out the event set.
- **Pointer & touch** — pointer capture, `pointercancel` handling,
  `touch-action: none` so a touch drag resizes instead of scrolling the page,
  and Escape reverts an in-flight drag.

See the [API reference](https://ogeui.com/components/splitter/api) for the full
surface.

## Toolbar

```html
<oge-toolbar [items]="commands" (itemClick)="run($event)">
  <oge-toolbar-item key="save" text="Save" severity="accent" [overflowPriority]="10" />
  <oge-toolbar-item key="help" text="Help" location="after" [overflowPriority]="-1" />
  <input ogeToolbarAfter type="search" aria-label="Search" />
</oge-toolbar>
```

Commands come from projected children, from a data-driven `items` array, or both
(children first). Anything richer than a button — an editor, a button group —
arrives through `[ogeToolbarItemTemplate]` or the `[ogeToolbarBefore]` /
`[ogeToolbarCenter]` / `[ogeToolbarAfter]` slots; there is deliberately no
`widget` + `options` bag.

### What it does

- **Overflow** — `overflow` picks the strategy: `'menu'` collapses what does not
  fit into an anchored menu, `'scroll'` keeps one line behind scroll buttons,
  `'wrap'` flows onto more lines, `'extended'` hides the remainder in a second
  row, `'none'` lets the row overflow. Per item, `locateInMenu` pins
  (`'never'`) or banishes (`'always'`) an entry, and **`overflowPriority`
  decides which commands yield first** regardless of their position — so a
  primary action can outlive a trailing secondary one without being moved.
- **Accessibility** — the WAI-ARIA APG toolbar pattern: `role="toolbar"`, one
  roving tabindex across its own buttons _and_ the controls you project, arrow
  keys that wrap and skip disabled stops, Home/End, `aria-orientation` when
  vertical, and text-entry controls left to their own arrow handling. Set
  `keyboardNavigation` to `false` to give every control its natural Tab place.
- **Density & chrome** — `size` (`'sm' | 'md' | 'lg'`), `stylingMode`
  (`'outlined' | 'filled' | 'flat'`), per-item `severity`, and `showText` /
  `showIcon` (`'always' | 'onBar' | 'inMenu' | 'never'`) for icon-only bars whose
  labels come back in the overflow menu.
- **Measurement** — which commands fit is core's pure `fitToolbarItems`, fed by
  a `ResizeObserver`. Style reads and per-item layout reads stay off the resize
  path, so a drag-resize costs one container read per frame.
- **Runtime changes** — `addItem`/`removeItem`/`hideItem`/`enableItem` layer
  over either source without rewriting the array, and `refreshOverflow()`
  re-measures after you change something the toolbar cannot observe.
- **Events** — `itemClick`, `itemHold`, `itemContextMenu`, `activeChanged` for
  toggles, `overflowChanged`, and the cancelable `menuOpening`/`menuClosing`
  pair around the overflow menu.

See the [API reference](https://ogeui.com/components/toolbar/api) for the full
surface.

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/layout/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
