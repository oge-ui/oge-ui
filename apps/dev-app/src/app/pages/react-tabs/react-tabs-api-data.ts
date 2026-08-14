import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/tabs/src/lib/** — keep in sync with the
 * source TSDoc when the public API changes.
 *
 * Mirrors `pages/tabs/tabs-api-data.ts` block for block and group for group:
 * `<OgeTabs>` and `<OgeTabPanel>` share one `OgeTabsSharedProps` interface, so
 * the shared members are listed once per component as "Common" groups, exactly
 * like the Angular base class. What differs is the idiom — controlled /
 * uncontrolled prop pairs instead of `model()`, callbacks instead of outputs,
 * a `ref` handle instead of public methods, render props instead of
 * `TemplateRef`s, and an `OgeTabDefinition` object instead of a projected
 * `<oge-tab>` child — and that is precisely what a reader crossing the switch
 * needs spelled out. The parity gate diffs the two tables and flags anything
 * missing on either side.
 */

const COMMON_TABS_AND_SELECTION: ApiGroup = {
  title: 'Common — tabs & selection',
  entries: [
    {
      name: 'tabs',
      type: 'readonly OgeTabDefinition[]',
      description:
        'Declarative tabs — the React counterpart of the projected <code>&lt;oge-tab&gt;</code> children: an item plus its <code>content</code> and optional <code>renderHeader</code>.',
    },
    {
      name: 'items',
      type: 'readonly OgeTabItem[]',
      description:
        'Data-driven tabs, rendered after the <code>tabs</code> entries.',
    },
    {
      name: 'selectedIndex',
      type: 'number',
      description:
        'Index of the selected tab — controlled when provided, so pass <code>onSelectedIndexChange</code> with it. <code>-1</code> selects none; clamped when tabs are removed.',
    },
    {
      name: 'defaultSelectedIndex',
      type: 'number',
      default: '0',
      description:
        'Uncontrolled initial selection — the component owns the index from there. Never combine with <code>selectedIndex</code>.',
    },
    {
      name: 'onSelectedIndexChange',
      type: '(index: number) =&gt; void',
      description:
        'The controlled half of <code>selectedIndex</code>; Angular’s <code>[(selectedIndex)]</code> model is both halves at once.',
    },
    {
      name: 'selectedKey',
      type: 'string',
      description:
        'Key of the selected tab — controlled when provided, reconciled with the index the same way the Angular model is.',
    },
    {
      name: 'onSelectedKeyChange',
      type: '(key: string | undefined) =&gt; void',
      description:
        'The controlled half of <code>selectedKey</code>; fires with the key of the newly selected tab.',
    },
    {
      name: 'renderTabHeader',
      type: '(context: OgeTabHeaderContext) =&gt; ReactNode',
      description:
        'Shared header renderer for the <code>items</code> tabs (icons, rich markup) — the React face of <code>[ogeTabHeaderTemplate]</code>. Context: <code>{ item, index, selected, text }</code>. A <code>tabs</code> entry overrides it with its own <code>renderHeader</code>.',
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
      type: 'string',
      description: 'Aria label of the tablist.',
    },
    {
      name: 'messages',
      type: 'Partial&lt;OgeTabsMessages&gt;',
      description:
        'Per-instance overrides of the <code>&lt;OgeTabsConfigProvider&gt;</code> messages.',
    },
  ],
};

const COMMON_CLOSING_AND_ORDER: ApiGroup = {
  title: 'Common — closing, overflow & order',
  entries: [
    {
      name: 'closable',
      type: 'boolean',
      default: 'false',
      description:
        'Default closability; overridable per tab / per item. Closed tabs are removed by the app in <code>onTabClosed</code>. The ✕ is presentational — the keyboard path is Delete/Backspace on the focused tab.',
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
        'Shows the all-tabs overflow menu (the same menu list, with the active tab checked).',
    },
    {
      name: 'allowTabReordering',
      type: 'boolean',
      default: 'false',
      description:
        'Enables drag & drop reordering of tab headers; Escape cancels an in-flight drag.',
    },
  ],
};

const COMMON_APPEARANCE: ApiGroup = {
  title: 'Common — appearance',
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
    {
      name: 'className',
      type: 'string',
      description: 'Extra class names appended to the host element.',
    },
    {
      name: 'style',
      type: 'CSSProperties',
      description: 'Inline styles applied to the host element.',
    },
  ],
};

const COMMON_PROPERTY_GROUPS: readonly ApiGroup[] = [
  COMMON_TABS_AND_SELECTION,
  COMMON_CLOSING_AND_ORDER,
  COMMON_APPEARANCE,
];

const COMMON_METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Common — imperative handle (via ref)',
    entries: [
      {
        name: 'focus()',
        type: '() =&gt; void',
        description: 'Focuses the active tab header (roving-tabindex target).',
      },
      {
        name: 'closeTab(target: number | string)',
        type: '() =&gt; void',
        description:
          'Runs the close pipeline (<code>onTabClosing</code> → <code>closeGuard</code> → <code>onTabClosed</code>) for an index or key.',
      },
      {
        name: 'scrollToTab(target: number | string)',
        type: '() =&gt; void',
        description: 'Scrolls the tab at an index or with a key into view.',
      },
    ],
  },
];

const COMMON_EVENT_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Common — callbacks',
    entries: [
      {
        name: 'onSelectionChanging',
        type: '(event: OgeTabSelectionChangingEvent) =&gt; void',
        description:
          'Cancelable pre-event of a user-gesture selection change (set <code>event.cancel = true</code> to keep the current tab). Programmatic prop writes bypass it.',
      },
      {
        name: 'onSelectionChanged',
        type: '(event: OgeTabSelectionChangedEvent) =&gt; void',
        description:
          'After the selection committed — <code>index/key/previousIndex/previousKey/item/event</code>.',
      },
      {
        name: 'onTabClick',
        type: '(event: OgeTabClickEvent) =&gt; void',
        description:
          'A tab header was activated by pointer or keyboard (Enter/Space).',
      },
      {
        name: 'onTabClosing',
        type: '(event: OgeTabClosingEvent) =&gt; void',
        description:
          'Cancelable pre-event of a close, before the async <code>closeGuard</code> runs.',
      },
      {
        name: 'onTabClosed',
        type: '(event: OgeTabClosedEvent) =&gt; void',
        description:
          'The close passed all guards — drop the <code>items</code> / <code>tabs</code> entry from your state here.',
      },
      {
        name: 'onTabReordering',
        type: '(event: OgeTabReorderingEvent) =&gt; void',
        description:
          'Cancelable pre-event of a drag-reorder drop (<code>fromIndex/toIndex/key</code>).',
      },
      {
        name: 'onTabReordered',
        type: '(event: OgeTabReorderedEvent) =&gt; void',
        description: 'A drag reorder committed to the display order.',
      },
    ],
  },
];

export const OGE_REACT_TAB_PANEL_API: ApiSections = {
  properties: [
    ...COMMON_PROPERTY_GROUPS,
    {
      title: 'Panel rendering (&lt;OgeTabPanel&gt; only)',
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
            "Mount a panel's content only when its tab first activates.",
        },
        {
          name: 'keepAlive',
          type: 'boolean',
          default: 'true',
          description:
            'Keep once-rendered panels mounted (hidden) so React state survives switches; <code>false</code> unmounts lazy content on deactivation.',
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
        {
          name: 'renderTabContent',
          type: '(context: { item; index: number }) =&gt; ReactNode',
          description:
            'Panel content for the <code>items</code> tabs — the React face of <code>[ogeTabContentTemplate]</code>. A <code>tabs</code> entry carries its own <code>content</code> instead.',
        },
      ],
    },
  ],
  methods: COMMON_METHOD_GROUPS,
  events: COMMON_EVENT_GROUPS,
  types: [
    {
      entries: [
        {
          name: 'OgeTabPanelProps',
          type: 'interface',
          description:
            'Extends <code>OgeTabsSharedProps</code> with the panel-rendering props above.',
        },
        {
          name: 'OgeTabsHandle',
          type: '{ focus(); closeTab(target); scrollToTab(target) }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TABS_API: ApiSections = {
  properties: [
    {
      title: 'Strip (&lt;OgeTabs&gt; only)',
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
    ...COMMON_PROPERTY_GROUPS,
  ],
  methods: COMMON_METHOD_GROUPS,
  events: COMMON_EVENT_GROUPS,
  types: [
    {
      entries: [
        {
          name: 'OgeTabsProps',
          type: 'interface',
          description:
            'Extends <code>OgeTabsSharedProps</code> with <code>orientation</code>.',
        },
        {
          name: 'OgeTabsHandle',
          type: '{ focus(); closeTab(target); scrollToTab(target) }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TAB_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'text',
          type: 'string',
          description:
            'Tab label; alternative to a per-tab <code>renderHeader</code>.',
        },
        {
          name: 'key',
          type: 'string',
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
          type: 'boolean',
          description:
            'Shows a close button; omitted, it falls back to the component-level <code>closable</code>.',
        },
        {
          name: 'badge',
          type: 'string | number',
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
          type: 'string',
          description:
            'Tooltip — rendered as the native <code>title</code> attribute.',
        },
        {
          name: 'closeGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            'Veto hook run before this tab closes; may be async (single-flight, rejection = veto, pending spinner on the ✕).',
        },
        {
          name: 'content',
          type: 'ReactNode',
          description:
            'Panel content rendered while the tab is displayed — the React face of the content projected into an <code>&lt;oge-tab&gt;</code>.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgeTabHeaderContext) =&gt; ReactNode',
          description:
            'Custom header for this tab alone — the React face of an <code>[ogeTabHeaderTemplate]</code> inside an <code>&lt;oge-tab&gt;</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render props',
      entries: [
        {
          name: 'OgeTabHeaderContext',
          type: '{ item: OgeTabItem | undefined; index: number; selected: boolean; text: string }',
          description:
            'Context handed to <code>renderHeader</code> / <code>renderTabHeader</code> — the React face of <code>OgeTabHeaderTemplateContext</code>. <code>item</code> is <code>undefined</code> for <code>tabs</code>-declared entries.',
        },
        {
          name: 'renderTabContent context',
          type: '{ item: OgeTabItem; index: number }',
          description:
            'Context handed to <code>&lt;OgeTabPanel&gt;</code>’s <code>renderTabContent</code> — the React face of <code>OgeTabContentTemplateContext</code>. Lazy by default: it runs on first activation, honoring <code>deferRendering</code> / <code>keepAlive</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TABS_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'OgeTabsConfigProvider',
          type: '(props: { config?: OgeTabsConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Wrap a subtree to change the tabs’ user-facing strings beneath it — the React counterpart of Angular’s <code>provideOgeTabsConfig()</code>. Both shallow-merge <code>messages</code> over the same <code>@oge-ui/behavior</code> defaults, so an override reads identically in either layer.',
        },
        {
          name: 'useOgeTabsConfig()',
          type: '() =&gt; OgeTabsConfig',
          description:
            'Reads the resolved config of the current subtree — how a strip of your own picks up the same messages.',
        },
      ],
    },
  ],
  properties: [
    {
      title: 'OgeTabsConfig',
      entries: [
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
          description: 'One data-driven tab of the <code>items</code> prop.',
        },
        {
          name: 'OgeTabDefinition',
          type: 'OgeTabItem &amp; { content?, renderHeader? }',
          description:
            'One declarative tab of the <code>tabs</code> prop — an item plus its panel content.',
        },
        {
          name: 'OgeTabCloseGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
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
          description:
            'Logical strip placement of <code>&lt;OgeTabPanel&gt;</code>.',
        },
        {
          name: 'OgeTabsOrientation',
          type: "'horizontal' | 'vertical'",
          description:
            'Direction of a stand-alone <code>&lt;OgeTabs&gt;</code> strip.',
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
