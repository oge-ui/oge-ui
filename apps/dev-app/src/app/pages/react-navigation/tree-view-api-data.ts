import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/navigation/src/lib/tree-view.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../navigation/tree-view-api-data.ts` (the parity
 * gate diffs the two member by member): the same groups in the same order, the
 * Angular two-way models as controlled prop pairs, the public methods on the
 * imperative handle, the outputs as `on*` callbacks and the template slots as
 * render props.
 */
export const OGE_REACT_TREE_VIEW_API: ApiSections = {
  properties: [
    {
      title: 'Data & accessors',
      entries: [
        {
          name: 'items',
          type: 'readonly T[] | undefined',
          description:
            'Nodes to display — a flat parent-referencing list or nested children.',
        },
        {
          name: 'keyExpr',
          type: 'string | ((row: T) => RowKey)',
          default: "'id'",
          description: "Field holding a node's stable key.",
        },
        {
          name: 'parentIdExpr',
          type: 'string | ((row: T) => unknown)',
          default: "'parentId'",
          description: "Field holding a node's parent key (flat data).",
        },
        {
          name: 'itemsExpr',
          type: 'string | ((row: T) => readonly T[]) | undefined',
          description:
            'Field holding nested children. Setting it switches the tree to hierarchical data.',
        },
        {
          name: 'displayExpr',
          type: 'string | ((row: T) => unknown)',
          default: "'text'",
          description: 'Field holding the display text.',
        },
        {
          name: 'disabledExpr',
          type: 'string | ((row: T) => unknown)',
          default: "'disabled'",
          description: 'Field marking a node disabled.',
        },
        {
          name: 'hasItemsExpr',
          type: 'string | ((row: T) => unknown)',
          default: "'hasItems'",
          description:
            'Field hinting that a node has children that are not loaded yet — only consulted with a <code>loadChildren</code>.',
        },
        {
          name: 'iconExpr',
          type: 'string | ((row: T) => unknown) | undefined',
          description:
            'Field holding SVG path data (<code>d</code>) for a per-node icon.',
        },
        {
          name: 'rootValue',
          type: 'unknown',
          description:
            'Parent value that marks root nodes in flat data. <code>undefined</code>/<code>null</code> treats both as root.',
        },
        {
          name: 'dataStructure',
          type: "'plain' | 'tree' | undefined",
          description:
            'Explicit data shape; inferred from <code>itemsExpr</code> when unset.',
        },
      ],
    },
    {
      title: 'State (controlled pairs)',
      entries: [
        {
          name: 'expandedKeys / defaultExpandedKeys / onExpandedKeysChange',
          type: 'readonly RowKey[]',
          default: '[]',
          description:
            'Keys of the expanded nodes. Pass <code>expandedKeys</code> to control the tree, <code>defaultExpandedKeys</code> to seed it and let the tree own the state — the React face of Angular&rsquo;s <code>[(expandedKeys)]</code> model.',
        },
        {
          name: 'selectedKeys / defaultSelectedKeys / onSelectedKeysChange',
          type: 'readonly RowKey[]',
          default: '[]',
          description:
            'Keys of the selected nodes, projected by <code>selectedKeysMode</code> on the way out.',
        },
        {
          name: 'focusedKey / defaultFocusedKey / onFocusedKeyChange',
          type: 'RowKey | undefined',
          description: 'Key of the node holding the roving tabindex.',
        },
        {
          name: 'searchValue / defaultSearchValue / onSearchValueChange',
          type: 'string',
          default: "''",
          description: 'Current search text.',
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
          description: 'How nodes may be selected.',
        },
        {
          name: 'selectByClick',
          type: 'boolean | undefined',
          description:
            'Selects a node when its row is clicked. <code>undefined</code> resolves to <code>true</code> without checkboxes and <code>false</code> with them, so clicking a label never silently ticks the box beside it.',
        },
        {
          name: 'selectNodesRecursive',
          type: 'boolean',
          default: 'true',
          description:
            'Cascades selection down to descendants and up to fully-selected parents (the tri-state model).',
        },
        {
          name: 'showCheckBoxes',
          type: "'none' | 'normal' | 'selectAll'",
          default: "'none'",
          description:
            'Checkbox column: hidden, per node, or per node plus a "select all" row.',
        },
        {
          name: 'selectedKeysMode',
          type: "'all' | 'leavesOnly' | 'excludeRecursive'",
          default: "'all'",
          description:
            'Projection applied to <code>selectedKeys</code>: everything, only childless nodes, or the top-most roots of fully-selected subtrees.',
        },
      ],
    },
    {
      title: 'Expansion',
      entries: [
        {
          name: 'expandEvent',
          type: "'click' | 'dblclick'",
          default: "'click'",
          description:
            'Which gesture expands a node. The chevron always expands regardless.',
        },
        {
          name: 'expandNodesRecursive',
          type: 'boolean',
          default: 'true',
          description: 'Expanding a node also expands its ancestors.',
        },
        {
          name: 'allowExpandAll',
          type: 'boolean',
          default: 'true',
          description:
            'Enables the APG <code>*</code> shortcut, which expands every sibling at the focused level.',
        },
      ],
    },
    {
      title: 'Search',
      entries: [
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'false',
          description: 'Renders the built-in search box above the tree.',
        },
        {
          name: 'searchMode',
          type: "'contains' | 'startsWith' | 'equals'",
          default: "'contains'",
          description:
            'How the text is compared. Matching is accent- and locale-insensitive.',
        },
        {
          name: 'searchExpr',
          type: 'string | ((row: T) => unknown) | array | undefined',
          description:
            'Fields searched instead of <code>displayExpr</code>; an array searches several.',
        },
        {
          name: 'searchTimeout',
          type: 'number',
          default: '0',
          description: 'Debounce applied to the search box, in milliseconds.',
        },
        {
          name: 'filterMode',
          type: "'matchOnly' | 'withAncestors' | 'fullBranch'",
          default: "'withAncestors'",
          description:
            "Which relatives of a match stay visible. <code>fullBranch</code> also keeps a match's descendants.",
        },
        {
          name: 'expandNodesOnFiltering',
          type: 'boolean',
          default: 'true',
          description: 'Auto-expands the ancestors of matches.',
        },
        {
          name: 'highlightSearchResults',
          type: 'boolean',
          default: 'true',
          description:
            'Wraps matches in <code>&lt;mark class="oge-highlight"&gt;</code>.',
        },
      ],
    },
    {
      title: 'Lazy loading, virtualization & drag',
      entries: [
        {
          name: 'loadChildren',
          type: '(parent: T, key: RowKey) => Promise&lt;readonly T[]&gt;',
          description:
            "Loads a node's children the first time it expands; a placeholder row shows meanwhile. Single-flight per node, and fetched children join the index so cascades reach them.",
        },
        {
          name: 'virtualScroll',
          type: 'boolean | { itemHeight: number }',
          default: 'false',
          description:
            'Windowed rendering for large trees. Every row must actually be <code>itemHeight</code> tall (30px by default).',
        },
        {
          name: 'height',
          type: 'string | undefined',
          description:
            'Height of the scroll container (any CSS length) — required for virtual scrolling to have a viewport.',
        },
        {
          name: 'allowDragging',
          type: 'boolean',
          default: 'false',
          description: 'Enables pointer drag reordering.',
        },
        {
          name: 'allowDropInside',
          type: 'boolean',
          default: 'true',
          description:
            'Allows dropping *into* a node (reparenting), not just between siblings.',
        },
      ],
    },
    {
      title: 'Presentation',
      entries: [
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the whole component.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Density of the node rows.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Aria label of the tree.',
        },
        {
          name: 'treeId',
          type: 'string | undefined',
          description:
            'DOM id put on the inner <code>role="tree"</code> element — set it when an outside control (a combobox owning this tree as its popup) must point <code>aria-controls</code> at the list rather than the host.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeTreeViewMessages&gt;',
          default: '{}',
          description: 'Per-instance overrides of the config strings.',
        },
        {
          name: 'className / style',
          type: 'string | CSSProperties',
          description:
            'Merged onto the tree host. <code>className</code> is appended to the generated <code>oge-tree-view*</code> classes; the Angular host takes <code>class</code>/<code>style</code> natively.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgeTreeViewHandle (via ref)',
      entries: [
        {
          name: 'expand(key)',
          type: '(key: RowKey) => Promise&lt;boolean&gt;',
          description:
            'Expands a node, awaiting the lazy child fetch when there is one. Resolves <code>false</code> if the node is unknown or <code>onItemExpanding</code> vetoed it.',
        },
        {
          name: 'collapse(key)',
          type: '(key: RowKey) => Promise&lt;boolean&gt;',
          description:
            'Collapses a node; resolves whether it actually collapsed.',
        },
        {
          name: 'toggle(key)',
          type: '(key: RowKey) => Promise&lt;boolean&gt;',
          description: 'Expands the node if collapsed, collapses it otherwise.',
        },
        {
          name: 'expandAll()',
          type: '() => void',
          description: 'Expands every node that has loaded children.',
        },
        {
          name: 'collapseAll()',
          type: '() => void',
          description: 'Collapses every node.',
        },
        {
          name: 'selectAll()',
          type: '() => void',
          description: 'Selects every node.',
        },
        {
          name: 'unselectAll()',
          type: '() => void',
          description: 'Clears the selection.',
        },
        {
          name: 'select(key) / unselect(key)',
          type: '(key: RowKey) => void',
          description:
            'Selects or deselects one node, cascading when <code>selectNodesRecursive</code> is on.',
        },
        {
          name: 'isExpanded(key) / isSelected(key)',
          type: '(key: RowKey) => boolean',
          description: 'Current state of one node.',
        },
        {
          name: 'getSelectedKeys(mode?)',
          type: '(mode?: OgeTreeSelectedKeysMode) => RowKey[]',
          description:
            'Selected keys under a projection, defaulting to <code>selectedKeysMode</code>.',
        },
        {
          name: 'focus(key?)',
          type: '(key?: RowKey) => void',
          description: "Focuses a node's row, or the first enabled one.",
        },
        {
          name: 'scrollToItem(key)',
          type: '(key: RowKey) => void',
          description:
            'Scrolls a node into view, using offset math when virtualized.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onItemExpanding / onItemCollapsing',
          type: '(event: OgeTreeExpandingEvent&lt;T&gt;) => void / (event: OgeTreeCollapsingEvent&lt;T&gt;) => void',
          description:
            'Cancelable pre-events — set <code>event.cancel = true</code> to block the change.',
        },
        {
          name: 'onItemExpanded / onItemCollapsed',
          type: '(event: OgeTreeExpandedEvent&lt;T&gt;) => void / (event: OgeTreeCollapsedEvent&lt;T&gt;) => void',
          description: 'Called after the change committed.',
        },
        {
          name: 'onSelectionChanging',
          type: '(event: OgeTreeSelectionChangingEvent&lt;T&gt;) => void',
          description:
            'Cancelable pre-event carrying the keys the selection would become.',
        },
        {
          name: 'onSelectionChanged',
          type: '(event: OgeTreeSelectionChangedEvent&lt;T&gt;) => void',
          description:
            'Called after the selection committed, with <code>previousKeys</code>.',
        },
        {
          name: 'onItemSelectionChanged',
          type: '(event: OgeTreeItemSelectionChangedEvent&lt;T&gt;) => void',
          description: 'Called for the single node whose own state flipped.',
        },
        {
          name: 'onItemClick / onItemDblClick',
          type: '(event: OgeTreeItemClickEvent&lt;T&gt;) => void',
          description: 'Called when a node row is clicked or double-clicked.',
        },
        {
          name: 'onChildrenLoaded / onChildrenLoadFailed',
          type: '(event: OgeTreeChildrenLoadedEvent&lt;T&gt;) => void / (event: OgeTreeChildrenFailedEvent&lt;T&gt;) => void',
          description:
            'Called after a lazy <code>loadChildren</code> settled; the failure carries the original error.',
        },
        {
          name: 'onSelectAllChanged',
          type: '(event: OgeTreeSelectAllChangedEvent) => void',
          description: 'Called when the "select all" row is toggled.',
        },
        {
          name: 'onItemReordering / onItemReordered',
          type: '(event: OgeTreeReorderingEvent&lt;T&gt;) => void / (event: OgeTreeReorderedEvent&lt;T&gt;) => void',
          description:
            "Cancelable pre-event and result of a drag & drop reparent, carrying <code>position: 'inside' | 'before' | 'after'</code>. The tree does not mutate your data.",
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderItem',
          type: '(context: { item, key, level, expanded, selected, checkState, hasChildren, highlightedHtml }) => ReactNode',
          description:
            'Replaces a node\'s built-in label — the React face of <code>[ogeTreeItemTemplate]</code>. Renders inside <code>role="treeitem"</code>, so it must not contain focusable controls.',
        },
        {
          name: 'renderExpandIcon',
          type: '(context: { expanded: boolean, item, key, loading }) => ReactNode',
          description: 'Replaces the expand/collapse chevron.',
        },
        {
          name: 'renderNoData',
          type: '() => ReactNode',
          description:
            'Replaces the empty state shown when the tree has no nodes or a search matched nothing.',
        },
      ],
    },
    {
      title: 'Keyboard (WAI-ARIA APG treeview)',
      entries: [
        {
          name: 'Down / Up Arrow',
          type: 'navigation',
          description:
            'Moves focus over the visible nodes, skipping disabled ones. Trees do not wrap at the ends.',
        },
        {
          name: 'Right Arrow',
          type: 'navigation',
          description:
            'Opens a collapsed parent; on an open parent moves to its first child; no-op on a leaf.',
        },
        {
          name: 'Left Arrow',
          type: 'navigation',
          description:
            'Closes an open parent; otherwise moves focus to the parent node.',
        },
        {
          name: 'Home / End',
          type: 'navigation',
          description: 'Moves to the first / last visible node.',
        },
        {
          name: 'Enter',
          type: 'activation',
          description:
            'Toggles a parent, or selects a leaf when a selection mode is set.',
        },
        {
          name: 'Space',
          type: 'selection',
          description:
            'Toggles selection on the focused node. <code>Shift+Space</code> selects the contiguous range.',
        },
        {
          name: 'Printable characters',
          type: 'type-ahead',
          description:
            'Moves focus to the next node whose label starts with the typed prefix, accent-insensitively.',
        },
        {
          name: '*',
          type: 'expansion',
          description: 'Expands every sibling at the focused level.',
        },
        {
          name: 'Ctrl+A, Shift+Arrow, Ctrl+Shift+Home/End',
          type: 'multi-select',
          description:
            'Select all, extend by one, and range-select to the start/end — the APG "recommended" model, so plain navigation needs no modifier.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TREE_VIEW_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeTreeViewMessages',
      entries: [
        {
          name: 'selectAll',
          type: 'string',
          default: "'Select all'",
          description: 'Label of the "select all" row.',
        },
        {
          name: 'searchPlaceholder',
          type: 'string',
          default: "'Search…'",
          description: 'Placeholder of the built-in search box.',
        },
        {
          name: 'searchLabel',
          type: 'string',
          default: "'Search the tree'",
          description: 'Accessible name of the built-in search box.',
        },
        {
          name: 'clearSearch',
          type: 'string',
          default: "'Clear search'",
          description: "Accessible name of the search box's clear button.",
        },
        {
          name: 'loadingChildren',
          type: 'string',
          default: "'Loading…'",
          description: "Shown while a node's lazy children are loading.",
        },
        {
          name: 'childrenLoadFailed',
          type: 'string',
          default: "'Could not load these items.'",
          description: 'Shown when <code>loadChildren</code> rejected.',
        },
        {
          name: 'noData',
          type: 'string',
          default: "'No items to display'",
          description: 'Shown when the tree has no nodes at all.',
        },
        {
          name: 'noSearchResults',
          type: 'string',
          default: "'No matching items'",
          description: 'Shown when a search matched nothing.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Behavioural defaults',
      entries: [
        {
          name: 'itemHeight',
          type: 'number | undefined',
          description: 'Default row height used by <code>virtualScroll</code>.',
        },
        {
          name: 'expandEvent',
          type: "'click' | 'dblclick' | undefined",
          description: 'Default for the <code>expandEvent</code> prop.',
        },
      ],
    },
    {
      entries: [
        {
          name: 'OgeTreeViewConfigProvider',
          type: '(props: { config?: OgeTreeViewConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Subtree defaults — the React counterpart of <code>provideOgeTreeViewConfig()</code>; shallow-merges <code>messages</code> over the built-ins.',
        },
        {
          name: 'useOgeTreeViewConfig()',
          type: '() =&gt; OgeTreeViewConfig',
          description:
            'Reads the resolved config of the nearest provider — the hook behind the component, and the React counterpart of injecting <code>OGE_TREE_VIEW_CONFIG</code>.',
        },
      ],
    },
  ],
};
