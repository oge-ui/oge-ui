import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/tabs/src/lib/** — keep in sync with the
 * source TSDoc when the public API changes.
 */

const SHARED_PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Tabs & selection',
    entries: [
      {
        name: 'items',
        type: 'readonly OgeTabItem[] | undefined',
        description:
          'Data-driven tabs rendered after the projected <code>&lt;oge-tab&gt;</code> children.',
      },
      {
        name: 'selectedIndex',
        type: 'number',
        default: '0',
        description:
          'Index of the selected tab — two-way. <code>-1</code> selects none; clamped when tabs are removed.',
      },
      {
        name: 'selectedKey',
        type: 'string | undefined',
        default: 'undefined',
        description:
          'Key of the selected tab — two-way, reconciled with <code>selectedIndex</code> both ways.',
      },
      {
        name: 'activation',
        type: "'automatic' | 'manual'",
        default: "'automatic'",
        description:
          'APG activation: arrows select immediately, or move focus only until Enter/Space commits.',
      },
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disables the whole component.',
      },
      {
        name: 'ariaLabel',
        type: 'string | undefined',
        description: 'Aria label of the tablist.',
      },
      {
        name: 'messages',
        type: 'Partial<OgeTabsMessages>',
        default: '{}',
        description:
          'Per-instance overrides of the config <code>messages</code>.',
      },
    ],
  },
  {
    title: 'Closing, overflow & order',
    entries: [
      {
        name: 'closable',
        type: 'boolean',
        default: 'false',
        description:
          'Default closability; overridable per tab / per item. Closed tabs are removed by the app in <code>tabClosed</code>. The ✕ is presentational — the keyboard path is Delete/Backspace on the focused tab.',
      },
      {
        name: 'showNavButtons',
        type: "'auto' | 'always' | 'never'",
        default: "'auto'",
        description:
          'Overflow nav arrows; <code>auto</code> shows them only while the strip overflows.',
      },
      {
        name: 'showTabListButton',
        type: 'boolean',
        default: 'false',
        description:
          'Shows the all-tabs overflow menu (an <code>oge-menu-list</code> with the active tab checked).',
      },
      {
        name: 'allowTabReordering',
        type: 'boolean',
        default: 'false',
        description:
          'Enables drag & drop reordering of tab headers; Escape cancels an in-flight drag.',
      },
    ],
  },
  {
    title: 'Appearance',
    entries: [
      {
        name: 'stylingMode',
        type: "'primary' | 'secondary'",
        default: "'primary'",
        description:
          'Visual variant: underline ink (<code>primary</code>) or soft pills (<code>secondary</code>).',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description: 'Density of the tab strip.',
      },
      {
        name: 'tabAlignment',
        type: "'start' | 'center' | 'end' | 'justify' | 'stretch'",
        default: "'start'",
        description:
          'Distribution of the tabs while they fit: <code>justify</code> spreads them to the edges, <code>stretch</code> gives every tab an equal share.',
      },
      {
        name: 'indicatorFit',
        type: "'tab' | 'content'",
        default: "'tab'",
        description:
          'Whether the selected-tab indicator spans the whole tab or only its label area.',
      },
    ],
  },
];

const SHARED_METHOD_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'focus(): void',
        type: 'void',
        description: 'Focuses the active tab header (roving-tabindex target).',
      },
      {
        name: 'closeTab(target: number | string): void',
        type: 'void',
        description:
          'Runs the close pipeline (<code>tabClosing</code> → <code>closeGuard</code> → <code>tabClosed</code>) for an index or key.',
      },
      {
        name: 'scrollToTab(target: number | string): void',
        type: 'void',
        description: 'Scrolls the tab at an index or with a key into view.',
      },
    ],
  },
];

const SHARED_EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'selectionChanging',
        type: 'OgeTabSelectionChangingEvent',
        description:
          'Cancelable pre-event of a user-gesture selection change (<code>cancel = true</code> keeps the current tab). Programmatic model writes bypass it.',
      },
      {
        name: 'selectionChanged',
        type: 'OgeTabSelectionChangedEvent',
        description:
          'After the selection committed — <code>index/key/previousIndex/previousKey/item/event</code>.',
      },
      {
        name: 'tabClick',
        type: 'OgeTabClickEvent',
        description:
          'A tab header was activated by pointer or keyboard (Enter/Space).',
      },
      {
        name: 'tabClosing',
        type: 'OgeTabClosingEvent',
        description:
          'Cancelable pre-event of a close, before the async <code>closeGuard</code> runs.',
      },
      {
        name: 'tabClosed',
        type: 'OgeTabClosedEvent',
        description:
          'The close passed all guards — remove the <code>items</code> entry or <code>&lt;oge-tab&gt;</code> here.',
      },
      {
        name: 'tabReordering',
        type: 'OgeTabReorderingEvent',
        description:
          'Cancelable pre-event of a drag-reorder drop (<code>fromIndex/toIndex/key</code>).',
      },
      {
        name: 'tabReordered',
        type: 'OgeTabReorderedEvent',
        description: 'A drag reorder committed to the display order.',
      },
    ],
  },
];

export const OGE_TAB_PANEL_API: ApiSections = {
  properties: [
    ...SHARED_PROPERTY_GROUPS,
    {
      title: 'Panel rendering (oge-tab-panel only)',
      entries: [
        {
          name: 'tabsPosition',
          type: "'top' | 'bottom' | 'start' | 'end'",
          default: "'top'",
          description:
            'Side the strip sits on — logical values, so RTL flips <code>start</code>/<code>end</code>. Vertical positions switch the arrow keys to Up/Down.',
        },
        {
          name: 'deferRendering',
          type: 'boolean',
          default: 'true',
          description:
            "Instantiate a panel's content only when its tab first activates (lazy templates via <code>ogeTabContentTemplate</code>).",
        },
        {
          name: 'keepAlive',
          type: 'boolean',
          default: 'true',
          description:
            'Keep once-rendered panels mounted (hidden) so state survives switches; <code>false</code> destroys lazy content on deactivation.',
        },
        {
          name: 'panelAnimation',
          type: "'none' | 'fade' | 'slide'",
          default: "'none'",
          description:
            'Transition played by the incoming panel; <code>slide</code> enters from the direction of travel (mirrored in RTL). Duration comes from <code>--oge-tab-panel-transition</code> (180ms) and is suppressed under <code>prefers-reduced-motion</code>.',
        },
        {
          name: 'dynamicHeight',
          type: 'boolean',
          default: 'false',
          description:
            'Animates the content box between the outgoing and incoming panel heights instead of jumping; async content is tracked with a <code>ResizeObserver</code>.',
        },
      ],
    },
  ],
  methods: SHARED_METHOD_GROUPS,
  events: SHARED_EVENT_GROUPS,
};

export const OGE_TABS_API: ApiSections = {
  properties: [
    {
      title: 'Strip (oge-tabs only)',
      entries: [
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description:
            'Strip direction; <code>vertical</code> renders a column, maps arrows to Up/Down and sets <code>aria-orientation</code>.',
        },
      ],
    },
    ...SHARED_PROPERTY_GROUPS,
  ],
  methods: SHARED_METHOD_GROUPS,
  events: SHARED_EVENT_GROUPS,
};

export const OGE_TAB_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description:
            'Tab label; alternative to an inline <code>[ogeTabHeaderTemplate]</code>.',
        },
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity used by <code>selectedKey</code>, reorder tracking and DOM ids.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disabled tabs are skipped by keyboard navigation and selection.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description:
            '<code>false</code> removes the tab (and its panel) entirely.',
        },
        {
          name: 'closable',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            'Shows a close button; <code>undefined</code> falls back to the component-level <code>closable</code>.',
        },
        {
          name: 'badge',
          type: 'string | number | undefined',
          description: 'Badge rendered after the label.',
        },
        {
          name: 'dirty',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the unsaved-changes dot and announces it to screen readers (<code>messages.dirty</code>).',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Tooltip — rendered as the native <code>title</code> attribute.',
        },
        {
          name: 'closeGuard',
          type: '() => boolean | Promise<boolean>',
          description:
            'Veto hook run before this tab closes; may be async (single-flight, rejection = veto, pending spinner on the ✕).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Template slots',
      entries: [
        {
          name: '[ogeTabHeaderTemplate]',
          type: 'OgeTabHeaderTemplateContext',
          description:
            'Custom tab header (icons, rich markup). Inside an <code>&lt;oge-tab&gt;</code>: that tab only; directly inside the component: every <code>items</code> tab. Context: <code>{ $implicit: item, index, selected, text }</code>.',
        },
        {
          name: '[ogeTabContentTemplate]',
          type: 'OgeTabContentTemplateContext',
          description:
            'Lazily instantiated panel content. Inside an <code>&lt;oge-tab&gt;</code> it replaces the projected content; directly inside <code>oge-tab-panel</code> it renders every <code>items</code> tab. Context: <code>{ $implicit: item, index }</code>.',
        },
      ],
    },
  ],
};

export const OGE_TABS_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'provideOgeTabsConfig(config)',
          type: '(config: OgeTabsConfigInput) => Provider',
          description:
            'Application- or component-scoped defaults; shallow-merges <code>messages</code> over the built-ins.',
        },
        {
          name: 'messages',
          type: 'OgeTabsMessages',
          description:
            'Every user-facing string: <code>closeTab</code>, <code>scrollBackward</code>, <code>scrollForward</code>, <code>tabListMenu</code>, <code>dirty</code>, <code>noData</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeTabItem',
          type: '{ key?, text?, badge?, hint?, disabled?, visible?, closable?, dirty?, closeGuard? }',
          description: 'One data-driven tab of the <code>items</code> input.',
        },
        {
          name: 'OgeTabCloseGuard',
          type: '() => boolean | Promise<boolean>',
          description:
            'Per-tab veto hook; resolving <code>false</code> (or rejecting) keeps the tab open.',
        },
        {
          name: 'OgeTabsActivation',
          type: "'automatic' | 'manual'",
          description: 'How keyboard focus interacts with selection (APG).',
        },
        {
          name: 'OgeTabsPosition',
          type: "'top' | 'bottom' | 'start' | 'end'",
          description: 'Logical strip placement of <code>oge-tab-panel</code>.',
        },
        {
          name: 'OgeTabsOrientation',
          type: "'horizontal' | 'vertical'",
          description:
            'Direction of a stand-alone <code>oge-tabs</code> strip.',
        },
        {
          name: 'OgeTabsNavButtonsMode',
          type: "'auto' | 'always' | 'never'",
          description: 'When the overflow nav arrows are shown.',
        },
        {
          name: 'OgeTabsAlignment',
          type: "'start' | 'center' | 'end' | 'justify' | 'stretch'",
          description: 'How tabs are distributed along the strip.',
        },
        {
          name: 'OgeTabsIndicatorFit',
          type: "'tab' | 'content'",
          description: 'Width of the selected-tab indicator.',
        },
        {
          name: 'OgeTabPanelAnimation',
          type: "'none' | 'fade' | 'slide'",
          description: 'Transition played by the newly displayed panel.',
        },
        {
          name: 'OgeTabsStylingMode / OgeTabsSize',
          type: "'primary' | 'secondary' / 'sm' | 'md' | 'lg'",
          description: 'Visual variant and density unions.',
        },
      ],
    },
  ],
};
