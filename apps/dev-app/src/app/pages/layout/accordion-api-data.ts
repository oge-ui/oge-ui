import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/src/lib/accordion/** — keep in sync with
 * the source TSDoc when the public API changes.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Panels & expansion',
    entries: [
      {
        name: 'items',
        type: 'readonly OgeAccordionItemData[] | undefined',
        description:
          'Data-driven panels rendered after the projected <code>&lt;oge-accordion-item&gt;</code> children.',
      },
      {
        name: 'expandedKeys',
        type: 'readonly string[]',
        default: '[]',
        description:
          'Keys of the expanded panels — two-way. The multi-expand counterpart of <code>selectedIndex</code>; only panels that declare a <code>key</code> can appear here.',
      },
      {
        name: 'selectedIndex',
        type: 'number',
        default: '-1',
        description:
          'Index of the expanded panel in single-expand mode — two-way. <code>-1</code> means none; in <code>multiple</code> mode it reports the first expanded panel.',
      },
      {
        name: 'multiple',
        type: 'boolean',
        default: 'false',
        description: 'Allows more than one panel to stay expanded.',
      },
      {
        name: 'collapsible',
        type: 'boolean',
        default: 'false',
        description:
          'Allows collapsing the last expanded panel, leaving none open. While <code>false</code>, that header is <code>aria-disabled</code> per the APG — it stays focusable.',
      },
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disables the whole component.',
      },
    ],
  },
  {
    title: 'Rendering & animation',
    entries: [
      {
        name: 'deferRendering',
        type: 'boolean',
        default: 'true',
        description:
          "Instantiate a panel's content only when it first expands.",
      },
      {
        name: 'keepAlive',
        type: 'boolean',
        default: 'true',
        description:
          'Keep once-rendered panels mounted (hidden) so their state survives a collapse. Ignored while <code>deferRendering</code> is <code>false</code>.',
      },
      {
        name: 'animation',
        type: 'boolean | number',
        default: 'true',
        description:
          'Height animation: <code>true</code> uses the default duration, a number overrides it in milliseconds, <code>false</code> disables it. Always suppressed under <code>prefers-reduced-motion</code>.',
      },
    ],
  },
  {
    title: 'Appearance',
    entries: [
      {
        name: 'togglePosition',
        type: "'start' | 'end'",
        default: "'end'",
        description:
          'Side of the header the chevron sits on — logical, so RTL mirrors it.',
      },
      {
        name: 'hideToggle',
        type: 'boolean',
        default: 'false',
        description:
          'Hides the chevron entirely. Overridable per panel via <code>&lt;oge-accordion-item [hideToggle]&gt;</code>.',
      },
      {
        name: 'collapsedHeaderHeight',
        type: 'string | undefined',
        description:
          'Minimum height of a collapsed header (any CSS length). <code>undefined</code> lets <code>size</code> and the padding tokens decide. Material’s <code>collapsedHeight</code>.',
      },
      {
        name: 'expandedHeaderHeight',
        type: 'string | undefined',
        description:
          'Minimum height of an expanded header; falls back to <code>collapsedHeaderHeight</code>. Material’s <code>expandedHeight</code>.',
      },
      {
        name: 'displayMode',
        type: "'default' | 'flat'",
        default: "'default'",
        description:
          '<code>flat</code> removes the gutters between panels and joins them into one stack.',
      },
      {
        name: 'stylingMode',
        type: "'outlined' | 'filled' | 'flat'",
        default: "'outlined'",
        description: 'Visual variant of the panels.',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description: 'Density of the header rows.',
      },
    ],
  },
  {
    title: 'Keyboard & accessibility',
    entries: [
      {
        name: 'keyboardNavigation',
        type: 'boolean',
        default: 'true',
        description:
          'Enables Up/Down/Home/End and Ctrl+PageUp/PageDown header navigation. The APG pattern itself requires only Enter/Space and Tab — this is the optional enhancement.',
      },
      {
        name: 'typeAhead',
        type: 'boolean',
        default: 'true',
        description:
          'Enables printable-character type-ahead over the panel titles. Matching is accent- and locale-insensitive.',
      },
      {
        name: 'selectOnFocus',
        type: 'boolean',
        default: 'false',
        description:
          'Expands a panel as soon as keyboard navigation moves focus onto it.',
      },
      {
        name: 'headingLevel',
        type: 'number',
        default: '3',
        description:
          '<code>aria-level</code> of the heading wrapping each header button.',
      },
      {
        name: 'useRegionRole',
        type: 'boolean',
        default: 'true',
        description:
          'Gives each panel <code>role="region"</code> (APG-optional; adds one landmark per panel).',
      },
      {
        name: 'ariaLabel',
        type: 'string | undefined',
        description: 'Aria label of the accordion container.',
      },
      {
        name: 'messages',
        type: 'Partial&lt;OgeAccordionMessages&gt;',
        default: '{}',
        description:
          'Per-instance overrides of the config <code>messages</code>.',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'expand(target)',
        type: '(target: number | string) => Promise&lt;boolean&gt;',
        description:
          'Runs the expand pipeline for the panel at an index or with a key. Resolves <code>true</code> once it expanded, <code>false</code> if an unknown target, <code>itemExpanding</code> or the <code>expandGuard</code> vetoed it.',
      },
      {
        name: 'collapse(target)',
        type: '(target: number | string) => Promise&lt;boolean&gt;',
        description:
          'Runs the collapse pipeline; resolves whether the panel actually collapsed.',
      },
      {
        name: 'toggle(target)',
        type: '(target: number | string) => Promise&lt;boolean&gt;',
        description: 'Expands the panel if collapsed, collapses it otherwise.',
      },
      {
        name: 'expandAll()',
        type: '() => void',
        description:
          'Expands every enabled panel. Requires <code>multiple</code> — otherwise it warns in dev mode and does nothing.',
      },
      {
        name: 'collapseAll()',
        type: '() => void',
        description:
          'Collapses every panel. In single-expand mode the last panel stays open unless <code>collapsible</code> is set.',
      },
      {
        name: 'expandInvalid()',
        type: '() => void',
        description:
          'Expands every panel flagged <code>invalid</code> — call it after a failed form submit so the user sees each section needing attention.',
      },
      {
        name: 'isExpanded(target)',
        type: '(target: number | string) => boolean',
        description:
          'Whether the panel at an index or with a key is currently expanded.',
      },
      {
        name: 'focus(target?)',
        type: '(target?: number | string) => void',
        description:
          "Focuses a panel's header button, or the first enabled one.",
      },
    ],
  },
];

const EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'itemExpanding',
        type: 'OgeAccordionExpandingEvent',
        description:
          'Cancelable pre-event of a panel expanding — set <code>cancel = true</code> to block it. Runs before the panel’s <code>expandGuard</code>.',
      },
      {
        name: 'itemExpanded',
        type: 'OgeAccordionExpandedEvent',
        description: 'Emitted after a panel expanded.',
      },
      {
        name: 'itemCollapsing',
        type: 'OgeAccordionCollapsingEvent',
        description:
          'Cancelable pre-event of a panel collapsing — set <code>cancel = true</code> to block it.',
      },
      {
        name: 'itemCollapsed',
        type: 'OgeAccordionCollapsedEvent',
        description: 'Emitted after a panel collapsed.',
      },
      {
        name: 'afterExpand',
        type: 'OgeAccordionExpandedEvent',
        description:
          'Emitted once the expand animation finished — the point at which the panel has its final height. Fires immediately when the animation is off or suppressed by <code>prefers-reduced-motion</code>.',
      },
      {
        name: 'afterCollapse',
        type: 'OgeAccordionCollapsedEvent',
        description: 'Emitted once the collapse animation finished.',
      },
      {
        name: 'itemClick',
        type: 'OgeAccordionItemClickEvent',
        description:
          'Emitted when a header button is activated, before the expand pipeline runs. Fires for disabled panels too.',
      },
      {
        name: 'itemContentLoaded',
        type: 'OgeAccordionContentLoadedEvent',
        description:
          "Emitted after a panel's <code>contentLoader</code> resolved.",
      },
      {
        name: 'itemContentFailed',
        type: 'OgeAccordionContentFailedEvent',
        description:
          "Emitted after a panel's <code>contentLoader</code> rejected.",
      },
      {
        name: 'expandedKeysChange',
        type: 'readonly string[]',
        description: 'Two-way model output of <code>expandedKeys</code>.',
      },
      {
        name: 'selectedIndexChange',
        type: 'number',
        description: 'Two-way model output of <code>selectedIndex</code>.',
      },
    ],
  },
];

export const OGE_ACCORDION_API: ApiSections = {
  properties: PROPERTY_GROUPS,
  methods: METHOD_GROUPS,
  events: EVENT_GROUPS,
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeAccordionItemData',
          type: 'interface',
          description:
            'Data-driven counterpart of a declarative panel: <code>key</code>, <code>title</code>, <code>description</code>, <code>icon</code>, <code>badge</code>, <code>hint</code>, <code>disabled</code>, <code>visible</code>, <code>expanded</code>, <code>invalid</code>, <code>expandGuard</code>, <code>contentLoader</code>.',
        },
        {
          name: 'OgeAccordionExpandGuard',
          type: '() => boolean | Promise&lt;boolean&gt;',
          description:
            'Veto for a pending expand or collapse. <code>false</code> blocks it; throwing or rejecting is also a veto. While a promise is pending the panel shows a spinner and ignores further toggles (single-flight).',
        },
        {
          name: 'OgeAccordionContentLoader',
          type: '() => Promise&lt;unknown&gt;',
          description:
            "Loads a panel's content the first time it expands. The resolved value reaches the content template as <code>data</code>.",
        },
        {
          name: 'OgeAccordionTogglePosition',
          type: "'start' | 'end'",
          description: 'Chevron side inside the header button.',
        },
        {
          name: 'OgeAccordionDisplayMode',
          type: "'default' | 'flat'",
          description: 'Gutters between panels, or one joined stack.',
        },
        {
          name: 'OgeAccordionStylingMode',
          type: "'outlined' | 'filled' | 'flat'",
          description: 'Visual variant of the panels.',
        },
        {
          name: 'OgeAccordionSize',
          type: "'sm' | 'md' | 'lg'",
          description: 'Density of the header rows.',
        },
      ],
    },
  ],
};

export const OGE_ACCORDION_ITEM_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'title',
          type: 'string',
          default: "''",
          description:
            'Header title; alternative to an inline <code>[ogeAccordionHeaderTemplate]</code>.',
        },
        {
          name: 'text',
          type: 'string | undefined',
          description:
            'Plain-text panel body, rendered when there is no projected content or content template. The reference <code>html</code> item field has no counterpart on purpose.',
        },
        {
          name: 'description',
          type: 'string | undefined',
          description: 'Secondary line rendered under the title.',
        },
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity used by <code>expandedKeys</code> and DOM ids.',
        },
        {
          name: 'icon',
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>) rendered as a 24×24 aria-hidden icon before the title.',
        },
        {
          name: 'badge',
          type: 'string | number | undefined',
          description: 'Badge rendered after the title.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Tooltip — rendered as the native <code>title</code> attribute.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disabled panels cannot expand and are skipped by keyboard navigation.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description: '<code>false</code> removes the panel entirely.',
        },
        {
          name: 'expanded',
          type: 'boolean',
          default: 'false',
          description:
            'Expanded state of this panel — <strong>two-way</strong>. Set it to expand on first render, bind it to follow the state, or write to it to drive the panel from outside. Writes still run the pipeline, so a veto reverts the binding.',
        },
        {
          name: 'hideToggle',
          type: 'boolean | undefined',
          description:
            "Overrides the accordion's <code>hideToggle</code> for this panel.",
        },
        {
          name: 'togglePosition',
          type: "'start' | 'end' | undefined",
          description:
            "Overrides the accordion's <code>togglePosition</code> for this panel.",
        },
        {
          name: 'invalid',
          type: 'boolean',
          default: 'false',
          description:
            'Flags the section as failing validation — renders the danger rail and feeds <code>expandInvalid()</code>.',
        },
        {
          name: 'expandGuard',
          type: 'OgeAccordionExpandGuard | undefined',
          description:
            'Veto hook run before this panel expands or collapses; may be async (single-flight).',
        },
        {
          name: 'contentLoader',
          type: 'OgeAccordionContentLoader | undefined',
          description:
            "Loads this panel's content on first expand, with a skeleton while pending and a retry button on failure.",
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'open()',
          type: '() => void',
          description:
            'Expands this panel. Like a user gesture it runs the accordion’s pipeline, so <code>itemExpanding</code> and <code>expandGuard</code> can still veto it.',
        },
        {
          name: 'close()',
          type: '() => void',
          description:
            'Collapses this panel, subject to <code>collapsible</code> and the guards.',
        },
        {
          name: 'toggle()',
          type: '() => void',
          description:
            'Expands the panel if collapsed, collapses it otherwise.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Template slots',
      entries: [
        {
          name: '[ogeAccordionHeaderTemplate]',
          type: '{ $implicit, index, expanded, title, description }',
          description:
            'Replaces the built-in title/description/icon layout inside the header button. Component-level instances apply to <code>items</code> panels only (queried with <code>descendants: false</code>). Must not contain focusable controls.',
        },
        {
          name: '[ogeAccordionContentTemplate]',
          type: '{ $implicit, index, data }',
          description:
            "Panel body; marks the content lazy. <code>data</code> carries the panel's <code>contentLoader</code> result.",
        },
        {
          name: '[ogeAccordionToggleIconTemplate]',
          type: '{ $implicit: boolean, index }',
          description:
            'Replaces the chevron. Accordion-level chrome — a component-level instance applies to declarative children too.',
        },
        {
          name: '[ogeAccordionHeaderActionsTemplate]',
          type: '{ $implicit, index, expanded }',
          description:
            'Per-panel actions rendered <em>beside</em> the toggle button, never inside it — real focusable controls without a <code>nested-interactive</code> violation.',
        },
        {
          name: '[ogeAccordionActionRow]',
          type: 'directive',
          description:
            "Marks a row of buttons at the end of a panel body as its action bar (divider above, actions at the inline end) — the references' action-row slot. Inside the panel, so only reachable while expanded.",
        },
      ],
    },
  ],
};

export const OGE_ACCORDION_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeAccordionMessages',
      entries: [
        {
          name: 'invalidSection',
          type: 'string',
          default: "'section has errors'",
          description:
            'Announced after the title of a panel flagged <code>invalid</code>.',
        },
        {
          name: 'pending',
          type: 'string',
          default: "'working'",
          description:
            'Announced while an <code>expandGuard</code> promise is in flight.',
        },
        {
          name: 'loadingContent',
          type: 'string',
          default: "'Loading…'",
          description:
            "Shown while a panel's <code>contentLoader</code> is running.",
        },
        {
          name: 'contentLoadFailed',
          type: 'string',
          default: "'Could not load this section.'",
          description:
            "Shown when a panel's <code>contentLoader</code> rejected.",
        },
        {
          name: 'retry',
          type: 'string',
          default: "'Retry'",
          description: 'Label of the retry button on a failed content load.',
        },
        {
          name: 'noData',
          type: 'string',
          default: "'No sections to display'",
          description:
            'Shown in place of the panels when there are no visible items.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Behavioural defaults',
      entries: [
        {
          name: 'hideToggle',
          type: 'boolean | undefined',
          description: 'Default for the <code>hideToggle</code> input.',
        },
        {
          name: 'collapsedHeaderHeight',
          type: 'string | undefined',
          description:
            'Default for the <code>collapsedHeaderHeight</code> input.',
        },
        {
          name: 'expandedHeaderHeight',
          type: 'string | undefined',
          description:
            'Default for the <code>expandedHeaderHeight</code> input. Together with the two above this is the <code>MAT_EXPANSION_PANEL_DEFAULT_OPTIONS</code> equivalent.',
        },
      ],
    },
    {
      entries: [
        {
          name: 'provideOgeAccordionConfig(config)',
          type: '(config: OgeAccordionConfigInput) => Provider',
          description:
            'Application- or component-scoped defaults; shallow-merges <code>messages</code> over the built-ins.',
        },
        {
          name: 'OGE_ACCORDION_CONFIG',
          type: 'InjectionToken&lt;OgeAccordionConfig&gt;',
          description:
            'The token itself, with a factory default — inject it to read the effective config.',
        },
      ],
    },
  ],
};
