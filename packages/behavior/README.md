# @oge-ui/behavior

The framework-free **interaction and accessibility layer** behind the
[OGE](https://www.npmjs.com/package/@oge-ui/grid) UI suite. Plain TypeScript,
shipped as ESM, with zero dependency on Angular, React or any other framework —
the sibling of [`@oge-ui/core`](https://www.npmjs.com/package/@oge-ui/core),
which owns the _data_ engine while this package owns _behaviour_.

Where `@oge-ui/core` answers "what rows are visible", this package answers
"where does the panel go, who has focus, and which surface does Escape close".

## What's inside

**Popup positioning.** `resolvePopupPosition` takes an anchor rectangle, a panel
size, a viewport and a logical `OgePopupPlacement` (`'bottom-start'`, a bare
`'top'` for edge-centred tooltips, …) and returns viewport-relative coordinates
for `position: fixed`, flipping to the opposite side and clamping to the
viewport when the preferred placement does not fit. It is RTL-aware and takes no
DOM: measure however you like, then ask it where to put things.

**Focus trapping.** `getTabbableElements` computes visible, enabled, tabbable
descendants in DOM order, and `trapTabKey` wraps Tab / Shift+Tab across that set.
Tabbables are recomputed at key-press time rather than fenced by sentinel
elements, so content added or removed while a dialog is open never leaves the
trap stale.

**The shared overlay stack.** `pushOverlay` / `removeOverlay` / `isTopOverlay`
order every open surface — anchored panels, modals, drawers — bottom to top, so
Escape only ever acts on the topmost one. There is deliberately exactly _one_
stack: two competing stacks would each believe they hold the top surface, and
Escape inside a popup opened within a drawer would close the drawer instead.

**Body scroll locking.** `lockBodyScroll` / `unlockBodyScroll` are ref-counted
for stacked modals, compensate the vanishing scrollbar width in a single
measure-then-write pass, and restore the previously inlined styles verbatim.

**Pointer gestures.** `beginPointerGesture` is the one drag machine every
package uses (there is no HTML5 drag and drop anywhere in the suite): a 3px
threshold, pointer capture, capture-phase Escape, blur / `pointercancel`
cancel, a touch long press, `touch-action` override with restore and click
suppression after a drag. `beginPointerDragDrop` adds hit-testing, a ghost
preview and edge auto-scroll (`createAutoScroller`); `prepareTouchDrag`
readies a touch target.

**Announcements.** `OgeLiveAnnouncerCore` keeps one polite and one assertive
visually hidden live region per document — created lazily (SSR-inert),
debounced, deduplicated and auto-cleared — and `getOgeLiveAnnouncer()` hands
it out; toast, Gantt, the uploader, the grids and the pivot speak through it.

**Adaptive popups.** `OgeAdaptiveSheetCore` owns everything modal about the
mobile bottom sheet / full-screen dialog behind `adaptiveMode: 'auto'` —
scroll lock, inert background, Tab trap, initial focus and focus restore,
swipe-down dismiss and `visualViewport` tracking for the on-screen keyboard.
Anchored panels position against the visual viewport too.

**Motion.** `prefersReducedMotion()` / `motionScrollBehavior()` let script
driven motion (smooth scrolling) honour `prefers-reduced-motion`.

**Security helpers.** `sanitizeUrl` is a scheme allowlist (relative,
`http(s)`, `mailto`, `tel`, `ftp`, `sms`; extend with `allowedSchemes`, while
script schemes can never be allowed and `blob:` / `data:` stay behind
`allowObjectUrls`).

**PDF fonts.** `OgePdfFont` + `setOgePdfDefaultFont()` / `registerOgePdfFont`
embed a Unicode TrueType font in every PDF export (grid, tree list, pivot,
Gantt), so text outside Latin-1 (Turkish ğ ş ı İ, Cyrillic, …) renders.

**Component machines.** Since 0.12 the package also carries the _behaviour_
of every family that ships in more than one render layer, each machine
written once against a tiny `OgeReactivityAdapter` (`cell` / `derived`) that
Angular backs with signals and React with a versioned store:

- inputs — commit/debounce pipeline, select-list (filter, group, lazy items),
  `OgeRemoteListCore` (paged remote `dataSource`, debounced abortable search),
  cancelable dropdown pre-events, select-all helpers, the multi-column combo
  box core, dropdown virtualizer, `OgeMaskCore` (input masks, IME-safe),
  `OgeDateSegmentCore`, `formatNumberWhileTyping`, date-range presets,
  `contrastRatio` + palette presets, choice-group selection rules and
  number/date/calendar/slider/color math;
- layout, tabs, navigation — accordion, splitter, toolbar overflow, tab
  activation/closing, tree view, drawer, stepper, menubar cores;
- forms — the item model, rule evaluator (incl. the `compare` rule and the
  `visibleWhen` / `requiredWhen` / `disabledWhen` conditions), server-error
  merging and layout math;
- upload — chunk planning, transfer queue, XHR adapter, drag/paste reading,
  validation and the `OgeFileUploaderCore` list machine;
- overlay — `OgeAnchoredPanelCore`, menu navigation/type-ahead, tooltip, modal
  (focus, inert background, drag/resize clamps) and toast cores;
- grid — `OgeGridStateCore` (sort/paging/filter/grouping/expansion/columns/
  selection/editing slices + `loadOptions`), `OgeGridDataCore` (switchMap
  loads, windowed blocks, push patching), the column resolver and adaptive
  hiding, `OgeGridColumnLayoutCore`, `OgeGridRowVirtualizerCore`,
  `OgeGridKeyboardNavCore`, `OgeGridDeferredChildrenCore`,
  `OgeGridStatePersistenceCore`, the filter-row/header-filter/builder helpers
  (incl. Excel-style header conditions and the date tree),
  `OgeGridRangeSelectionCore` with TSV copy / paste planning, fill series and
  `OgeGridEditHistory` (undo / redo), cell-span layout, class hooks and
  conditional formats, auto-fit, the cross-grid row-drag registry,
  keyboard alternatives for every drag (`grid-keyboard-moves`),
  `OgeGridAnnouncements`, adaptive detail
  (`resolveOgeGridAdaptiveHiddenColumns`), `syncOgeEditorErrorAria` and the
  grid's message catalog and option vocabulary;
- tree list — `OgeTreeListCore` (index, expansion, filtering incl. remote
  filtering, lazy children, recursive selection, keyboard moves, drops,
  `summary.totalItems` / `recursiveItems`);
- export — the shared export model behind `@oge-ui/behavior/export-excel`
  (`buildExcelWorkbook`: band headers, freeze panes, outline levels, summary
  rows, styles) and `@oge-ui/behavior/export-pdf` (`buildPdfDocument`,
  `buildTreePdfDocument`).

Every machine has a framework-free spec beside it; `src/index.spec.ts` guards
the barrel, which is the React layer's entire import surface.

## Installation

You rarely install this directly — the OGE component packages depend on it.

```sh
npm install @oge-ui/behavior
```

## Licence

MIT. See [LICENSE](LICENSE).
