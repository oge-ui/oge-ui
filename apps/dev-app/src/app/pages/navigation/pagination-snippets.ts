import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgePagination'] },
  template: `<!-- pageIndex is 0-BASED and two-way; the numeric window keeps a
     CONSTANT width — ellipsis slots count toward maxButtons (default 7), so
     paging from the first page to the middle never jitters the layout. An
     ellipsis never hides a single page (it would render the page instead). -->
<oge-pagination [(pageIndex)]="page" [itemCount]="total" [pageSize]="20" />`,
  body: `protected readonly page = signal(0);
protected readonly total = 400;`,
});

export const SIZES_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgePagination'] },
  template: `<!-- Presence of pageSizes shows the selector (no separate boolean);
     'all' commits pageSize 0 — "all items on one page", the grid pager's
     exact contract. Changing the size re-clamps pageIndex before the rich
     pageSizeChanged event reports it. -->
<oge-pagination
  [(pageIndex)]="page"
  [(pageSize)]="size"
  [itemCount]="total"
  [pageSizes]="[10, 20, 50, 'all']"
  [showInfo]="true"
/>`,
  body: `protected readonly page = signal(0);
protected readonly size = signal(20);
protected readonly total = 97;`,
});

export const JUMP_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgePagination'] },
  template: `<!-- First/last jump buttons (Material's showFirstLastButtons) and
     the jump-to-page input (PrimeNG's showJumpToPageInput; Kendo's
     type: 'input'): 1-based display, Enter/blur commit, clamped into range,
     display re-synced after a clamp. -->
<oge-pagination
  [(pageIndex)]="page"
  [itemCount]="total"
  [pageSize]="10"
  [showFirstLastButtons]="true"
  [showJumpToPageInput]="true"
/>`,
  body: `protected readonly page = signal(41);
protected readonly total = 1000;`,
});

export const UNKNOWN_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgePagination'] },
  template: `<!-- itemCount undefined = the server cannot count. Only prev/next
     and a "Page N" indicator render, and NEXT NEVER DISABLES — the component
     cannot know the end. Clamp pageIndex yourself when the server reports the
     last page. -->
<oge-pagination [(pageIndex)]="page" [pageSize]="20" />`,
  body: `protected readonly page = signal(3);`,
});

export const ADAPTIVE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgePagination'] },
  template: `<!-- displayMode 'adaptive' switches to the compact "N / M"
     indicator below the container threshold (config compactBelow, default
     480px) — measured against the pagination's OWN box via ResizeObserver,
     never the window (core's resolveMenubarCompact). 'compact' forces the
     indicator unconditionally. -->
<div style="max-width: 320px">
  <oge-pagination
    [(pageIndex)]="page"
    [itemCount]="total"
    [pageSize]="20"
    displayMode="adaptive"
  />
</div>`,
  body: `protected readonly page = signal(4);
protected readonly total = 400;`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgePagination'] },
  helpers: { '@oge-ui/navigation': ['provideOgePaginationConfig'] },
  template: `<oge-pagination [(pageIndex)]="page" [itemCount]="total" [showInfo]="true" />`,
  body: `protected readonly page = signal(0);
protected readonly total = 250;`,
  before: `// Application- or component-scoped defaults; per-instance [messages] wins.
// providers: [
//   provideOgePaginationConfig({
//     maxButtons: 9,
//     messages: { pageSizeLabel: 'Sayfa başına', info: '{itemCount} kayıttan {from}–{to}' },
//   }),
// ]`,
});
