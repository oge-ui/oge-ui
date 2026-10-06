import type {
  ApiEntry,
  ApiGroup,
  ApiSections,
} from '../../shared/api-reference';
import {
  OGE_LIST_VIEW_API,
  OGE_LIST_VIEW_CONFIG_API,
} from '../layout/list-view-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/list-view.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/list-view-api-data.ts`: the same props
 * (their descriptions are reused verbatim where the behaviour is identical),
 * controlled / uncontrolled pairs for the two Angular models, `onX`
 * callbacks for the outputs, `renderX` render props for the four template
 * slots and the methods on the ref handle.
 */
const angularProps = new Map<string, ApiEntry>(
  (OGE_LIST_VIEW_API.properties ?? [])
    .flatMap((group) => group.entries)
    .map((entry) => [entry.name, entry]),
);

/** An Angular property row, reused for the identical React prop. */
const same = (name: string, override: Partial<ApiEntry> = {}): ApiEntry => {
  const entry = angularProps.get(name);
  if (!entry) throw new Error(`list view API: no Angular row "${name}"`);
  return { ...entry, ...override };
};

export const OGE_REACT_LIST_VIEW_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        same('items', {
          description:
            'The items, in order. The component is generic: <code>T</code> is inferred from the prop in JSX, so render props and callbacks are typed.',
        }),
        same('keyExpr'),
        same('displayExpr'),
        same('disabledExpr'),
        same('groupExpr'),
      ],
    },
    {
      title: 'Selection',
      entries: [
        same('selectionMode'),
        same('selectedKeys', {
          type: 'readonly OgeListViewKey[]',
          description:
            'Keys of the selected items — controlled (pair with <code>onSelectedKeysChange</code>; <code>defaultSelectedKeys</code> for uncontrolled). Space toggles, Enter selects (single), Shift+arrows / Shift+Space / Shift+click extend a range, Ctrl+Shift+Home/End select to an edge, Ctrl+A selects all (or none).',
        }),
        same('showSelectionControls'),
        same('disabled'),
      ],
    },
    {
      title: 'Scrolling & paging',
      entries: [
        same('height'),
        same('virtualScroll'),
        same('pageLoadMode', {
          description:
            '<code>button</code> renders a Load more button under the list, <code>scroll</code> calls <code>onLoadMoreRequested</code> when the viewport nears the end (once per page — also when a first page does not fill the viewport). The arrival of the next items is announced politely.',
        }),
        same('hasMore'),
        same('loading'),
      ],
    },
    {
      title: 'Search, actions & labels',
      entries: [
        same('searchEnabled'),
        same('searchExpr'),
        same('searchMode'),
        same('searchValue', {
          type: 'string',
          description:
            'The search text — controlled (pair with <code>onSearchValueChange</code>; <code>defaultSearchValue</code> for uncontrolled).',
        }),
        same('itemActions'),
        same('ariaLabel'),
        same('locale', {
          default: 'config ?? runtime default',
        }),
      ],
    },
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderItem',
          type: '(context: OgeListViewItemRenderContext<T>) => ReactNode',
          description:
            'Replaces each row&rsquo;s content — the Angular <code>[ogeListViewItemTemplate]</code>. Context: <code>item</code>, <code>index</code>, <code>key</code>, <code>selected</code>, <code>active</code>, <code>disabled</code>, <code>group</code>. Keep it non-interactive.',
        },
        {
          name: 'renderGroup',
          type: '(context: { group: string; count: number }) => ReactNode',
          description:
            'Replaces each sticky header&rsquo;s text — the Angular <code>[ogeListViewGroupTemplate]</code>.',
        },
        {
          name: 'renderEmpty',
          type: '(context: { searching: boolean; searchValue: string }) => ReactNode',
          description:
            'Replaces the empty state — the Angular <code>[ogeListViewEmptyTemplate]</code>.',
        },
        {
          name: 'renderFooter',
          type: '(context: { loadMore; loading; hasMore; itemCount }) => ReactNode',
          description:
            'Content under the list; replaces the Load more button — the Angular <code>[ogeListViewFooterTemplate]</code>.',
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
  ],
  methods: [
    {
      title: 'Ref handle (OgeListViewHandle)',
      entries: (OGE_LIST_VIEW_API.methods ?? []).flatMap((g) =>
        g.entries.map((entry) =>
          entry.name === 'clearSelection()'
            ? { ...entry, description: 'Clears the selection.' }
            : entry,
        ),
      ),
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onSelectedKeysChange',
          type: '(keys: OgeListViewKey[]) => void',
          description:
            'The committed selection — the controlled half of <code>selectedKeys</code>.',
        },
        {
          name: 'onSearchValueChange',
          type: '(value: string) => void',
          description:
            'The typed search text — the controlled half of <code>searchValue</code>.',
        },
        {
          name: 'onSelectionChanged',
          type: '(event: OgeListViewSelectionChangedEvent<T>) => void',
          description:
            'The selection changed through a click, a key, a range, Ctrl+A or a handle method — with the previous, added and removed keys, the item and the originating event.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeListViewItemClickEvent<T>) => void',
          description: 'An item was clicked or activated with Enter.',
        },
        {
          name: 'onItemActionClick',
          type: '(event: OgeListViewItemActionClickEvent<T>) => void',
          description:
            'An item action ran — by tap, click or its keyboard shortcut (one callback for all three).',
        },
        {
          name: 'onLoadMoreRequested',
          type: '(event: OgeListViewLoadMoreEvent) => void',
          description:
            'The list asks for more items: <code>reason</code> <code>button</code> or <code>scroll</code>, and the <code>itemCount</code> held now.',
        },
        {
          name: 'onActiveItemChanged',
          type: '(event: OgeListViewActiveItemChangedEvent<T>) => void',
          description: 'The active (keyboard) item moved.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Component types',
      entries: [
        {
          name: 'OgeListViewProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeListView&gt;</code>.',
        },
        {
          name: 'OgeListViewHandle',
          type: '{ focus; scrollToItem; clearSelection; selectAll; clearSearch }',
          description: 'The ref handle.',
        },
        {
          name: 'OgeListViewItemRenderContext / OgeListViewGroupRenderContext / OgeListViewEmptyRenderContext / OgeListViewFooterRenderContext',
          type: 'interface',
          description: 'Contexts of the four render props.',
        },
      ],
    },
    ...(OGE_LIST_VIEW_API.types ?? []).filter((g) => g.title === 'Vocabulary'),
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeListViewConfigProvider',
        type: '(props: { config?: OgeListViewConfigInput; children?: ReactNode }) =&gt; JSX.Element',
        description:
          'Subtree defaults for <code>selectionMode</code>, <code>searchMode</code>, <code>showSelectionControls</code>, <code>pageLoadMode</code>, <code>locale</code> and the <code>messages</code> — the React counterpart of <code>provideOgeListViewConfig()</code>. Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.listView</code>, wired by <code>&lt;OgeLocaleProvider&gt;</code>).',
      },
      {
        name: 'useOgeListViewConfig()',
        type: '() =&gt; OgeListViewConfig',
        description:
          'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_LIST_VIEW_CONFIG</code>.',
      },
    ],
  },
];

export const OGE_REACT_LIST_VIEW_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: OGE_LIST_VIEW_CONFIG_API.types,
};
