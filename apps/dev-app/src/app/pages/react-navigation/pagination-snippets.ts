import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React pagination page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../navigation/pagination-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same six sections, in the same
 * order, with the same example content (400/97/1000/400/250 items, the same
 * page sizes and the same labels) — translated to React idiom. Angular's
 * `[(pageIndex)]` / `[(pageSize)]` bananas become the controlled
 * `pageIndex` + `onPageIndexChange` / `pageSize` + `onPageSizeChange` pairs
 * (with `defaultPageIndex` / `defaultPageSize` for the uncontrolled mode), and
 * `provideOgePaginationConfig()` becomes `<OgePaginationConfigProvider>`.
 */
export const NAVIGATION_PAGINATION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'Numeric buttons in a constant-width window with real ellipsis markers. onPageChanged reports previousPageIndex and fires only on user interaction — programmatic writes and auto-clamps update the state silently.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgePagination'] },
      name: 'PaginationBasicDemo',
      before: `// pageIndex is 0-BASED and controlled (pass defaultPageIndex instead for
// the uncontrolled mode); the numeric window keeps a CONSTANT width —
// ellipsis slots count toward maxButtons (default 7), so paging from the
// first page to the middle never jitters the layout. An ellipsis never
// hides a single page (it would render the page instead).`,
      body: `const [page, setPage] = useState(0);
const total = 400;`,
      jsx: `<OgePagination
  pageIndex={page}
  onPageIndexChange={setPage}
  itemCount={total}
  pageSize={20}
/>`,
    }),
  },
  {
    title: 'Page sizes and info',
    description:
      "Presence of pageSizes shows the selector; 'all' commits pageSize 0. showInfo renders the {from}–{to} of {itemCount} range from messages, in a polite live region. Shrinking the count auto-clamps pageIndex.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgePagination'] },
      name: 'PaginationSizesDemo',
      before: `// Presence of pageSizes shows the selector (no separate boolean);
// 'all' commits pageSize 0 — "all items on one page", the grid pager's
// exact contract. Changing the size re-clamps pageIndex before the rich
// onPageSizeChanged callback reports it.`,
      body: `const [page, setPage] = useState(0);
const [size, setSize] = useState(20);
const total = 97;`,
      jsx: `<OgePagination
  pageIndex={page}
  onPageIndexChange={setPage}
  pageSize={size}
  onPageSizeChange={setSize}
  itemCount={total}
  pageSizes={[10, 20, 50, 'all']}
  showInfo
/>`,
    }),
  },
  {
    title: 'Jump controls',
    description:
      'First/last buttons and the jump-to-page input are opt-in — the numeric rails already render both ends, so the defaults stay lean. The jump input displays 1-based, commits on blur or Enter and clamps into range.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgePagination'] },
      name: 'PaginationJumpDemo',
      before: `// First/last jump buttons (Material's showFirstLastButtons) and the
// jump-to-page input (PrimeNG's showJumpToPageInput; Kendo's
// type: 'input'): 1-based display, clamped into range, display re-synced
// after a clamp. The input is UNCONTROLLED and commits on BLUR or ENTER —
// React has no onChange bound to the native \`change\` event, so there is
// no commit-on-commit-of-the-native-change moment the Angular version
// gets from (change).`,
      body: `const [page, setPage] = useState(41);
const total = 1000;`,
      jsx: `<OgePagination
  pageIndex={page}
  onPageIndexChange={setPage}
  itemCount={total}
  pageSize={10}
  showFirstLastButtons
  showJumpToPageInput
/>`,
    }),
  },
  {
    title: 'Unknown total',
    description:
      'Without itemCount the total is unknown: only prev/next and a "Page N" indicator render, and next never disables — the component cannot know the end. Clamp pageIndex at the app level when the server reports the last page.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgePagination'] },
      name: 'PaginationUnknownDemo',
      before: `// itemCount undefined = the server cannot count. Only prev/next and a
// "Page N" indicator render, and NEXT NEVER DISABLES — the component
// cannot know the end. Clamp pageIndex yourself when the server reports
// the last page. The ref handle's pageCount() returns undefined here.`,
      body: `const [page, setPage] = useState(3);`,
      jsx: `<OgePagination pageIndex={page} onPageIndexChange={setPage} pageSize={20} />`,
    }),
  },
  {
    title: 'Adaptive display',
    description:
      "displayMode: 'adaptive' collapses to the compact N / M indicator below the container threshold (compactBelow, default 480px) — measured against the bar's own box, never the window. 'compact' forces the indicator.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgePagination'] },
      name: 'PaginationAdaptiveDemo',
      before: `// displayMode 'adaptive' switches to the compact "N / M" indicator below
// the container threshold (config compactBelow, default 480px) — measured
// against the pagination's OWN box via ResizeObserver, never the window
// (behavior's paginationIsCompact). 'compact' forces the indicator
// unconditionally.`,
      body: `const [page, setPage] = useState(4);
const total = 400;`,
      jsx: `<div style={{ maxWidth: 320 }}>
  <OgePagination
    pageIndex={page}
    onPageIndexChange={setPage}
    itemCount={total}
    pageSize={20}
    displayMode="adaptive"
  />
</div>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Every string — the <nav> label, button aria labels, the info template — lives in OgePaginationMessages: override for a subtree via <OgePaginationConfigProvider> or per instance via the messages prop. maxButtons, displayMode and compactBelow carry config defaults too.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-navigation': [
          'OgePagination',
          'OgePaginationConfigProvider',
        ],
      },
      name: 'PaginationConfigDemo',
      before: `// Application- or subtree-scoped defaults; the per-instance messages prop
// wins over them, and both shallow-merge over the built-in strings.`,
      body: `const [page, setPage] = useState(0);
const total = 250;`,
      jsx: `<OgePaginationConfigProvider
  config={{
    maxButtons: 9,
    messages: {
      pageSizeLabel: 'Sayfa başına',
      info: '{itemCount} kayıttan {from}–{to}',
    },
  }}
>
  <OgePagination
    pageIndex={page}
    onPageIndexChange={setPage}
    itemCount={total}
    showInfo
  />
</OgePaginationConfigProvider>`,
    }),
  },
];
