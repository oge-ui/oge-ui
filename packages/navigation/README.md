# @oge-ui/navigation

Navigation controls for the [OGE](https://ogeui.com) Angular UI suite.
Signal-based, standalone, zoneless-ready, MIT.

Today the package ships **`OgeTreeView`**.

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

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/navigation/llms.txt` — conventions, every documented member
and copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index)
and <https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
