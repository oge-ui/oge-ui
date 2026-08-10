import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/navigation/src/lib/menubar/** — keep in sync
 * with the source TSDoc when the public API changes.
 */
export const OGE_MENUBAR_API: ApiSections = {
  properties: [
    {
      title: 'Data',
      entries: [
        {
          name: 'items',
          type: 'readonly OgeMenubarItemData[] | undefined',
          description:
            'Data-driven item tree; children at any depth open as nested submenus. Rendered <strong>after</strong> any declarative <code>&lt;oge-menubar-item&gt;</code> children — the house merge order.',
        },
        {
          name: 'activeKey',
          type: 'string | undefined',
          description:
            'The item <code>key</code> rendered with <code>aria-current="page"</code> and the active style. Consumer-driven — bind it from the router; the menubar itself takes no router dependency.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeMenubarMessages> | undefined',
          description:
            'Per-instance overrides of the user-facing strings, merged over <code>provideOgeMenubarConfig()</code>.',
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
          name: 'submenuItemTemplate',
          type: 'TemplateRef<OgeMenuItemTemplateContext> | undefined',
          description:
            'Custom rendering for submenu rows at <strong>every depth</strong> — the shared <code>oge-menu-list</code> context. Top-level bar items use <code>[ogeMenubarItemTemplate]</code> instead.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'open(target: number | string)',
          type: 'void',
          description:
            'Opens the submenu of a top-level item, by index or <code>key</code>. Runs through the cancelable <code>submenuOpening</code> pipeline.',
        },
        {
          name: 'close()',
          type: 'void',
          description:
            "Closes any open submenu through the cancelable <code>submenuClosing</code> pipeline with <code>reason: 'api'</code>.",
        },
        {
          name: 'focus()',
          type: 'void',
          description:
            "Focuses the bar's roving tab target — or the hamburger button when compact.",
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'itemClick',
          type: 'OgeMenubarItemClickEvent',
          description:
            'A leaf item was activated, at any depth. Carries the item, its <code>key</code> and the hierarchical index <code>path</code> from the bar down.',
        },
        {
          name: 'submenuOpening',
          type: 'OgeMenubarSubmenuOpeningEvent',
          description:
            '<strong>Cancelable</strong> — set <code>cancel</code> to keep the submenu closed. <code>item</code> is <code>undefined</code> for the compact hamburger menu (empty <code>path</code>).',
        },
        {
          name: 'submenuOpened',
          type: 'OgeMenubarSubmenuOpenedEvent',
          description: 'A top-level submenu (or the hamburger menu) opened.',
        },
        {
          name: 'submenuClosing',
          type: 'OgeMenubarSubmenuClosingEvent',
          description:
            '<strong>Cancelable</strong> — set <code>cancel</code> to keep the submenu open. Fires for closes the menubar itself initiates (<code>escape</code>, <code>select</code>, <code>navigation</code>, <code>api</code>); overlay-owned closes (<code>outside</code>) and Tab only report <code>submenuClosed</code>.',
        },
        {
          name: 'submenuClosed',
          type: 'OgeMenubarSubmenuClosedEvent',
          description: 'A submenu closed, with its <code>reason</code>.',
        },
        {
          name: 'compactChanged',
          type: 'OgeMenubarCompactChangedEvent',
          description:
            'The bar collapsed into (or recovered from) the compact hamburger.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeMenubarItemData<T>',
          type: 'interface',
          description:
            'The canonical overlay <code>OgeMenuItem</code> narrowed recursively — <code>badge</code> and <code>shortcut</code> included — plus <code>key</code> (identity for <code>activeKey</code>/<code>open()</code>/events), <code>url</code> (renders the item as a real <code>&lt;a href&gt;</code> at the bar <strong>and</strong> at any submenu depth; <code>itemClick</code> fires first so <code>preventDefault()</code> hands navigation to a router) and <code>visible</code>. Submenus come from <code>items</code>.',
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
          name: 'OgeMenubarItemTemplate',
          type: 'directive — ng-template[ogeMenubarItemTemplate]',
          description:
            'Replaces the rendering of <strong>top-level</strong> bar items; context is <code>OgeMenubarItemTemplateContext</code>. Submenu rows keep the shared <code>oge-menu-list</code> rendering.',
        },
        {
          name: 'OgeMenubarItemTemplateContext',
          type: '{ $implicit: OgeMenubarItemData; index: number }',
          description:
            'Context of <code>[ogeMenubarItemTemplate]</code>: the item and its top-level index.',
        },
      ],
    },
  ],
};

export const OGE_MENUBAR_ITEM_API: ApiSections = {
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
            'Stable identity used by <code>activeKey</code>, <code>open()</code> and event payloads.',
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
            'Top-level items only: renders the item as a real link (<code>&lt;a href&gt;</code>).',
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
            'Renders a divider (<code>role="separator"</code>); every other input is ignored.',
        },
      ],
    },
  ],
};

export const OGE_MENUBAR_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeMenubarConfig()',
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
          description: 'Default for the <code>openMode</code> input.',
        },
        {
          name: 'hoverDelay',
          type: 'number | undefined',
          description: 'Default for the <code>hoverDelay</code> input, in ms.',
        },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical' | undefined",
          description: 'Default for the <code>orientation</code> input.',
        },
        {
          name: 'compactBelow',
          type: 'number | undefined',
          description: 'Default for the <code>compactBelow</code> input.',
        },
      ],
    },
  ],
};
