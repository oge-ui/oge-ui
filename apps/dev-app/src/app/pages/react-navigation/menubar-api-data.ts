import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/navigation/src/lib/menubar.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../navigation/menubar-api-data.ts` (the parity
 * gate diffs the two member by member): the same props, the public methods on
 * the `ref` handle, callbacks in place of outputs, render props in place of
 * `TemplateRef`s and the context provider in place of the DI one.
 *
 * The second block is the React face of `<oge-menubar-item>`: React reserves
 * the `key` prop, so an item component could not carry the identity `key`
 * means here — an item is an `OgeMenubarItemData` object in the `items` tree,
 * with the same fields.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Data',
    entries: [
      {
        name: 'items',
        type: 'readonly OgeMenubarItemData[] | undefined',
        description:
          'Data-driven item tree; children at any depth open as nested submenus. The <strong>only</strong> item API in React — the Angular layer also accepts declarative <code>&lt;oge-menubar-item&gt;</code> children, which React cannot mirror because <code>key</code> is reserved by React itself.',
      },
      {
        name: 'activeKey',
        type: 'string | undefined',
        description:
          'The item <code>key</code> rendered with <code>aria-current="page"</code> and the active style. Consumer-driven — bind it from your router; the menubar itself takes no router dependency.',
      },
      {
        name: 'messages',
        type: 'Partial&lt;OgeMenubarMessages&gt; | undefined',
        description:
          'Per-instance overrides of the user-facing strings, merged over <code>&lt;OgeMenubarConfigProvider&gt;</code>.',
      },
    ],
  },
  {
    title: 'Behavior',
    entries: [
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description:
          'A vertical bar announces <code>aria-orientation="vertical"</code> and swaps the arrow axes: Up/Down traverse, ArrowRight opens the submenu beside the bar.',
      },
      {
        name: 'openMode',
        type: "'click' | 'hover'",
        default: "'click'",
        description:
          'How <strong>top-level</strong> submenus open. Nested levels always open on hover and on ArrowRight/Enter — the reference libraries&rsquo; first-vs-nested split baked in as behavior. With a menu open, hovering siblings switches it in either mode.',
      },
      {
        name: 'hoverDelay',
        type: 'number',
        default: '100',
        description:
          "Hover dwell before a top-level submenu opens in <code>'hover'</code> mode, in ms. Nested levels use the overlay config's <code>menuShowDelayMs</code>/<code>menuHideDelayMs</code> (50/300).",
      },
      {
        name: 'compactBelow',
        type: 'number | undefined',
        description:
          "Below this <strong>container</strong> inline size the whole bar collapses into a hamburger button opening the full tree as one nested menu. Measured against the menubar's own box, never the window.",
      },
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description:
          'Disables the whole bar: every item goes inert and the bar leaves the Tab sequence.',
      },
      {
        name: 'renderSubmenuItem',
        type: '(item: OgeMenuItem, index: number) =&gt; ReactNode',
        description:
          'Custom rendering for submenu rows at <strong>every depth</strong> — the shared menu-list renderer, the React face of <code>[submenuItemTemplate]</code>. Top-level bar items use <code>renderItem</code> instead.',
      },
      {
        name: 'renderItem',
        type: '(item: OgeMenubarItemData, index: number) =&gt; ReactNode',
        description:
          'Replaces the interior of the <strong>top-level</strong> bar items — the React face of <code>[ogeMenubarItemTemplate]</code> (documented in the Angular block&rsquo;s types table). The caret, roles and roving tabindex stay with the component.',
      },
    ],
  },
  {
    title: 'Host',
    entries: [
      {
        name: 'className',
        type: 'string | undefined',
        description:
          'Extra classes on the menubar element — the React host styling idiom; an Angular host takes <code>class</code> natively.',
      },
      {
        name: 'style',
        type: 'CSSProperties | undefined',
        description: 'Inline styles on the menubar element.',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'OgeMenubarHandle (ref)',
    entries: [
      {
        name: 'open(target: number | string)',
        type: 'void',
        description:
          'Opens the submenu of a top-level item, by index or <code>key</code>. Runs through the cancelable <code>onSubmenuOpening</code> pipeline.',
      },
      {
        name: 'close()',
        type: 'void',
        description:
          "Closes any open submenu through the cancelable <code>onSubmenuClosing</code> pipeline with <code>reason: 'api'</code>.",
      },
      {
        name: 'focus()',
        type: 'void',
        description:
          "Focuses the bar's roving tab target — or the hamburger button when compact.",
      },
    ],
  },
];

const EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'onItemClick',
        type: '(event: OgeMenubarItemClickEvent) =&gt; void',
        description:
          'A leaf item was activated, at any depth. Carries the item, its <code>key</code> and the hierarchical index <code>path</code> from the bar down.',
      },
      {
        name: 'onSubmenuOpening',
        type: '(event: OgeMenubarSubmenuOpeningEvent) =&gt; void',
        description:
          '<strong>Cancelable</strong> — set <code>cancel</code> to keep the submenu closed. <code>item</code> is <code>undefined</code> for the compact hamburger menu (empty <code>path</code>).',
      },
      {
        name: 'onSubmenuOpened',
        type: '(event: OgeMenubarSubmenuOpenedEvent) =&gt; void',
        description: 'A top-level submenu (or the hamburger menu) opened.',
      },
      {
        name: 'onSubmenuClosing',
        type: '(event: OgeMenubarSubmenuClosingEvent) =&gt; void',
        description:
          '<strong>Cancelable</strong> — set <code>cancel</code> to keep the submenu open. Fires for closes the menubar itself initiates (<code>escape</code>, <code>select</code>, <code>navigation</code>, <code>api</code>); overlay-owned closes (<code>outside</code>) and Tab only report <code>onSubmenuClosed</code>.',
      },
      {
        name: 'onSubmenuClosed',
        type: '(event: OgeMenubarSubmenuClosedEvent) =&gt; void',
        description: 'A submenu closed, with its <code>reason</code>.',
      },
      {
        name: 'onCompactChanged',
        type: '(event: OgeMenubarCompactChangedEvent) =&gt; void',
        description:
          'The bar collapsed into (or recovered from) the compact hamburger.',
      },
    ],
  },
];

const TYPE_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeMenubarItemData<T>',
        type: 'interface',
        description:
          'The canonical overlay <code>OgeMenuItem</code> narrowed recursively — <code>badge</code> and <code>shortcut</code> included — plus <code>key</code> (identity for <code>activeKey</code>/<code>open()</code>/events), <code>url</code> (renders the item as a real <code>&lt;a href&gt;</code> at the bar <strong>and</strong> at any submenu depth; <code>onItemClick</code> fires first so <code>preventDefault()</code> hands navigation to a router) and <code>visible</code>. Submenus come from <code>items</code>.',
      },
      {
        name: 'OgeMenubarCloseReason',
        type: "'escape' | 'outside' | 'select' | 'tab' | 'navigation' | 'api'",
        description:
          "Why a submenu closed. <code>'navigation'</code> is a Left/Right or hover switch to a sibling top-level item.",
      },
      {
        name: 'OgeMenubarItemClickEvent',
        type: '{ item; key?; index; path; event }',
        description:
          '<code>path</code> is the hierarchical index chain from the bar down to the item; <code>index</code> is its last entry.',
      },
      {
        name: 'OgeMenubarHandle',
        type: 'interface',
        description:
          'The <code>ref</code> handle: <code>open</code>, <code>close</code>, <code>focus</code> — the React face of the Angular public methods.',
      },
      {
        name: 'OgeMenubarProps',
        type: 'interface',
        description:
          'Props of <code>&lt;OgeMenubar&gt;</code>, render props included.',
      },
    ],
  },
];

export const OGE_REACT_MENUBAR_API: ApiSections = {
  properties: PROPERTY_GROUPS,
  methods: METHOD_GROUPS,
  events: EVENT_GROUPS,
  types: TYPE_GROUPS,
};

/**
 * The React face of `<oge-menubar-item>`: an item is an object in the `items`
 * tree — the same fields as the Angular directive's inputs.
 */
export const OGE_REACT_MENUBAR_ITEM_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description: 'Label of the item.',
        },
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity used by <code>activeKey</code>, the handle&rsquo;s <code>open()</code> and event payloads. Not React&rsquo;s <code>key</code> — an item is data, so nothing collides.',
        },
        {
          name: 'value',
          type: 'unknown',
          description: 'Consumer-defined value carried through click events.',
        },
        {
          name: 'url',
          type: 'string | undefined',
          description:
            'Renders the item as a real link (<code>&lt;a href&gt;</code>).',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Tooltip (native <code>title</code>) — e.g. why an item is disabled.',
        },
        {
          name: 'icon',
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>) for a leading <code>aria-hidden</code> icon.',
        },
        {
          name: 'iconClass',
          type: 'string | undefined',
          description:
            'Class(es) for a leading icon element — the icon-font hook.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disabled items are exposed (<code>aria-disabled</code>) but inert and skipped by the arrow keys.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description: '<code>false</code> removes the item and its subtree.',
        },
        {
          name: 'separator',
          type: 'boolean',
          default: 'false',
          description:
            'Renders a divider (<code>role="separator"</code>); every other field is ignored.',
        },
      ],
    },
  ],
};

export const OGE_REACT_MENUBAR_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeMenubarConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeMenubarMessages',
          description:
            'Every user-facing string: <code>menubar</code> (accessible name of the bar, default <code>Menu bar</code>) and <code>hamburger</code> (aria label of the compact button, default <code>Menu</code>).',
        },
        {
          name: 'openMode',
          type: "'click' | 'hover' | undefined",
          description: 'Default for the <code>openMode</code> prop.',
        },
        {
          name: 'hoverDelay',
          type: 'number | undefined',
          description: 'Default for the <code>hoverDelay</code> prop, in ms.',
        },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical' | undefined",
          description: 'Default for the <code>orientation</code> prop.',
        },
        {
          name: 'compactBelow',
          type: 'number | undefined',
          description: 'Default for the <code>compactBelow</code> prop.',
        },
      ],
    },
  ],
};
