import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/navigation/src/lib/pagination.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Member-for-member mirror of `../navigation/pagination-api-data.ts` (the
 * parity gate diffs the two): Angular's `[(pageIndex)]` / `[(pageSize)]`
 * models are the controlled `pageIndex` + `onPageIndexChange` /
 * `pageSize` + `onPageSizeChange` pairs (with `defaultPageIndex` /
 * `defaultPageSize` for the uncontrolled mode), the outputs are callbacks, the
 * public methods live on the `ref` handle and `provideOgePaginationConfig()`
 * becomes `<OgePaginationConfigProvider>`.
 */

export const OGE_REACT_PAGINATION_API: ApiSections = {
  properties: [
    {
      title: 'OgePagination',
      entries: [
        {
          name: 'pageIndex',
          type: 'number | undefined',
          default: '0',
          description:
            'The current page — <strong>0-based</strong>, controlled; pair it with <code>onPageIndexChange</code>. Auto-clamped when the page count shrinks (an implicit <code>onPageIndexChange</code>, no rich event). DevExtreme migrators: check your origin — dx documentation is ambiguous about its base.',
        },
        {
          name: 'defaultPageIndex',
          type: 'number | undefined',
          default: '0',
          description:
            'Initial page of the <strong>uncontrolled</strong> mode — the half of Angular&rsquo;s <code>[(pageIndex)]</code> model React splits out. Ignored once <code>pageIndex</code> is passed.',
        },
        {
          name: 'pageSize',
          type: 'number | undefined',
          default: '20',
          description:
            'Items per page — controlled; pair it with <code>onPageSizeChange</code>. <code>0</code> means "all items on one page" (the grid pager contract, kept aligned for eventual delegation).',
        },
        {
          name: 'defaultPageSize',
          type: 'number | undefined',
          default: '20',
          description:
            'Initial size of the <strong>uncontrolled</strong> mode. Ignored once <code>pageSize</code> is passed.',
        },
        {
          name: 'itemCount',
          type: 'number | undefined',
          description:
            'Total items. <code>undefined</code> = unknown total: only prev/next and a "Page N" indicator render, and <strong>next never disables</strong> — clamp <code>pageIndex</code> yourself when the server reports the end.',
        },
        {
          name: 'pageSizes',
          type: "readonly (number | 'all')[] | undefined",
          description:
            "Page-size choices; <code>'all'</code> adds the unpaged option. <strong>Presence shows the selector</strong> — no separate boolean (DevExtreme's <code>showPageSizeSelector</code> is deliberately skipped).",
        },
        {
          name: 'showInfo',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the <code>{from}–{to} of {itemCount}</code> range (the <code>info</code> message template) in an <code>aria-live="polite"</code> region.',
        },
        {
          name: 'showFirstLastButtons',
          type: 'boolean',
          default: 'false',
          description:
            'First/last jump buttons (Material name and default) — the numeric window already renders both rail pages, so they are opt-in chrome.',
        },
        {
          name: 'showNavigationButtons',
          type: 'boolean',
          default: 'true',
          description:
            'Prev/next buttons; forced on in compact and unknown-total modes (they are the backbone there).',
        },
        {
          name: 'showJumpToPageInput',
          type: 'boolean',
          default: 'false',
          description:
            "Jump-to-page input (PrimeNG name; Kendo's <code>type: 'input'</code>): 1-based display, clamped into range, display re-synced after a clamp. Hidden while the total is unknown. <strong>React idiom:</strong> the input is uncontrolled and commits on <strong>blur or Enter</strong> — React has no <code>onChange</code> bound to the native <code>change</code> event, which is what the Angular version listens to alongside <code>(keydown.enter)</code>.",
        },
        {
          name: 'maxButtons',
          type: 'number | undefined',
          default: '7 (config)',
          description:
            'Total rendered slots <strong>including ellipsis slots</strong> — the window width never changes while paging, so the bar never jitters. An ellipsis hiding a single page renders the page instead.',
        },
        {
          name: 'displayMode',
          type: "'full' | 'compact' | 'adaptive'",
          default: "'full' (config)",
          description:
            "<code>'compact'</code> renders the <code>N / M</code> indicator; <code>'adaptive'</code> switches below <code>compactBelow</code> (config, default 480px), measured against the bar's own container via ResizeObserver — never the window.",
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disables every control (native <code>disabled</code> — they are all real buttons/selects/inputs).',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Density preset (26/32/40px hit targets).',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgePaginationMessages&gt;',
          description:
            'Per-instance string overrides, merged over the config messages. Several bars on one page need distinct <code>paginationLabel</code> values — landmarks must be unique (axe <code>landmark-unique</code>).',
        },
        {
          name: 'className / style / id',
          type: 'string | CSSProperties | string',
          description:
            'Merged onto the pagination host. <code>className</code> is appended to the generated <code>oge-pagination*</code> classes; the Angular host takes <code>class</code>/<code>style</code>/<code>id</code> natively.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgePaginationHandle (ref)',
      entries: [
        {
          name: 'firstPage() / lastPage() / nextPage() / previousPage()',
          type: 'void',
          description:
            'Programmatic paging (Material names). <code>lastPage()</code> no-ops while the total is unknown. State updates only — no rich event (no user event).',
        },
        {
          name: 'hasPreviousPage() / hasNextPage()',
          type: 'boolean',
          description:
            '<code>hasNextPage()</code> returns <code>true</code> while the total is unknown — the component cannot know the end.',
        },
        {
          name: 'pageCount()',
          type: 'number | undefined',
          description:
            "Total pages; <code>undefined</code> while the total is unknown. DevExtreme's <code>getPageCount()</code> — a handle method rather than the Angular signal, because React has no signal to read off the instance.",
        },
        {
          name: 'focus()',
          type: 'void',
          description: 'Moves keyboard focus to the first enabled control.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onPageChanged',
          type: '(event: OgePaginationPageChangedEvent) =&gt; void',
          description:
            '<code>{ pageIndex, previousPageIndex, pageSize, event }</code> — user interactions only; programmatic writes and auto-clamps update the state without it.',
        },
        {
          name: 'onPageSizeChanged',
          type: '(event: OgePaginationPageSizeChangedEvent) =&gt; void',
          description:
            '<code>{ pageSize, previousPageSize, pageIndex, event }</code> — <code>pageIndex</code> reports the <strong>post-clamp</strong> page (changing the size can move the current page).',
        },
        {
          name: 'onPageIndexChange / onPageSizeChange',
          type: '(value: number) =&gt; void',
          description:
            'The controlled halves of Angular&rsquo;s <code>[(pageIndex)]</code> / <code>[(pageSize)]</code> models — fire on every change including programmatic writes and auto-clamps.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgePaginationDisplayMode / OgePaginationSize',
          type: 'types',
          description:
            'The string unions of the mode and density props, re-exported from <code>&#64;oge-ui/behavior</code>.',
        },
        {
          name: 'OgePaginationProps / OgePaginationHandle',
          type: 'interface',
          description:
            'The props of <code>&lt;OgePagination&gt;</code> and the shape of its <code>ref</code> handle.',
        },
        {
          name: 'resolvePageWindow / resolvePageRange / resolvePageCount / OGE_PAGE_ELLIPSIS',
          type: '@oge-ui/behavior',
          description:
            'The DOM-free paging kernel (<code>pagination-math.ts</code>): the constant-width page window with real ellipsis markers, the from/to info arithmetic and the never-below-1 page-count division — the <strong>same module</strong> the Angular component runs on, unit-tested without a DOM.',
        },
      ],
    },
  ],
};

export const OGE_REACT_PAGINATION_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgePaginationConfig',
      entries: [
        {
          name: 'messages',
          type: 'OgePaginationMessages',
          description:
            'All strings: <code>paginationLabel</code> (the <code>&lt;nav&gt;</code> name), <code>firstPage</code>/<code>lastPage</code>/<code>previousPage</code>/<code>nextPage</code>, <code>pageLabel</code> (<code>{page}</code>, 1-based), <code>info</code> (<code>{from}</code> <code>{to}</code> <code>{itemCount}</code>), <code>pageInfoUnknown</code>, <code>pageIndicator</code> (<code>{page}</code> <code>{pageCount}</code>), <code>pageSizeLabel</code>, <code>allRows</code>, <code>jumpLabel</code>.',
        },
        {
          name: 'displayMode / compactBelow / maxButtons',
          type: 'OgePaginationDisplayMode / number / number',
          description:
            'Subtree-wide prop defaults; the component resolves <code>prop ?? config ?? literal</code> (480px / 7).',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'OgePaginationConfigProvider',
          type: '(props: { config?: OgePaginationConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Subtree defaults — the React counterpart of <code>provideOgePaginationConfig()</code>; shallow-merges <code>messages</code> over the built-ins.',
        },
        {
          name: 'useOgePaginationConfig()',
          type: '() =&gt; OgePaginationConfig',
          description:
            'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_PAGINATION_CONFIG</code> — the hook behind the component, exported for pagination chrome you compose yourself.',
        },
      ],
    },
  ],
};
