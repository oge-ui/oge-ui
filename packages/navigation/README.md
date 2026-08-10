# @oge-ui/navigation

Navigation controls for the [OGE](https://ogeui.com) Angular UI suite.
Signal-based, standalone, zoneless-ready, MIT.

Today the package ships **`OgeTreeView`**, **`OgeDrawer`**, **`OgeStepper`**,
**`OgeMenubar`** and **`OgeBreadcrumb`**.

```sh
npm install @oge-ui/navigation
```

## Tree View

```html
<oge-tree-view [items]="folders" keyExpr="id" parentIdExpr="parentId" displayExpr="name" selectionMode="multiple" showCheckBoxes="normal" [(expandedKeys)]="open" [(selectedKeys)]="picked" />
```

Nested payloads work just as well — point `itemsExpr` at the children field
and the parent links are derived:

```html
<oge-tree-view [items]="tree" itemsExpr="children" displayExpr="name" />
```

### What it does

- **Either data shape** — a flat parent-referencing array or nested children,
  normalized by `@oge-ui/core`'s tree engine into one pipeline.
- **Accessibility** — the WAI-ARIA APG treeview pattern: a roving tabindex over
  `role="treeitem"` rows, `Down`/`Up`, `Right`/`Left` with the proper
  open/first-child and close/parent semantics, `Home`/`End`, type-ahead and `*`
  to expand a level. Multi-select adds `Space`, `Shift+Arrow`,
  `Ctrl+Shift+Home/End` and `Ctrl+A`.
- **Flat DOM** — depth is carried by `aria-level` / `aria-posinset` /
  `aria-setsize` rather than nested `role="group"` wrappers. The APG sanctions
  this, and it is what makes virtualization possible.
- **Tri-state checkboxes** — checking cascades down to descendants and
  normalizes up, so a parent is checked only when every child is. Report the
  result as `all`, `leavesOnly` or `excludeRecursive` via `selectedKeysMode`.
- **Search** — accent- and locale-insensitive, auto-expands the ancestors of a
  match so it is reachable, and highlights the matched substring.
- **Lazy load on demand** — `loadChildren` fetches a node's children on first
  expand behind a placeholder row; fetched children join the index, so
  cascading selection reaches them.
- **Virtual scrolling** — windowed rendering for very large trees, built on
  core's `OffsetTree`; keyboard focus scrolls the target into view first.
- **Drag & drop** — drop `inside`, `before` or `after` a node, with a cycle
  guard, hover-to-expand and Escape to cancel. The tree emits `itemReordered`
  and leaves the data change to you.
- **Theming** — the shared `--oge-*` design tokens, logical properties for RTL,
  and `prefers-reduced-motion` support.

See the [API reference](https://ogeui.com/components/tree-view/api) for the
full surface.

## Drawer

```html
<oge-drawer [(opened)]="menuOpen" mode="side" [size]="240" [compactBelow]="720" ariaLabel="Sections">
  <oge-tree-view ogeDrawerPanel [items]="nav" />
  <router-outlet />
</oge-drawer>
```

One component, not the container/drawer/content trio the reference libraries
need: the panel is the `[ogeDrawerPanel]` slot, everything else projected is
the content.

### What it does

- **Three layout modes** — `overlay` floats over the content, `push` shifts it
  aside without resizing it, `side` shrinks it so both share the row. Four
  logical edges (`start`/`end`/`top`/`bottom`), so RTL needs no flag.
- **Modality is derived from `mode`, never configured.** `overlay` and `push`
  cover or displace the content, so they are dialogs: `role="dialog"`,
  `aria-modal`, a focus trap, Escape, and `inert` on the background. `side`
  shares the row, so it is a landmark (`navigation` / `complementary` /
  `region`) with none of those. WAI-ARIA has no drawer pattern and conditions
  modality on background interaction actually being blocked — an independent
  flag is exactly what lets a panel claim `role="complementary"` and
  `aria-modal="true"` at once.
- **Compact rail** — `minSize` is the _closed_ size, so a `side` drawer can
  collapse to an icon rail instead of a gap, and stay keyboard reachable.
- **Responsive to its own container** — `compactBelow` measures the drawer's own
  box, never the window, so a drawer nested in a dialog or a split pane adapts
  to the room it actually has. The rule is core's pure `resolveDrawerMode()`.
- **One Escape stack** — the drawer registers with the same overlay stack every
  other OGE surface uses, so a popup opened inside it closes before it does.
- **Chrome** — an optional `showCloseButton`, a `disabled` switch that blocks the
  open/close gestures without disabling the panel's content, and
  `toggle(force?)` for driving the drawer from a router or a media query.
- **Async `closeGuard`** — `false`, a throw and a rejection all veto the close; a
  promise reports `closePending`, and a second gesture meanwhile is dropped.

See the [API reference](https://ogeui.com/components/tree-view/api) for the full
surface.

## Stepper

```html
<oge-stepper [(activeIndex)]="step" [linear]="true" [showNavigation]="true">
  <oge-step label="Account" [completed]="accountValid()">…</oge-step>
  <oge-step label="Shipping" [optional]="true">…</oge-step>
  <oge-step label="Review">…</oge-step>
</oge-stepper>
```

Steps come from projected children, from a data-driven `steps` array, or both
(children first).

### What it does

- **Accessibility, decided rather than inherited** — there is no WAI-ARIA APG
  stepper pattern, so this is an ordered list of `<button>` headers carrying
  `aria-current="step"`, each body a `role="region"` labelled by its header.
  **One semantic in both orientations**: Angular Material instead emits a
  `tablist` when horizontal and `aria-current` when vertical, so the same widget
  reads as two different things to a screen reader. A tablist also claims panels
  may be browsed freely — exactly what `linear` forbids.
- **Keyboard** — the headers are buttons in a list, so they are all Tab-reachable
  with no roving tabindex to get in the way. `keyboardNavigation` adds
  arrow/Home/End as an enhancement; it moves focus only, and does **not** wrap,
  because a process does not loop from the last step to the first.
- **Linear flow** — `linear` blocks moving past a step that is neither
  `completed` nor `optional`, `editable: false` blocks coming back, and every
  refusal emits `stepBlocked` with the reason. Material refuses silently.
- **Async `stepGuard`** — `false`, a throw and a rejection all veto; a promise
  reports `changePending`, a second gesture meanwhile is dropped, and the guard
  gates the finish on the last step too.
- **Navigation** — a built-in Back / Next bar via `showNavigation` (none of the
  three references ships one), plus `[ogeStepperNext]` / `[ogeStepperPrevious]`
  directives that work inside the stepper _or_ bound to it from outside.
- **Lazy content** — `deferRendering` creates a body on first activation,
  `keepAlive` keeps it mounted afterwards.

Inside a form, `<oge-form-steps>` wraps this component and derives each step's
completion from the form's own error rollup — identically in all three binding
modes — and touches only the step being left, so the steps ahead stay quiet.

See the [API reference](https://ogeui.com/components/tree-view/api) for the full
surface.

## Menubar

```html
<oge-menubar [items]="menu" (itemClick)="run($event)" />
```

Items come from a data tree, from nested `<oge-menubar-item>` children, or both
(children first). Children at any depth open as nested submenus.

### What it does

- **The full WAI-ARIA APG menubar pattern** — `role="menubar"` with a roving
  tabindex, `Left`/`Right` between items, `Down`/`Enter` into a submenu (`Up`
  opens focusing the last item), `Right` on a leaf hopping to the next bar
  item with its menu open, `Escape` unwinding one level at a time, `Home`/`End`
  and accent-insensitive type-ahead. A vertical bar keeps the same roles with
  `aria-orientation="vertical"` and swapped axes.
- **Know when not to use it** — the APG's own advice: for plain site
  navigation, a `<nav>` of links (optionally with the disclosure pattern)
  serves better than menubar semantics. This component is for
  application-style command menus. (Angular Material has no menubar at all —
  `MatMenu` is a button-triggered dropdown; the CDK's `cdkMenuBar` is the
  closest reference.)
- **Shared machinery, not a second menu** — submenus at every depth are the
  suite's canonical `oge-menu-list` in an anchored panel on the one shared
  Escape stack, so a menubar submenu, a grid context menu and a drop-down
  button all behave — and can now all nest — identically.
- **Open mode without the knob forest** — `openMode: 'click' | 'hover'`
  governs the top level only; nested levels always open on hover (50/300 ms
  show/hide dwell) and on `ArrowRight`/`Enter`, the reference libraries'
  first-vs-nested split baked in as behavior.
- **Responsive to its own container** — `compactBelow` measures the menubar's
  own box, never the window; below it the whole bar becomes one hamburger
  button opening the full tree as nested menus. The rule is core's pure
  `resolveMenubarCompact()`.
- **Router-friendly without a router dependency** — `url` items render as real
  links, `activeKey` marks the current item with `aria-current="page"`, and
  `itemClick` (with its hierarchical `path`) is where navigation happens.
- **Cancelable pipeline** — `submenuOpening` / `submenuClosing` carry the
  house mutable `cancel` flag; `submenuOpened` / `submenuClosed` report, with
  the close reason.
- **Accelerators and badges** — `shortcut` renders a right-aligned hint
  announced via `aria-keyshortcuts` (no reference menu renders accelerator
  text at all; the actual key binding stays the application's), `badge` adds a
  counter pill — both live on the canonical `OgeMenuItem`, so every menu in
  the suite gained them.

See the [API reference](https://ogeui.com/components/tree-view/api) for the full
surface.

## Breadcrumb

```html
<oge-breadcrumb [items]="trail" (itemClick)="go($event)" />
```

Crumbs come from a flat data trail, from `<oge-breadcrumb-item>` children, or
both (children first).

### What it does

- **The WAI-ARIA APG breadcrumb, verbatim** — a `<nav>` landmark holding an
  ordered list of real links, the current page carrying
  `aria-current="page"` and never interactive, separators `aria-hidden`
  decoration. The APG defines **no keyboard behavior** for a breadcrumb, so
  none is invented: crumbs are plain links in the Tab order, with no roving
  tabindex. (Neither DevExtreme nor Angular Material/CDK ships a breadcrumb
  at all — the parity references are Kendo and PrimeNG.)
- **Container-width collapse that loses nothing** — `collapseMode: 'auto'`
  (default) measures the breadcrumb's **own box**, never the window, and
  collapses the **oldest middle** crumbs first; first and last always stay
  visible. Unlike the references, the collapsed crumbs stay reachable: the
  ellipsis button opens them as real links in the suite's shared menu. The
  fitting arithmetic is core's pure `fitToolbarItems` — the same kernel the
  toolbar's overflow uses. `'wrap'` breaks onto rows, `'none'` keeps one
  scrollable row.
- **Router-friendly without a router dependency** — `url` crumbs render as
  real `<a href>` (middle-click and copy-address work); `preventDefault()` in
  `itemClick` hands navigation to a router. `itemClick` carries
  `{ item, key, index, event }` and never fires for disabled crumbs or the
  last crumb.
- **Templates that cannot break the semantics** — `[ogeBreadcrumbItemTemplate]`
  replaces the crumb's interior only (link/current/disabled elements stay with
  the component); `[ogeBreadcrumbSeparatorTemplate]` renders inside the
  `aria-hidden` separator.
- **Config** — `provideOgeBreadcrumbConfig()`; the nav landmark's label and
  the ellipsis button's label live in `OgeBreadcrumbMessages`.

See the [API reference](https://ogeui.com/components/tree-view/api) for the full
surface.

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/navigation/llms.txt` — conventions, every documented member
and copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index)
and <https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
