import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/src/lib/toolbar/** — keep in sync with
 * the source TSDoc when the public API changes.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Items',
    entries: [
      {
        name: 'items',
        type: 'readonly OgeToolbarItemData[] | undefined',
        description:
          'Data-driven entries, rendered after the declarative <code>&lt;oge-toolbar-item&gt;</code> children.',
      },
      {
        name: 'dataSource',
        type: 'DataSource<OgeToolbarItemData> | undefined',
        description:
          'Remote command list, loaded through <code>&#64;oge-ui/core</code>&rsquo;s <code>DataSource</code> contract and merged after <code>items</code>. A source that publishes <code>changes</code> triggers a reload.',
      },
      {
        name: 'showText',
        type: "'always' | 'onBar' | 'inMenu' | 'never'",
        default: "'always'",
        description:
          'Default for every item&rsquo;s <code>showText</code>: both places, the bar only, the menu only, or neither. An item that renders icon-only keeps its <code>text</code> as the accessible name.',
      },
      {
        name: 'showIcon',
        type: "'always' | 'onBar' | 'inMenu' | 'never'",
        default: "'always'",
        description:
          'Default for every item&rsquo;s <code>showIcon</code>. It resolves separately for the bar and the overflow menu, so a collapsed command keeps its icon on its menu row unless you say <code>&apos;onBar&apos;</code>.',
      },
    ],
  },
  {
    title: 'Layout & overflow',
    entries: [
      {
        name: 'overflow',
        type: "'menu' | 'scroll' | 'wrap' | 'extended' | 'none'",
        default: "'menu'",
        description:
          '<code>menu</code> collapses what does not fit into an overflow menu, <code>scroll</code> keeps one line and adds scroll buttons, <code>wrap</code> flows onto more lines (the reference <code>multiline</code> mode), <code>extended</code> hides the remainder in a second row behind a toggle, <code>none</code> lets the row overflow.',
      },
      {
        name: 'scrollStep',
        type: 'number',
        default: '120',
        description:
          'Pixels a scroll button moves the row in <code>overflow: &#39;scroll&#39;</code>.',
      },
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description:
          'Main axis. Drives the arrow keys and <code>aria-orientation</code> (written only when vertical, since horizontal is the ARIA default).',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description:
          'Density preset. Falls back to <code>provideOgeToolbarConfig({ size })</code>.',
      },
      {
        name: 'stylingMode',
        type: "'outlined' | 'filled' | 'flat'",
        default: "'outlined'",
        description:
          'Container chrome. Falls back to <code>provideOgeToolbarConfig({ stylingMode })</code>.',
      },
    ],
  },
  {
    title: 'State & accessibility',
    entries: [
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description:
          'Disables every item and takes the whole toolbar out of the Tab sequence.',
      },
      {
        name: 'wrap',
        type: 'boolean',
        default: 'true',
        description:
          'Whether arrow navigation wraps around the ends — optional in the APG toolbar pattern, on by default here.',
      },
      {
        name: 'keyboardNavigation',
        type: 'boolean',
        default: 'true',
        description:
          'Turns arrow/Home/End handling off entirely. The controls then keep their natural Tab order instead of a roving tabindex.',
      },
      {
        name: 'itemHoldTimeout',
        type: 'number',
        default: '750',
        description:
          'Milliseconds a pointer must rest on an item before <code>itemHold</code> fires.',
      },
      {
        name: 'ariaLabel',
        type: 'string | undefined',
        description:
          'Accessible name of the toolbar; falls back to <code>messages.toolbar</code>.',
      },
      {
        name: 'ariaLabelledBy',
        type: 'string | undefined',
        description:
          'Id of a visible label. Wins over <code>ariaLabel</code>, which is then omitted.',
      },
      {
        name: 'messages',
        type: 'Partial<OgeToolbarMessages> | undefined',
        description:
          'Per-instance overrides of the config strings (<code>toolbar</code>, <code>overflowMenu</code>, <code>noData</code>).',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Methods',
    entries: [
      {
        name: 'focus()',
        type: '(): void',
        description:
          'Focuses the toolbar&rsquo;s current roving-tabindex stop.',
      },
      {
        name: 'openMenu()',
        type: '(event?: Event): void',
        description:
          'Opens the overflow menu. Runs the <code>menuOpening</code> pipeline, so it can be vetoed.',
      },
      {
        name: 'closeMenu()',
        type: '(reason?: OgeToolbarMenuCloseReason): void',
        description:
          'Closes the overflow menu, subject to <code>menuClosing</code>. Defaults to reason <code>&#39;api&#39;</code>.',
      },
      {
        name: 'toggleMenu()',
        type: '(event?: Event): void',
        description:
          'Opens the menu when closed, closes it otherwise — the reference <code>toggle()</code> method.',
      },
      {
        name: 'toggleExtendedRow()',
        type: '(): void',
        description:
          'Shows or hides the second row of <code>overflow: &#39;extended&#39;</code>.',
      },
      {
        name: 'refreshOverflow()',
        type: '(): void',
        description:
          'Drops the measurement cache and re-measures. Signal changes and container resizes already do this — call it after something the toolbar cannot observe changed a control&rsquo;s size (a late web font, a stylesheet swap).',
      },
      {
        name: 'addItem()',
        type: '(item: OgeToolbarItemData): void',
        description:
          'Appends a runtime entry, merged after <code>items</code>. <code>items</code> stays the declared source of truth, so a re-supplied array does not drop it.',
      },
      {
        name: 'removeItem()',
        type: '(key: string): void',
        description:
          'Drops an entry added by <code>addItem()</code>, or hides an <code>items</code> entry.',
      },
      {
        name: 'hideItem()',
        type: '(key: string, hidden?: boolean): void',
        description:
          'Hides (or re-shows) an entry without touching the <code>items</code> array.',
      },
      {
        name: 'enableItem()',
        type: '(key: string, enabled?: boolean): void',
        description:
          'Enables (or disables) an entry without touching the <code>items</code> array.',
      },
      {
        name: 'clearItemOverrides()',
        type: '(): void',
        description:
          'Drops every <code>hideItem()</code> / <code>enableItem()</code> override.',
      },
    ],
  },
];

const EVENT_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Events',
    entries: [
      {
        name: 'itemClick',
        type: 'OgeToolbarItemClickEvent',
        description:
          'An item was activated on the bar or from the menu. Payload: <code>index</code>, <code>key</code>, <code>item</code>, <code>inMenu</code>, <code>event</code>.',
      },
      {
        name: 'menuOpening',
        type: 'OgeToolbarMenuOpeningEvent',
        description:
          'Cancelable — set <code>cancel</code> to keep the overflow menu closed.',
      },
      {
        name: 'menuOpened',
        type: 'void',
        description: 'The overflow menu opened.',
      },
      {
        name: 'menuClosing',
        type: 'OgeToolbarMenuClosingEvent',
        description:
          'Cancelable — set <code>cancel</code> to keep the overflow menu open. Carries the close <code>reason</code>.',
      },
      {
        name: 'menuClosed',
        type: 'OgeToolbarMenuClosedEvent',
        description: 'The overflow menu closed, with its reason.',
      },
      {
        name: 'overflowChanged',
        type: 'OgeToolbarOverflowChangedEvent',
        description:
          'The set of items living in the overflow menu changed. Payload: <code>keys</code>, <code>count</code>.',
      },
      {
        name: 'activeChanged',
        type: 'OgeToolbarItemActiveChangedEvent',
        description:
          'A toggle item&rsquo;s pressed state changed. <code>items</code> entries are data the toolbar must not mutate, so this is how the new value reaches the app; a declarative child also writes its two-way <code>active</code> model.',
      },
      {
        name: 'itemHold',
        type: 'OgeToolbarItemHoldEvent',
        description:
          'An item was held for <code>itemHoldTimeout</code> — touch long-press or mouse hold.',
      },
      {
        name: 'itemContextMenu',
        type: 'OgeToolbarItemHoldEvent',
        description: 'An item was right-clicked or long-pressed.',
      },
    ],
  },
];

const SLOT_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Template slots',
    entries: [
      {
        name: 'ogeToolbarBefore',
        type: 'attribute slot',
        description:
          'Projects any control into the leading group. Slot content always stays on the bar — the toolbar cannot re-stamp DOM it does not own.',
      },
      {
        name: 'ogeToolbarCenter',
        type: 'attribute slot',
        description: 'Projects any control into the centre group.',
      },
      {
        name: 'ogeToolbarAfter',
        type: 'attribute slot',
        description: 'Projects any control into the trailing group.',
      },
      {
        name: 'ogeToolbarItemTemplate',
        type: 'TemplateRef<OgeToolbarItemTemplateContext>',
        description:
          'Replaces the default rendering of every <code>items</code> entry — the curated stand-in for the reference libraries&rsquo; string-keyed <code>widget</code> + <code>options</code> bag. Declared inside an <code>&lt;oge-toolbar-item&gt;</code> it renders that one item instead, and stays re-stampable into the menu.',
      },
      {
        name: 'ogeToolbarMenuItemTemplate',
        type: 'TemplateRef<OgeToolbarItemTemplateContext>',
        description:
          'Replaces the default rendering of an item inside the overflow menu (the reference <code>menuItemTemplate</code>).',
      },
    ],
  },
];

const TYPE_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Types',
    entries: [
      {
        name: 'OgeToolbarItemData',
        type: 'interface',
        description:
          'One data-driven entry: <code>key</code>, <code>type</code>, <code>text</code>, <code>icon</code>, <code>suffixIcon</code>, <code>iconClass</code>, <code>suffixIconClass</code>, <code>hint</code>, <code>width</code>, <code>htmlAttributes</code>, <code>location</code>, <code>locateInMenu</code>, <code>overflowPriority</code>, <code>showText</code>, <code>showIcon</code>, <code>disabled</code>, <code>visible</code>, <code>cssClass</code>, <code>severity</code>, <code>active</code>, <code>data</code>.',
      },
      {
        name: 'OgeToolbarItemType',
        type: "'button' | 'separator' | 'spacer' | 'label'",
        description: 'What the toolbar renders for an item it owns.',
      },
      {
        name: 'OgeToolbarItemLocation',
        type: "'before' | 'center' | 'after'",
        description: 'Which of the three groups an item belongs to.',
      },
      {
        name: 'OgeToolbarLocateInMenu',
        type: "'auto' | 'always' | 'never'",
        description:
          'Whether an item may move into the overflow menu. Structurally core&rsquo;s <code>OgeToolbarOverflowPolicy</code>, which <code>fitToolbarItems()</code> consumes.',
      },
      {
        name: 'OgeToolbarDisplayMode',
        type: "'always' | 'onBar' | 'inMenu' | 'never'",
        description:
          'Where an item&rsquo;s text or icon is rendered: both places, the bar only, the menu only, or neither.',
      },
      {
        name: 'OgeToolbarItemSeverity',
        type: "'default' | 'accent' | 'danger'",
        description: 'Emphasis of an item the toolbar renders itself.',
      },
      {
        name: 'OgeToolbarOverflow',
        type: "'menu' | 'scroll' | 'wrap' | 'extended' | 'none'",
        description: 'How the toolbar reacts to more items than room.',
      },
      {
        name: 'OgeToolbarOrientation',
        type: "'horizontal' | 'vertical'",
        description: 'Main axis of the toolbar.',
      },
      {
        name: 'OgeToolbarSize',
        type: "'sm' | 'md' | 'lg'",
        description: 'Density preset.',
      },
      {
        name: 'OgeToolbarStylingMode',
        type: "'outlined' | 'filled' | 'flat'",
        description: 'Container chrome preset.',
      },
      {
        name: 'OgeToolbarMenuCloseReason',
        type: "'api' | 'outside' | 'escape' | 'select' | 'tab'",
        description:
          'Why the overflow menu closed — the overlay package&rsquo;s canonical reason set.',
      },
      {
        name: 'OgeToolbarItemClickEvent',
        type: 'interface',
        description:
          '<code>index</code>, <code>key?</code>, <code>item?</code>, <code>inMenu</code>, <code>event</code>.',
      },
      {
        name: 'OgeToolbarOverflowChangedEvent',
        type: 'interface',
        description: '<code>keys</code>, <code>count</code>.',
      },
      {
        name: 'OgeToolbarItemActiveChangedEvent',
        type: 'interface',
        description:
          '<code>index</code>, <code>key?</code>, <code>item?</code>, <code>active</code>, <code>event</code>.',
      },
      {
        name: 'OgeToolbarItemHoldEvent',
        type: 'interface',
        description:
          'Payload of <code>itemHold</code> and <code>itemContextMenu</code>: <code>index</code>, <code>key?</code>, <code>item?</code>, <code>event</code>.',
      },
      {
        name: 'OgeToolbarMenuOpeningEvent',
        type: 'interface',
        description: '<code>cancel</code>, <code>event?</code>.',
      },
      {
        name: 'OgeToolbarMenuClosingEvent',
        type: 'interface',
        description: '<code>cancel</code>, <code>reason</code>.',
      },
      {
        name: 'OgeToolbarMenuClosedEvent',
        type: 'interface',
        description: '<code>reason</code>.',
      },
      {
        name: 'OgeToolbarItemTemplateContext',
        type: 'interface',
        description:
          '<code>$implicit</code> (the <code>items</code> entry, <code>undefined</code> for declarative children), <code>index</code>, <code>inMenu</code>.',
      },
      {
        name: 'fitToolbarItems',
        type: '(options: OgeToolbarFitOptions) => OgeToolbarFitResult',
        description:
          'The framework-free fitting math in <code>&#64;oge-ui/core</code>: which items fit and which collapse. Pure arithmetic, so it is unit-testable without a DOM — the component only feeds it measurements.',
      },
    ],
  },
];

export const OGE_TOOLBAR_API: ApiSections = {
  properties: [...PROPERTY_GROUPS, ...SLOT_GROUPS],
  methods: METHOD_GROUPS,
  events: EVENT_GROUPS,
  types: TYPE_GROUPS,
};

export const OGE_TOOLBAR_ITEM_API: ApiSections = {
  properties: [
    {
      title: 'Inputs',
      entries: [
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity echoed on <code>itemClick</code> and used for DOM ids.',
        },
        {
          name: 'type',
          type: "'button' | 'separator' | 'spacer' | 'label'",
          default: "'button'",
          description:
            'What the toolbar renders when the item has no inline template.',
        },
        {
          name: 'text',
          type: 'string | undefined',
          description:
            'Label; also the accessible name when the item renders icon-only.',
        },
        {
          name: 'icon',
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>) for a leading aria-hidden 16×16 icon.',
        },
        {
          name: 'suffixIcon',
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>) for a trailing icon, rendered after the text.',
        },
        {
          name: 'iconClass',
          type: 'string | undefined',
          description:
            'Class(es) for a leading icon rendered as an empty <code>&lt;i&gt;</code> — the hook for an icon font the application already ships. <code>icon</code> stays the dependency-free default.',
        },
        {
          name: 'suffixIconClass',
          type: 'string | undefined',
          description: 'Class(es) for a trailing icon element.',
        },
        {
          name: 'width',
          type: 'number | string | undefined',
          description:
            'Fixed main-axis size of the item — a bare number is pixels.',
        },
        {
          name: 'htmlAttributes',
          type: 'Readonly<Record<string, string>> | undefined',
          description:
            'Extra attributes on the item element. Keys removed from the bag are removed from the DOM, so clearing it clears the element.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description: 'Tooltip — the native <code>title</code> attribute.',
        },
        {
          name: 'location',
          type: "'before' | 'center' | 'after'",
          default: "'before'",
          description:
            'Which of the toolbar&rsquo;s three groups the item joins.',
        },
        {
          name: 'locateInMenu',
          type: "'auto' | 'always' | 'never'",
          default: "'auto'",
          description:
            'Whether the item may move into the overflow menu. The default diverges from the reference <code>never</code> on purpose — collapsing is the point.',
        },
        {
          name: 'overflowPriority',
          type: 'number | undefined',
          default: '0',
          description:
            'How hard the item holds its place on the bar; higher survives longer. The default makes the trailing item yield first, as in every reference toolbar. Raise it to keep a primary command visible without moving it to the front of the bar.',
        },
        {
          name: 'showText',
          type: "'always' | 'onBar' | 'inMenu' | 'never' | undefined",
          description: 'Overrides the toolbar&rsquo;s <code>showText</code>.',
        },
        {
          name: 'showIcon',
          type: "'always' | 'onBar' | 'inMenu' | 'never' | undefined",
          description: 'Overrides the toolbar&rsquo;s <code>showIcon</code>.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Not clickable, and skipped by the toolbar&rsquo;s arrow navigation.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description: '<code>false</code> removes the item entirely.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          description: 'Extra class on the item element.',
        },
        {
          name: 'severity',
          type: "'default' | 'accent' | 'danger'",
          default: "'default'",
          description: 'Emphasis of a toolbar-rendered button.',
        },
        {
          name: 'data',
          type: 'unknown',
          description:
            'Arbitrary payload echoed back on <code>itemClick</code> — the declarative counterpart of the same field on an <code>[items]</code> entry.',
        },
        {
          name: 'active',
          type: 'boolean | undefined (two-way)',
          description:
            'Toggle-button state. Defining it is what makes the item a toggle: it renders <code>aria-pressed</code> on the bar and a checkmark in the menu, and every activation flips the value.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'itemClick',
          type: 'OgeToolbarItemClickEvent',
          description:
            'This item was activated, on the bar or from the overflow menu. Saves the <code>index</code> lookup the toolbar-level event needs.',
        },
        {
          name: 'activeChanged',
          type: 'OgeToolbarItemActiveChangedEvent',
          description: 'This toggle item&rsquo;s pressed state changed.',
        },
      ],
    },
  ],
};

export const OGE_TOOLBAR_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeToolbarConfig()',
      entries: [
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg' | undefined",
          description: 'Default for every toolbar&rsquo;s <code>size</code>.',
        },
        {
          name: 'stylingMode',
          type: "'outlined' | 'filled' | 'flat' | undefined",
          description:
            'Default for every toolbar&rsquo;s <code>stylingMode</code>.',
        },
        {
          name: 'messages.toolbar',
          type: 'string',
          default: "'Toolbar'",
          description:
            'Accessible name used when neither <code>ariaLabel</code> nor <code>ariaLabelledBy</code> is set.',
        },
        {
          name: 'messages.overflowMenu',
          type: 'string',
          default: "'More commands'",
          description:
            'Accessible name and tooltip of the overflow button, and the menu&rsquo;s label.',
        },
        {
          name: 'messages.moreCommands',
          type: 'string',
          default: "'Show more commands'",
          description:
            'Accessible name of the <code>overflow: &#39;extended&#39;</code> second-row toggle.',
        },
        {
          name: 'messages.scrollBackward',
          type: 'string',
          default: "'Scroll backward'",
          description:
            'Accessible name of the back scroll button in <code>overflow: &#39;scroll&#39;</code>.',
        },
        {
          name: 'messages.scrollForward',
          type: 'string',
          default: "'Scroll forward'",
          description: 'Accessible name of the forward scroll button.',
        },
        {
          name: 'messages.noData',
          type: 'string',
          default: "'No commands to display'",
          description:
            'Shown when the toolbar has no items of its own and nothing is projected into a slot (the reference <code>noDataText</code>).',
        },
      ],
    },
  ],
};
