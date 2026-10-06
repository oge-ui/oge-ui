import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/list-view/src/** and
 * packages/behavior/src/lib/layout/list-view-core.ts — keep in sync with the
 * source TSDoc when the public API changes.
 */

const EXPR = 'string | ((item: T) => unknown)';

export const OGE_LIST_VIEW_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'items',
          type: 'readonly T[]',
          default: '[]',
          description:
            'The items, in order. The component is generic: <code>T</code> is inferred from the binding, so templates and event payloads are typed.',
        },
        {
          name: 'keyExpr',
          type: EXPR,
          default: "'id'",
          description:
            'Field (or function) giving each item&rsquo;s key — the identity in <code>selectedKeys</code> and every event. Primitive items are their own key.',
        },
        {
          name: 'displayExpr',
          type: `${EXPR} | undefined`,
          description:
            'Field (or function) giving the text of the default row, the search and type-ahead.',
        },
        {
          name: 'disabledExpr',
          type: `${EXPR} | undefined`,
          description:
            'Field (or function) marking an item disabled: it stays visible with <code>aria-disabled</code>, the keyboard skips it and it never selects.',
        },
        {
          name: 'groupExpr',
          type: `${EXPR} | undefined`,
          description:
            'Field (or function) grouping the items (first-appearance order) under sticky headers. Each group is a labelled segment: <code>role="group"</code> with <code>aria-label</code> in a listbox, a <code>listitem</code> holding a labelled nested <code>list</code> otherwise; the visible header is <code>aria-hidden</code>.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'selectionMode',
          type: "'none' | 'single' | 'multiple'",
          default: "config ?? 'none'",
          description:
            '<code>none</code> renders a <code>role="list"</code> with a roving tab stop; <code>single</code> / <code>multiple</code> an APG listbox whose viewport tracks the active option with <code>aria-activedescendant</code> (<code>aria-multiselectable</code> for multiple).',
        },
        {
          name: 'selectedKeys',
          type: 'readonly OgeListViewKey[] (model)',
          default: '[]',
          description:
            'Keys of the selected items — two-way. Space toggles, Enter selects (single), Shift+arrows / Shift+Space / Shift+click extend a range, Ctrl+Shift+Home/End select to an edge, Ctrl+A selects all (or none).',
        },
        {
          name: 'showSelectionControls',
          type: 'boolean | undefined',
          default: 'config ?? false',
          description:
            'Draws an <code>aria-hidden</code> check (multiple) or radio (single) glyph in every row; the state itself is <code>aria-selected</code>.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disables the whole list: nothing selects or activates, the search field is disabled, the viewport leaves the Tab order.',
        },
      ],
    },
    {
      title: 'Scrolling & paging',
      entries: [
        {
          name: 'height',
          type: 'number | string | undefined',
          description:
            'Height of the scroll viewport — a number is px, a string any CSS length. A virtualized list without one uses 320px.',
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeListViewVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed rendering with fixed row heights (<code>{ itemHeight: 44, groupHeaderHeight: 32, overscan: 6 }</code>) on core&rsquo;s offset tree. Keyboard navigation scrolls the active option into the window first; the header of a group the window starts inside stays pinned.',
        },
        {
          name: 'pageLoadMode',
          type: "'none' | 'button' | 'scroll'",
          default: "config ?? 'none'",
          description:
            '<code>button</code> renders a Load more button under the list, <code>scroll</code> emits <code>loadMoreRequested</code> when the viewport nears the end (once per page — also when a first page does not fill the viewport). The arrival of the next items is announced politely.',
        },
        {
          name: 'hasMore',
          type: 'boolean',
          default: 'false',
          description:
            'Whether more items can be requested; nothing is requested without it.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description:
            'Shows the loading row under the list, sets <code>aria-busy</code> and holds further requests.',
        },
      ],
    },
    {
      title: 'Search, actions & labels',
      entries: [
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'Renders a labelled search field (with a clear button) above the list; ArrowDown moves into the list, Escape clears. Matching is locale- and accent-insensitive and the result count is announced.',
        },
        {
          name: 'searchExpr',
          type: 'OgeListViewSearchExpr<T> | undefined',
          description:
            'Field(s) the search matches — one expression or an array; default the display text.',
        },
        {
          name: 'searchMode',
          type: "'contains' | 'startsWith'",
          default: "config ?? 'contains'",
          description: 'How the search text matches.',
        },
        {
          name: 'searchValue',
          type: 'string (model)',
          default: "''",
          description: 'The search text — two-way.',
        },
        {
          name: 'itemActions',
          type: 'readonly OgeListViewItemAction[]',
          default: '[]',
          description:
            'Per-item actions, revealed by a horizontal swipe on touch (mirrored in RTL) and on hover / focus with a mouse. They are <code>aria-hidden</code> glyphs inside the row (an option cannot hold buttons); the keyboard twin is each action&rsquo;s <code>shortcut</code>, listed in <code>aria-keyshortcuts</code> and in a shared description.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          default: 'messages.listLabel',
          description: 'Accessible name of the list / listbox.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          default: 'config ?? LOCALE_ID',
          description: 'BCP 47 locale of the announced counts (ICU plurals).',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus()',
          type: '() => void',
          description:
            'Moves focus into the list — the listbox viewport, or the active item of a plain list — and scrolls the active item into view.',
        },
        {
          name: 'scrollToItem(key)',
          type: '(key: OgeListViewKey) => void',
          description:
            'Scrolls the item with <code>key</code> into view and makes it the active one.',
        },
        {
          name: 'clearSelection()',
          type: '() => void',
          description:
            'Clears the selection (emits <code>selectionChanged</code>).',
        },
        {
          name: 'selectAll()',
          type: '() => void',
          description:
            'Selects every enabled item of a multiple-selection list and announces the count.',
        },
        {
          name: 'clearSearch()',
          type: '() => void',
          description: 'Empties the search field.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'selectedKeysChange',
          type: 'readonly OgeListViewKey[]',
          description: 'The banana half of <code>[(selectedKeys)]</code>.',
        },
        {
          name: 'searchValueChange',
          type: 'string',
          description: 'The banana half of <code>[(searchValue)]</code>.',
        },
        {
          name: 'selectionChanged',
          type: 'OgeListViewSelectionChangedEvent<T>',
          description:
            'The selection changed through a click, a key, a range, Ctrl+A or a method — with the previous, added and removed keys, the item and the originating event.',
        },
        {
          name: 'itemClick',
          type: 'OgeListViewItemClickEvent<T>',
          description: 'An item was clicked or activated with Enter.',
        },
        {
          name: 'itemActionClick',
          type: 'OgeListViewItemActionClickEvent<T>',
          description:
            'An item action ran — by tap, click or its keyboard shortcut (one event for all three).',
        },
        {
          name: 'loadMoreRequested',
          type: 'OgeListViewLoadMoreEvent',
          description:
            'The list asks for more items: <code>reason</code> <code>button</code> or <code>scroll</code>, and the <code>itemCount</code> held now (the next page&rsquo;s offset).',
        },
        {
          name: 'activeItemChanged',
          type: 'OgeListViewActiveItemChangedEvent<T>',
          description: 'The active (keyboard) item moved.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Template slots',
      entries: [
        {
          name: 'OgeListViewItemTemplate',
          type: '[ogeListViewItemTemplate]',
          description:
            'Replaces each row&rsquo;s content. Context <code>OgeListViewItemTemplateContext</code>: <code>$implicit</code> item, <code>index</code>, <code>key</code>, <code>selected</code>, <code>active</code>, <code>disabled</code>, <code>group</code>. Keep it non-interactive — an option cannot hold controls.',
        },
        {
          name: 'OgeListViewGroupTemplate',
          type: '[ogeListViewGroupTemplate]',
          description:
            'Replaces each sticky header&rsquo;s text. Context <code>OgeListViewGroupTemplateContext</code>: <code>$implicit</code> group label, <code>count</code>.',
        },
        {
          name: 'OgeListViewEmptyTemplate',
          type: '[ogeListViewEmptyTemplate]',
          description:
            'Replaces the empty state. Context <code>OgeListViewEmptyTemplateContext</code>: <code>$implicit</code> searching, <code>searchValue</code>.',
        },
        {
          name: 'OgeListViewFooterTemplate',
          type: '[ogeListViewFooterTemplate]',
          description:
            'Content under the list; replaces the Load more button. Context <code>OgeListViewFooterTemplateContext</code>: <code>$implicit</code> loadMore function, <code>loading</code>, <code>hasMore</code>, <code>itemCount</code>.',
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeListViewKey',
          type: 'string | number',
          description: 'Identity of an item.',
        },
        {
          name: 'OgeListViewExpr / OgeListViewSearchExpr',
          type: `${EXPR} / one or an array`,
          description: 'Field names or reader functions.',
        },
        {
          name: 'OgeListViewSelectionMode',
          type: "'none' | 'single' | 'multiple'",
          description: 'Selection union.',
        },
        {
          name: 'OgeListViewPageLoadMode / OgeListViewSearchMode',
          type: "'none' | 'button' | 'scroll' / 'contains' | 'startsWith'",
          description: 'Paging and search unions.',
        },
        {
          name: 'OgeListViewItemAction',
          type: "{ key; label; icon?; severity?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; shortcut? }",
          description:
            'A swipe / hover action; <code>icon</code> is SVG path data, <code>shortcut</code> an <code>aria-keyshortcuts</code> value (<code>Delete</code>, <code>Shift+A</code>).',
        },
        {
          name: 'OgeListViewVirtualScrollOptions',
          type: '{ itemHeight?; groupHeaderHeight?; overscan? }',
          description: 'Options form of <code>virtualScroll</code>.',
        },
        {
          name: 'OgeListViewSelectionChangedEvent',
          type: '{ selectedKeys; previousKeys; addedKeys; removedKeys; item?; event? }',
          description: 'Payload of <code>selectionChanged</code>.',
        },
        {
          name: 'OgeListViewItemClickEvent / OgeListViewActiveItemChangedEvent',
          type: '{ item; key; index; event? }',
          description:
            'Payloads of <code>itemClick</code> / <code>activeItemChanged</code>.',
        },
        {
          name: 'OgeListViewItemActionClickEvent',
          type: '{ action; item; key; index; event? }',
          description: 'Payload of <code>itemActionClick</code>.',
        },
        {
          name: 'OgeListViewLoadMoreEvent',
          type: "{ reason: 'button' | 'scroll'; itemCount }",
          description: 'Payload of <code>loadMoreRequested</code>.',
        },
        {
          name: 'OgeListViewActionSeverity',
          type: "'neutral' | 'accent' | 'success' | 'warning' | 'danger'",
          description: 'Colour of an action.',
        },
      ],
    },
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'provideOgeListViewConfig(config)',
        type: '(config: OgeListViewConfigInput | (() => OgeListViewConfigInput)) => Provider',
        description:
          'Application- or component-scoped defaults for <code>selectionMode</code>, <code>searchMode</code>, <code>showSelectionControls</code>, <code>pageLoadMode</code>, <code>locale</code> and the <code>messages</code> (a function makes it live). Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.listView</code>).',
      },
      {
        name: 'OGE_LIST_VIEW_CONFIG',
        type: 'InjectionToken<OgeListViewConfig>',
        description:
          'The token behind <code>provideOgeListViewConfig()</code>, with <code>OGE_DEFAULT_LIST_VIEW_CONFIG</code> as its factory default.',
      },
    ],
  },
];

export const OGE_LIST_VIEW_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [
    {
      entries: [
        {
          name: 'OgeListViewMessages',
          type: 'interface',
          description:
            'Every user-facing string: <code>listLabel</code>, <code>searchLabel</code>, <code>searchPlaceholder</code>, <code>clearSearch</code>, <code>loadMore</code>, <code>loading</code>, <code>noData</code>, <code>noResults</code>, the ICU plurals <code>resultsCount</code> / <code>loadedCount</code> / <code>selectedCount</code> over <code>{count}</code>, and <code>itemActions</code> (<code>{actions}</code>). <code>OGE_DEFAULT_LIST_VIEW_MESSAGES</code> is the English catalog.',
        },
        {
          name: 'OgeListViewConfig / OgeListViewConfigInput',
          type: 'interface',
          description:
            'The config shape and its partial input; <code>OGE_DEFAULT_LIST_VIEW_CONFIG</code> is the resolved default.',
        },
      ],
    },
  ],
};
