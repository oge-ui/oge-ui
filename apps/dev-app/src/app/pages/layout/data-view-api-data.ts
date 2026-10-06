import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/data-view/src/** and the shared core
 * (packages/behavior/src/lib/layout/data-view-core.ts) — keep in sync with the
 * source TSDoc when the public API changes.
 */

/** Shared with the React page: the vocabulary both layers export. */
export const DATA_VIEW_VOCABULARY: ApiGroup = {
  title: 'Vocabulary',
  entries: [
    {
      name: 'OgeDataViewLayout',
      type: "'grid' | 'list'",
      description: 'Responsive columns, or one item per row.',
    },
    {
      name: 'OgeDataViewSelectionMode',
      type: "'none' | 'single' | 'multiple'",
      description:
        '<code>none</code> renders a <code>list</code>; <code>single</code> / <code>multiple</code> an APG <code>listbox</code>.',
    },
    {
      name: 'OgeDataViewKey',
      type: 'string | number',
      description: 'An item identity, from <code>keyExpr</code>.',
    },
    {
      name: 'OgeDataViewKeyExpr',
      type: 'string | ((item: T) => OgeDataViewKey)',
      description:
        'Field (dot paths allowed) or function; an item without a usable key falls back to its index.',
    },
    {
      name: 'OgeDataViewDisplayExpr',
      type: 'string | ((item: T) => string)',
      description:
        'Where the fallback text of a template-less item comes from.',
    },
    {
      name: 'OgeDataViewSearchExpr',
      type: 'string | readonly string[] | ((item: T) => string)',
      description: 'The text the search matches.',
    },
    {
      name: 'OgeDataViewSort',
      type: "{ field: string; direction: 'asc' | 'desc' }",
      description: 'The active sort.',
    },
    {
      name: 'OgeDataViewSortDirection',
      type: "'asc' | 'desc'",
      description: 'Direction of a sort.',
    },
    {
      name: 'OgeDataViewSortOption',
      type: '{ field: string; label: string }',
      description: 'One choice of the built-in sort select.',
    },
    {
      name: 'OgeDataViewLayoutChangedEvent',
      type: '{ layout; previousLayout; event? }',
      description: 'Payload of the layout change.',
    },
    {
      name: 'OgeDataViewPageChangedEvent',
      type: '{ pageIndex; previousPageIndex; pageSize; event? }',
      description: 'Payload of the page change (0-based pages).',
    },
    {
      name: 'OgeDataViewSortChangedEvent',
      type: '{ sort: OgeDataViewSort | null; previousSort; event? }',
      description: 'Payload of the sort change.',
    },
    {
      name: 'OgeDataViewSelectionChangedEvent',
      type: '{ selectedKeys; previousKeys; item?; event? }',
      description:
        'Payload of the selection change; <code>item</code> is absent for Ctrl+A and the methods.',
    },
    {
      name: 'OgeDataViewItemClickEvent',
      type: '{ item: T; index; key; event }',
      description: 'Payload of an item click / activation.',
    },
    {
      name: 'OgeDataViewOptionsChangedEvent',
      type: '{ sort; searchValue; pageIndex; pageSize }',
      description:
        'The request a <code>remoteOperations</code> app answers with the next page.',
    },
  ],
};

export const OGE_DATA_VIEW_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'items',
          type: 'readonly T[]',
          default: '[]',
          description:
            'The items in their own order. With <code>remoteOperations</code>: the current page.',
        },
        {
          name: 'keyExpr',
          type: 'OgeDataViewKeyExpr<T>',
          default: "'id'",
          description:
            'Field (dot paths allowed) or function giving each item’s key — the identity in <code>selectedKeys</code> and every event.',
        },
        {
          name: 'displayExpr',
          type: 'OgeDataViewDisplayExpr<T> | undefined',
          description:
            'The text an item shows without a template; falls back to its <code>title</code>, <code>name</code>, <code>text</code> or <code>label</code> field.',
        },
        {
          name: 'remoteOperations',
          type: 'boolean',
          default: 'false',
          description:
            'The app sorts, searches and pages: listen to <code>optionsChanged</code>, pass the page as <code>items</code> and the total as <code>itemCount</code>.',
        },
        {
          name: 'itemCount',
          type: 'number | undefined',
          description:
            'Total item count under <code>remoteOperations</code>; defaults to the processed items’ length.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description:
            'Marks the items <code>aria-busy</code>; with nothing to show yet it draws skeleton tiles and a visually hidden “Loading…”.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          default: 'config ?? LOCALE_ID',
          description:
            'BCP 47 locale of the sort comparison (numeric collation, so “Item 9” sorts before “Item 10”).',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the items; a listbox falls back to the <code>dataView</code> message.',
        },
      ],
    },
    {
      title: 'Layout',
      entries: [
        {
          name: 'layout',
          type: "'grid' | 'list' (model)",
          default: "config ?? 'grid'",
          description: 'Responsive columns or one item per row — two-way.',
        },
        {
          name: 'showLayoutSwitch',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the grid / list toggle-button group (<code>aria-pressed</code>) in the header.',
        },
        {
          name: 'minItemWidth',
          type: 'number | undefined',
          default: 'config ?? 240',
          description:
            'Narrowest grid cell in px before another column fits. Resolved by a container query on the view’s own inline size, never the window.',
        },
        {
          name: 'columns',
          type: 'number | undefined',
          description:
            'A fixed column count for the grid layout; collapses to one column in a container under 480px.',
        },
        {
          name: 'gap',
          type: 'number | string | undefined',
          default: '16px',
          description: 'Gap between items — px number or any CSS length.',
        },
      ],
    },
    {
      title: 'Paging',
      entries: [
        {
          name: 'pageSize',
          type: 'number | undefined',
          default: 'config ?? 0',
          description: 'Items per page; <code>0</code> shows every item.',
        },
        {
          name: 'pageIndex',
          type: 'number (model)',
          default: '0',
          description:
            '0-based current page — two-way, clamped into the page range when rendered.',
        },
        {
          name: 'showPager',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the built-in pager when there is more than one page. Set it to <code>false</code> and bind an <code>oge-pagination</code> to <code>[(pageIndex)]</code> for the full bar (the layout package does not depend on navigation).',
        },
        {
          name: 'showPageInfo',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the <code>{from}–{to} of {itemCount}</code> text beside the pager.',
        },
      ],
    },
    {
      title: 'Sorting, search & filtering',
      entries: [
        {
          name: 'sortOptions',
          type: 'readonly OgeDataViewSortOption[]',
          default: '[]',
          description:
            'Choices of the built-in sort select (plus a direction toggle); empty hides both.',
        },
        {
          name: 'sort',
          type: 'OgeDataViewSort | null (model)',
          default: 'null',
          description:
            'The active sort — two-way. Text compares with the locale’s collator, numbers / dates / booleans numerically, empty values last.',
        },
        {
          name: 'filter',
          type: '((item: T) => boolean) | null',
          default: 'null',
          description: 'A predicate the items must pass (client-side only).',
        },
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'false',
          description: 'Renders the search field in the header.',
        },
        {
          name: 'searchValue',
          type: 'string (model)',
          default: "''",
          description:
            'The search text — two-way. Every word must occur, compared case-, accent- and locale-insensitively.',
        },
        {
          name: 'searchExpr',
          type: 'OgeDataViewSearchExpr<T> | undefined',
          description:
            'Field(s) or function the search matches; default every primitive field.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'selectionMode',
          type: "'none' | 'single' | 'multiple'",
          default: "'none'",
          description:
            'Selection turns the list into an APG listbox: one roving tab stop, arrows in reading order (mirrored in RTL), Up / Down by the measured column count, PageUp / PageDown turn the page, Space / Enter toggle, Ctrl+A selects all. Options are leaves, so the template must not hold controls.',
        },
        {
          name: 'selectedKeys',
          type: 'readonly OgeDataViewKey[] (model)',
          default: '[]',
          description: 'Keys of the selected items — two-way.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus(index?)',
          type: '(index?: number) => void',
          description:
            'Focuses the item at <code>index</code> of the page (default: the tab stop); without selection the first focusable control inside the items.',
        },
        {
          name: 'goToPage(index)',
          type: '(index: number) => void',
          description:
            'Shows page <code>index</code> (clamped) and emits <code>pageChanged</code> when it changed.',
        },
        {
          name: 'setLayout(layout)',
          type: '(layout: OgeDataViewLayout) => void',
          description:
            'Switches the layout and emits <code>layoutChanged</code> when it changed.',
        },
        {
          name: 'clearSelection()',
          type: '() => void',
          description:
            'Deselects everything (emits <code>selectionChanged</code>).',
        },
        {
          name: 'selectAll()',
          type: '() => void',
          description:
            'Selects every item that passes the filter and search — multiple selection only.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'layoutChange',
          type: 'OgeDataViewLayout',
          description: 'The banana half of <code>[(layout)]</code>.',
        },
        {
          name: 'pageIndexChange',
          type: 'number',
          description: 'The banana half of <code>[(pageIndex)]</code>.',
        },
        {
          name: 'sortChange',
          type: 'OgeDataViewSort | null',
          description: 'The banana half of <code>[(sort)]</code>.',
        },
        {
          name: 'searchValueChange',
          type: 'string',
          description: 'The banana half of <code>[(searchValue)]</code>.',
        },
        {
          name: 'selectedKeysChange',
          type: 'readonly OgeDataViewKey[]',
          description: 'The banana half of <code>[(selectedKeys)]</code>.',
        },
        {
          name: 'layoutChanged',
          type: 'OgeDataViewLayoutChangedEvent',
          description:
            'The layout changed through the switch or <code>setLayout()</code>.',
        },
        {
          name: 'pageChanged',
          type: 'OgeDataViewPageChangedEvent',
          description:
            'The page changed through the pager, PageUp / PageDown or <code>goToPage()</code>; the new page is announced politely.',
        },
        {
          name: 'sortChanged',
          type: 'OgeDataViewSortChangedEvent',
          description:
            'The sort changed through the built-in select or direction toggle (the page resets to 0).',
        },
        {
          name: 'selectionChanged',
          type: 'OgeDataViewSelectionChangedEvent<T>',
          description:
            'The selection changed through a click, Space / Enter, Ctrl+A or a method.',
        },
        {
          name: 'itemClick',
          type: 'OgeDataViewItemClickEvent<T>',
          description:
            'An item was clicked (or activated with Enter / Space in a listbox).',
        },
        {
          name: 'optionsChanged',
          type: 'OgeDataViewOptionsChangedEvent',
          description:
            'Sort, search or page changed — the request to answer under <code>remoteOperations</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Slots',
      entries: [
        {
          name: 'OgeDataViewItemTemplate',
          type: '[ogeDataViewItemTemplate]',
          description:
            'Structural directive rendering each item in both layouts (non-interactive in a selectable view).',
        },
        {
          name: 'OgeDataViewListItemTemplate',
          type: '[ogeDataViewListItemTemplate]',
          description:
            'Renders each item in the <code>list</code> layout; falls back to the item template.',
        },
        {
          name: 'OgeDataViewEmptyTemplate',
          type: '[ogeDataViewEmptyTemplate]',
          description:
            'Replaces the empty state; <code>$implicit</code> says whether a search or filter caused it.',
        },
        {
          name: '[ogeDataViewToolbar]',
          type: 'attribute slot',
          description:
            'Projects your own controls into the header, before the built-in search, sort and layout switch.',
        },
        {
          name: 'OgeDataViewItemTemplateContext',
          type: '{ $implicit: T; index: number; layout: OgeDataViewLayout; selected: boolean }',
          description: 'Context of the two item templates.',
        },
        {
          name: 'OgeDataViewEmptyTemplateContext',
          type: '{ $implicit: boolean; text: string }',
          description: 'Context of the empty template.',
        },
      ],
    },
    DATA_VIEW_VOCABULARY,
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'provideOgeDataViewConfig(config)',
        type: '(config: OgeDataViewConfigInput | (() => OgeDataViewConfigInput)) => Provider',
        description:
          'Application- or component-scoped defaults for <code>layout</code>, <code>pageSize</code>, <code>minItemWidth</code>, <code>locale</code> and the <code>messages</code> (a function makes it live).',
      },
      {
        name: 'OGE_DATA_VIEW_CONFIG',
        type: 'InjectionToken<OgeDataViewConfig>',
        description:
          'The token behind <code>provideOgeDataViewConfig()</code>, with <code>OGE_DEFAULT_DATA_VIEW_CONFIG</code> as its factory default.',
      },
    ],
  },
];

/** Shared with the React page: the config shapes and the catalog. */
export const DATA_VIEW_CONFIG_TYPES: ApiGroup = {
  entries: [
    {
      name: 'OgeDataViewConfig',
      type: 'interface',
      description:
        'The resolved config (<code>messages</code>, <code>layout?</code>, <code>pageSize?</code>, <code>minItemWidth?</code>, <code>locale?</code>).',
    },
    {
      name: 'OgeDataViewConfigInput',
      type: 'interface',
      description:
        'The partial input both providers accept (messages merged one level deep).',
    },
    {
      name: 'OGE_DEFAULT_DATA_VIEW_CONFIG',
      type: 'OgeDataViewConfig',
      description: 'The resolved defaults.',
    },
    {
      name: 'OgeDataViewMessages',
      type: 'interface',
      description:
        'Every user-facing string, aria labels included: <code>dataView</code>, <code>layoutSwitch</code>, <code>gridLayout</code>, <code>listLayout</code>, <code>sortBy</code>, <code>sortNone</code>, <code>ascending</code>, <code>descending</code>, <code>search</code>, <code>searchPlaceholder</code>, <code>pager</code>, <code>previousPage</code>, <code>nextPage</code>, <code>page</code> (<code>{page}</code>), <code>pageInfo</code> (<code>{from}</code> <code>{to}</code> <code>{itemCount}</code>), <code>pageAnnouncement</code>, <code>noData</code>, <code>noResults</code>, <code>results</code> (ICU plural over <code>{count}</code>) and <code>loading</code>. Translated in every <code>@oge-ui/locales</code> pack (<code>layout.dataView</code>).',
    },
    {
      name: 'OGE_DEFAULT_DATA_VIEW_MESSAGES',
      type: 'OgeDataViewMessages',
      description: 'The English catalog.',
    },
  ],
};

export const OGE_DATA_VIEW_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [DATA_VIEW_CONFIG_TYPES],
};
