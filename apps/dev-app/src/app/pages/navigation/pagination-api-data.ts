import type { ApiSections } from '../../shared/api-reference';

// Hand-compiled from packages/navigation/src/lib/pagination/** — keep in sync
// with the source TSDoc.

export const OGE_PAGINATION_API: ApiSections = {
  properties: [
    {
      title: 'OgePagination',
      entries: [
        {
          name: 'pageIndex',
          type: 'model&lt;number&gt;',
          default: '0',
          description:
            'The current page — <strong>0-based</strong>, two-way. Auto-clamped when the page count shrinks (an implicit <code>pageIndexChange</code>, no rich event). DevExtreme migrators: check your origin — dx documentation is ambiguous about its base.',
        },
        {
          name: 'pageSize',
          type: 'model&lt;number&gt;',
          default: '20',
          description:
            'Items per page — two-way. <code>0</code> means "all items on one page" (the grid pager contract, kept aligned for eventual delegation).',
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
            "Jump-to-page input (PrimeNG name; Kendo's <code>type: 'input'</code>): 1-based display, Enter/change commit, clamped into range, display re-synced after a clamp. Hidden while the total is unknown.",
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
          name: 'pageCount',
          type: 'Signal&lt;number | undefined&gt;',
          description:
            "Readonly derived page count; <code>undefined</code> while the total is unknown. DevExtreme's <code>getPageCount()</code> as a signal — the house read API.",
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'firstPage() / lastPage() / nextPage() / previousPage()',
          type: 'void',
          description:
            'Programmatic paging (Material names). <code>lastPage()</code> no-ops while the total is unknown. Model updates only — no rich event (no user event).',
        },
        {
          name: 'hasPreviousPage() / hasNextPage()',
          type: 'boolean',
          description:
            '<code>hasNextPage()</code> returns <code>true</code> while the total is unknown — the component cannot know the end.',
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
          name: 'pageChanged',
          type: 'OgePaginationPageChangedEvent',
          description:
            '<code>{ pageIndex, previousPageIndex, pageSize, event }</code> — user interactions only; programmatic writes and auto-clamps update the model without it.',
        },
        {
          name: 'pageSizeChanged',
          type: 'OgePaginationPageSizeChangedEvent',
          description:
            '<code>{ pageSize, previousPageSize, pageIndex, event }</code> — <code>pageIndex</code> reports the <strong>post-clamp</strong> page (changing the size can move the current page).',
        },
        {
          name: 'pageIndexChange / pageSizeChange',
          type: 'number',
          description:
            'The implicit model outputs — fire on every change including programmatic writes and auto-clamps.',
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
          description: 'The string unions of the mode and density inputs.',
        },
        {
          name: 'resolvePageWindow / resolvePageRange / resolvePageCount / OGE_PAGE_ELLIPSIS',
          type: '@oge-ui/core',
          description:
            'The DOM-free paging kernel (<code>pagination-math.ts</code>): the constant-width page window with real ellipsis markers, the from/to info arithmetic and the never-below-1 page-count division — unit-tested without a DOM.',
        },
      ],
    },
  ],
};

export const OGE_PAGINATION_CONFIG_API: ApiSections = {
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
            'Application-wide input defaults; the component resolves <code>input ?? config ?? literal</code> (480px / 7).',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'provideOgePaginationConfig(config: OgePaginationConfigInput)',
          type: 'Provider',
          description:
            'Application- or component-scoped defaults; shallow-merges <code>messages</code> over the built-ins.',
        },
      ],
    },
  ],
};
