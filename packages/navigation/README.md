# @oge-ui/navigation

Navigation controls for the [OGE](https://ogeui.com) Angular UI suite.
Signal-based, standalone, zoneless-ready, MIT.

Today the package ships **`OgeTreeView`**, **`OgeDrawer`** and **`OgeStepper`**.

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

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/navigation/llms.txt` — conventions, every documented member
and copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index)
and <https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
