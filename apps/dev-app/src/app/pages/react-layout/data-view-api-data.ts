import type { ApiGroup, ApiSections } from '../../shared/api-reference';
import {
  DATA_VIEW_CONFIG_TYPES,
  DATA_VIEW_VOCABULARY,
} from '../layout/data-view-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/data-view.tsx and the
 * shared core (packages/behavior/src/lib/layout/data-view-core.ts) — keep in
 * sync with the source TSDoc. Block order mirrors the Angular page so the
 * parity gate can diff the two block by block.
 */
export const OGE_REACT_DATA_VIEW_API: ApiSections = {
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
            'Field (dot paths allowed) or function giving each item’s key — the identity in <code>selectedKeys</code> and every callback.',
        },
        {
          name: 'displayExpr',
          type: 'OgeDataViewDisplayExpr<T>',
          description:
            'The text an item shows without <code>renderItem</code>; falls back to its <code>title</code>, <code>name</code>, <code>text</code> or <code>label</code> field.',
        },
        {
          name: 'remoteOperations',
          type: 'boolean',
          default: 'false',
          description:
            'The app sorts, searches and pages: answer <code>onOptionsChanged</code> with the page as <code>items</code> and the total as <code>itemCount</code>.',
        },
        {
          name: 'itemCount',
          type: 'number',
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
          type: 'string',
          default: 'config ?? runtime locale',
          description:
            'BCP 47 locale of the sort comparison (numeric collation, so “Item 9” sorts before “Item 10”).',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name of the items; a listbox falls back to the <code>dataView</code> message.',
        },
        {
          name: 'toolbar',
          type: 'ReactNode',
          description:
            'Your own controls in the header, before the built-in tools — the Angular <code>[ogeDataViewToolbar]</code> slot.',
        },
        {
          name: 'renderItem',
          type: '(context: OgeDataViewRenderContext<T>) => ReactNode',
          description:
            'Renders each item in both layouts — the Angular <code>[ogeDataViewItemTemplate]</code>. Non-interactive in a selectable view.',
        },
        {
          name: 'renderListItem',
          type: '(context: OgeDataViewRenderContext<T>) => ReactNode',
          description:
            'Renders each item in the <code>list</code> layout; falls back to <code>renderItem</code>.',
        },
        {
          name: 'renderEmpty',
          type: '(context: OgeDataViewEmptyContext) => ReactNode',
          description:
            'Replaces the empty state; <code>filtered</code> says whether a search or filter caused it.',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra classes on the host element.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description: 'Inline styles on the host element.',
        },
      ],
    },
    {
      title: 'Layout',
      entries: [
        {
          name: 'layout',
          type: "'grid' | 'list'",
          default: "config ?? 'grid'",
          description:
            'Responsive columns or one item per row (controlled; <code>defaultLayout</code> uncontrolled).',
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
          type: 'number',
          default: 'config ?? 240',
          description:
            'Narrowest grid cell in px before another column fits. Resolved by a container query on the view’s own inline size, never the window.',
        },
        {
          name: 'columns',
          type: 'number',
          description:
            'A fixed column count for the grid layout; collapses to one column in a container under 480px.',
        },
        {
          name: 'gap',
          type: 'number | string',
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
          type: 'number',
          default: 'config ?? 0',
          description: 'Items per page; <code>0</code> shows every item.',
        },
        {
          name: 'pageIndex',
          type: 'number',
          default: '0',
          description:
            '0-based current page (controlled; <code>defaultPageIndex</code> uncontrolled), clamped into the page range when rendered.',
        },
        {
          name: 'showPager',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the built-in pager when there is more than one page. Set it to <code>false</code> and drive an <code>&lt;OgePagination&gt;</code> with <code>pageIndex</code> for the full bar.',
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
          type: 'OgeDataViewSort | null',
          default: 'null',
          description:
            'The active sort (controlled; <code>defaultSort</code> uncontrolled). Text compares with the locale’s collator, numbers / dates / booleans numerically, empty values last.',
        },
        {
          name: 'filter',
          type: '((item: T) => boolean) | null',
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
          type: 'string',
          default: "''",
          description:
            'The search text (controlled; <code>defaultSearchValue</code> uncontrolled). Every word must occur, compared case-, accent- and locale-insensitively.',
        },
        {
          name: 'searchExpr',
          type: 'OgeDataViewSearchExpr<T>',
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
            'Selection turns the list into an APG listbox: one roving tab stop, arrows in reading order (mirrored in RTL), Up / Down by the measured column count, PageUp / PageDown turn the page, Space / Enter toggle, Ctrl+A selects all. Options are leaves, so <code>renderItem</code> must not render controls.',
        },
        {
          name: 'selectedKeys',
          type: 'readonly OgeDataViewKey[]',
          default: '[]',
          description:
            'Keys of the selected items (controlled; <code>defaultSelectedKeys</code> uncontrolled).',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeDataViewHandle)',
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
            'Shows page <code>index</code> (clamped) and calls <code>onPageChanged</code> when it changed.',
        },
        {
          name: 'setLayout(layout)',
          type: '(layout: OgeDataViewLayout) => void',
          description:
            'Switches the layout and calls <code>onLayoutChanged</code> when it changed.',
        },
        {
          name: 'clearSelection()',
          type: '() => void',
          description: 'Deselects everything.',
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
          name: 'onLayoutChange',
          type: '(layout: OgeDataViewLayout) => void',
          description: 'The controlled half of <code>layout</code>.',
        },
        {
          name: 'onPageIndexChange',
          type: '(pageIndex: number) => void',
          description: 'The controlled half of <code>pageIndex</code>.',
        },
        {
          name: 'onSortChange',
          type: '(sort: OgeDataViewSort | null) => void',
          description: 'The controlled half of <code>sort</code>.',
        },
        {
          name: 'onSearchValueChange',
          type: '(value: string) => void',
          description: 'The controlled half of <code>searchValue</code>.',
        },
        {
          name: 'onSelectedKeysChange',
          type: '(keys: OgeDataViewKey[]) => void',
          description: 'The controlled half of <code>selectedKeys</code>.',
        },
        {
          name: 'onLayoutChanged',
          type: '(event: OgeDataViewLayoutChangedEvent) => void',
          description:
            'The layout changed through the switch or <code>setLayout()</code>.',
        },
        {
          name: 'onPageChanged',
          type: '(event: OgeDataViewPageChangedEvent) => void',
          description:
            'The page changed through the pager, PageUp / PageDown or <code>goToPage()</code>; the new page is announced politely.',
        },
        {
          name: 'onSortChanged',
          type: '(event: OgeDataViewSortChangedEvent) => void',
          description:
            'The sort changed through the built-in select or direction toggle (the page resets to 0).',
        },
        {
          name: 'onSelectionChanged',
          type: '(event: OgeDataViewSelectionChangedEvent<T>) => void',
          description:
            'The selection changed through a click, Space / Enter, Ctrl+A or a handle method.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeDataViewItemClickEvent<T>) => void',
          description:
            'An item was clicked (or activated with Enter / Space in a listbox).',
        },
        {
          name: 'onOptionsChanged',
          type: '(event: OgeDataViewOptionsChangedEvent) => void',
          description:
            'Sort, search or page changed — the request to answer under <code>remoteOperations</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Component types',
      entries: [
        {
          name: 'OgeDataViewProps',
          type: 'interface',
          description:
            'Props of <code>&lt;OgeDataView&gt;</code> (generic over the item type).',
        },
        {
          name: 'OgeDataViewHandle',
          type: '{ focus; goToPage; setLayout; clearSelection; selectAll }',
          description: 'The ref handle.',
        },
        {
          name: 'OgeDataViewRenderContext',
          type: '{ item: T; index: number; layout: OgeDataViewLayout; selected: boolean }',
          description:
            'Context of <code>renderItem</code> / <code>renderListItem</code>.',
        },
        {
          name: 'OgeDataViewEmptyContext',
          type: '{ filtered: boolean; text: string }',
          description: 'Context of <code>renderEmpty</code>.',
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
        name: 'OgeDataViewConfigProvider',
        type: '(props: { config?: OgeDataViewConfigInput; children?: ReactNode }) =&gt; JSX.Element',
        description:
          'Subtree defaults for <code>layout</code>, <code>pageSize</code>, <code>minItemWidth</code>, <code>locale</code> and the <code>messages</code> — the React counterpart of <code>provideOgeDataViewConfig()</code>.',
      },
      {
        name: 'useOgeDataViewConfig()',
        type: '() =&gt; OgeDataViewConfig',
        description:
          'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_DATA_VIEW_CONFIG</code>.',
      },
    ],
  },
];

export const OGE_REACT_DATA_VIEW_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [DATA_VIEW_CONFIG_TYPES],
};
