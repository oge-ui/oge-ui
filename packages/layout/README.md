# @oge-ui/layout

Layout containers for the [OGE](https://ogeui.com) Angular UI suite. Signal-based,
standalone, zoneless-ready, MIT.

Today the package ships **`OgeAccordion`** and its declarative child
**`OgeAccordionItem`**.

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

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/layout/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
