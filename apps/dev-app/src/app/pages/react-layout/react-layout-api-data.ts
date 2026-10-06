import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/accordion.tsx and
 * use-accordion.ts — keep in sync with the source TSDoc when the public API
 * changes.
 *
 * Mirrors `pages/layout/accordion-api-data.ts` block for block and group for
 * group. What differs is the idiom — controlled / uncontrolled prop pairs
 * instead of `model()`, callbacks instead of outputs, a `ref` handle instead of
 * public methods, render props instead of `TemplateRef`s, and an
 * `OgeAccordionItemDefinition` object instead of a projected
 * `<oge-accordion-item>` child — and that is precisely what a reader crossing
 * the switch needs spelled out. The parity gate diffs the two tables and flags
 * anything missing on either side.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Panels & expansion',
    entries: [
      {
        name: 'items',
        type: 'readonly OgeAccordionItemDefinition[]',
        description:
          'The panels, in render order — the React counterpart of both the projected <code>&lt;oge-accordion-item&gt;</code> children and the Angular <code>items</code> array: the shared data fields plus <code>content</code> and the per-panel render props.',
      },
      {
        name: 'expandedKeys',
        type: 'readonly string[]',
        description:
          'Keys of the expanded panels — controlled when provided, so pass <code>onExpandedKeysChange</code> with it. The multi-expand counterpart of <code>selectedIndex</code>; only panels that declare a <code>key</code> can appear here.',
      },
      {
        name: 'defaultExpandedKeys',
        type: 'readonly string[]',
        description:
          'Uncontrolled initial expansion by key — the component owns the set from there. Never combine with <code>expandedKeys</code>.',
      },
      {
        name: 'onExpandedKeysChange',
        type: '(keys: readonly string[]) =&gt; void',
        description:
          'The controlled half of <code>expandedKeys</code>; Angular’s <code>[(expandedKeys)]</code> model is both halves at once.',
      },
      {
        name: 'selectedIndex',
        type: 'number',
        description:
          'Index of the expanded panel in single-expand mode — controlled when provided. <code>-1</code> means none; in <code>multiple</code> mode it reports the first expanded panel.',
      },
      {
        name: 'defaultSelectedIndex',
        type: 'number',
        default: '-1',
        description:
          'Uncontrolled initial expansion by index. Never combine with <code>selectedIndex</code>.',
      },
      {
        name: 'onSelectedIndexChange',
        type: '(index: number) =&gt; void',
        description:
          'The controlled half of <code>selectedIndex</code>; Angular’s <code>[(selectedIndex)]</code> model is both halves at once.',
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
          "Mount a panel's <code>renderContent</code> body only when it first expands.",
      },
      {
        name: 'keepAlive',
        type: 'boolean',
        default: 'true',
        description:
          'Keep once-rendered panels mounted (hidden) so their React state survives a collapse. Ignored while <code>deferRendering</code> is <code>false</code>.',
      },
      {
        name: 'animation',
        type: 'boolean | number',
        default: 'true',
        description:
          'Height animation: <code>true</code> uses the default duration, a number overrides it in milliseconds, <code>false</code> disables it. Always suppressed under <code>prefers-reduced-motion</code>.',
      },
      {
        name: 'renderHeader',
        type: '(context: OgeAccordionHeaderContext) =&gt; ReactNode',
        description:
          'Shared header renderer — the React face of the component-level <code>[ogeAccordionHeaderTemplate]</code>. Overridden by a panel’s own <code>renderHeader</code>. Must not contain focusable controls.',
      },
      {
        name: 'renderContent',
        type: '(context: OgeAccordionContentContext) =&gt; ReactNode',
        description:
          'Shared lazy body for panels that carry no <code>content</code> — the React face of <code>[ogeAccordionContentTemplate]</code>. <code>context.data</code> carries the panel’s <code>contentLoader</code> result.',
      },
      {
        name: 'renderToggleIcon',
        type: '(context: OgeAccordionToggleIconContext) =&gt; ReactNode',
        description:
          'Replaces the chevron — the React face of <code>[ogeAccordionToggleIconTemplate]</code>.',
      },
      {
        name: 'renderHeaderActions',
        type: '(context: OgeAccordionHeaderActionsContext) =&gt; ReactNode',
        description:
          'Actions rendered <em>beside</em> the toggle button, never inside it — the React face of <code>[ogeAccordionHeaderActionsTemplate]</code>, and the reason there is no <code>nested-interactive</code> violation.',
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
          'Hides the chevron entirely. Overridable per panel via an item’s <code>hideToggle</code>.',
      },
      {
        name: 'collapsedHeaderHeight',
        type: 'string',
        description:
          'Minimum height of a collapsed header (any CSS length). Unset lets <code>size</code> and the padding tokens decide.',
      },
      {
        name: 'expandedHeaderHeight',
        type: 'string',
        description:
          'Minimum height of an expanded header; falls back to <code>collapsedHeaderHeight</code>.',
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
          '<code>aria-level</code> of the heading wrapping each header button; 1–6 render a real <code>h1</code>–<code>h6</code>.',
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
        type: 'string',
        description: 'Aria label of the accordion container.',
      },
      {
        name: 'messages',
        type: 'Partial&lt;OgeAccordionMessages&gt;',
        description:
          'Per-instance overrides of the <code>&lt;OgeAccordionConfigProvider&gt;</code> messages.',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Imperative handle (via ref)',
    entries: [
      {
        name: 'expand(target)',
        type: '(target: number | string) =&gt; Promise&lt;boolean&gt;',
        description:
          'Runs the expand pipeline for the panel at an index or with a key. Resolves <code>true</code> once it expanded, <code>false</code> if an unknown target, <code>onItemExpanding</code> or the <code>expandGuard</code> vetoed it.',
      },
      {
        name: 'collapse(target)',
        type: '(target: number | string) =&gt; Promise&lt;boolean&gt;',
        description:
          'Runs the collapse pipeline; resolves whether the panel actually collapsed.',
      },
      {
        name: 'toggle(target)',
        type: '(target: number | string) =&gt; Promise&lt;boolean&gt;',
        description: 'Expands the panel if collapsed, collapses it otherwise.',
      },
      {
        name: 'expandAll()',
        type: '() =&gt; void',
        description:
          'Expands every enabled panel. Requires <code>multiple</code> — otherwise it warns in dev mode and does nothing.',
      },
      {
        name: 'collapseAll()',
        type: '() =&gt; void',
        description:
          'Collapses every panel. In single-expand mode the last panel stays open unless <code>collapsible</code> is set.',
      },
      {
        name: 'expandInvalid()',
        type: '() =&gt; void',
        description:
          'Expands every panel flagged <code>invalid</code> — call it after a failed form submit so the user sees each section needing attention.',
      },
      {
        name: 'isExpanded(target)',
        type: '(target: number | string) =&gt; boolean',
        description:
          'Whether the panel at an index or with a key is currently expanded.',
      },
      {
        name: 'focus(target?)',
        type: '(target?: number | string) =&gt; void',
        description:
          "Focuses a panel's header button, or the first enabled one.",
      },
    ],
  },
];

const EVENT_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Callbacks',
    entries: [
      {
        name: 'onItemExpanding',
        type: '(event: OgeAccordionExpandingEvent) =&gt; void',
        description:
          'Cancelable pre-event of a panel expanding — set <code>event.cancel = true</code> to block it. Runs before the panel’s <code>expandGuard</code>.',
      },
      {
        name: 'onItemExpanded',
        type: '(event: OgeAccordionExpandedEvent) =&gt; void',
        description: 'Fires after a panel expanded.',
      },
      {
        name: 'onItemCollapsing',
        type: '(event: OgeAccordionCollapsingEvent) =&gt; void',
        description:
          'Cancelable pre-event of a panel collapsing — set <code>event.cancel = true</code> to block it.',
      },
      {
        name: 'onItemCollapsed',
        type: '(event: OgeAccordionCollapsedEvent) =&gt; void',
        description: 'Fires after a panel collapsed.',
      },
      {
        name: 'onAfterExpand',
        type: '(event: OgeAccordionExpandedEvent) =&gt; void',
        description:
          'Fires once the expand animation finished — the point at which the panel has its final height. Fires immediately when the animation is off or suppressed by <code>prefers-reduced-motion</code>.',
      },
      {
        name: 'onAfterCollapse',
        type: '(event: OgeAccordionCollapsedEvent) =&gt; void',
        description: 'Fires once the collapse animation finished.',
      },
      {
        name: 'onItemClick',
        type: '(event: OgeAccordionItemClickEvent) =&gt; void',
        description:
          'Fires when a header button is activated, before the expand pipeline runs. Fires for disabled panels too.',
      },
      {
        name: 'onItemContentLoaded',
        type: '(event: OgeAccordionContentLoadedEvent) =&gt; void',
        description:
          "Fires after a panel's <code>contentLoader</code> resolved.",
      },
      {
        name: 'onItemContentFailed',
        type: '(event: OgeAccordionContentFailedEvent) =&gt; void',
        description:
          "Fires after a panel's <code>contentLoader</code> rejected.",
      },
    ],
  },
];

export const OGE_REACT_ACCORDION_API: ApiSections = {
  properties: PROPERTY_GROUPS,
  methods: METHOD_GROUPS,
  events: EVENT_GROUPS,
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeAccordionProps',
          type: 'interface',
          description:
            'Extends <code>OgeAccordionBehaviorProps</code> with <code>className</code> and <code>style</code>.',
        },
        {
          name: 'OgeAccordionHandle',
          type: '{ expand(); collapse(); toggle(); expandAll(); collapseAll(); expandInvalid(); isExpanded(); focus() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeAccordionItemData',
          type: 'interface',
          description:
            'The framework-free panel fields shared with Angular: <code>key</code>, <code>title</code>, <code>text</code>, <code>description</code>, <code>icon</code>, <code>badge</code>, <code>hint</code>, <code>disabled</code>, <code>visible</code>, <code>expanded</code>, <code>invalid</code>, <code>hideToggle</code>, <code>togglePosition</code>, <code>expandGuard</code>, <code>contentLoader</code>.',
        },
        {
          name: 'OgeAccordionExpandGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            'Veto for a pending expand or collapse. <code>false</code> blocks it; throwing or rejecting is also a veto. While a promise is pending the panel shows a spinner and ignores further toggles (single-flight).',
        },
        {
          name: 'OgeAccordionContentLoader',
          type: '() =&gt; Promise&lt;unknown&gt;',
          description:
            "Loads a panel's content the first time it expands. The resolved value reaches <code>renderContent</code> as <code>data</code>.",
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
        {
          name: 'useOgeAccordion(props)',
          type: '(props: OgeAccordionBehaviorProps) =&gt; accordion state',
          description:
            'The headless hook behind the component — descriptors, the expanded/pending/rendered sets and the expand/collapse pipelines, for a stack you render yourself.',
        },
      ],
    },
  ],
};

export const OGE_REACT_ACCORDION_ITEM_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'title',
          type: 'string',
          description:
            'Header title; alternative to a per-panel <code>renderHeader</code>.',
        },
        {
          name: 'text',
          type: 'string',
          description:
            'Plain-text panel body, rendered when there is neither <code>content</code> nor a <code>renderContent</code>. The reference <code>html</code> item field has no counterpart on purpose.',
        },
        {
          name: 'description',
          type: 'string',
          description: 'Secondary line rendered under the title.',
        },
        {
          name: 'key',
          type: 'string',
          description:
            'Stable identity used by <code>expandedKeys</code>, the handle’s targets and DOM ids.',
        },
        {
          name: 'icon',
          type: 'string',
          description:
            'SVG path data (<code>d</code>) rendered as a 24×24 aria-hidden icon before the title.',
        },
        {
          name: 'badge',
          type: 'string | number',
          description: 'Badge rendered after the title.',
        },
        {
          name: 'hint',
          type: 'string',
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
            'Expands this panel on first render — the seed only. React drives further state through the controlled <code>expandedKeys</code> / <code>selectedIndex</code> pairs or the <code>ref</code> handle, where Angular offers a per-panel <strong>two-way</strong> <code>[(expanded)]</code>.',
        },
        {
          name: 'hideToggle',
          type: 'boolean',
          description:
            "Overrides the accordion's <code>hideToggle</code> for this panel.",
        },
        {
          name: 'togglePosition',
          type: "'start' | 'end'",
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
          type: 'OgeAccordionExpandGuard',
          description:
            'Veto hook run before this panel expands or collapses; may be async (single-flight).',
        },
        {
          name: 'contentLoader',
          type: 'OgeAccordionContentLoader',
          description:
            "Loads this panel's content on first expand, with a skeleton while pending and a retry button on failure.",
        },
        {
          name: 'content',
          type: 'ReactNode',
          description:
            'Panel body — the React face of the content projected into an <code>&lt;oge-accordion-item&gt;</code>. Eager: a panel that should be lazy uses <code>renderContent</code> instead.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgeAccordionHeaderContext) =&gt; ReactNode',
          description:
            'Custom header for this panel alone — the React face of an <code>[ogeAccordionHeaderTemplate]</code> inside an <code>&lt;oge-accordion-item&gt;</code>.',
        },
        {
          name: 'renderContent',
          type: '(context: OgeAccordionContentContext) =&gt; ReactNode',
          description:
            'Lazy body for this panel alone — the React face of an inline <code>[ogeAccordionContentTemplate]</code>. Ignored when <code>content</code> is set.',
        },
        {
          name: 'renderToggleIcon',
          type: '(context: OgeAccordionToggleIconContext) =&gt; ReactNode',
          description: 'Custom chevron for this panel alone.',
        },
        {
          name: 'renderHeaderActions',
          type: '(context: OgeAccordionHeaderActionsContext) =&gt; ReactNode',
          description:
            'Actions for this panel, rendered beside the toggle button.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render-prop contexts & slots',
      entries: [
        {
          name: 'OgeAccordionHeaderContext',
          type: '{ item, index, expanded, title, description }',
          description:
            'Context handed to <code>renderHeader</code> — the React face of the <code>[ogeAccordionHeaderTemplate]</code> context.',
        },
        {
          name: 'OgeAccordionContentContext',
          type: '{ item, index, data }',
          description:
            "Context handed to <code>renderContent</code>. <code>data</code> carries the panel's <code>contentLoader</code> result.",
        },
        {
          name: 'OgeAccordionToggleIconContext',
          type: '{ expanded, index }',
          description: 'Context handed to <code>renderToggleIcon</code>.',
        },
        {
          name: 'OgeAccordionHeaderActionsContext',
          type: '{ item, index, expanded }',
          description: 'Context handed to <code>renderHeaderActions</code>.',
        },
        {
          name: '.oge-accordion-action-row',
          type: 'class name',
          description:
            'A row of buttons at the end of a panel body marked with this class becomes its action bar (divider above, actions at the inline end) — the React face of the <code>[ogeAccordionActionRow]</code> directive, which does nothing else but apply it. Inside the panel, so only reachable while expanded.',
        },
        {
          name: 'OgeAccordionItemDefinition',
          type: 'OgeAccordionItemData &amp; { content?, renderHeader?, renderContent?, renderToggleIcon?, renderHeaderActions? }',
          description:
            'One entry of the <code>items</code> prop — the shared panel data plus the React content slots.',
        },
      ],
    },
  ],
};

export const OGE_REACT_ACCORDION_CONFIG_API: ApiSections = {
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
          description: 'Default for the <code>hideToggle</code> prop.',
        },
        {
          name: 'collapsedHeaderHeight',
          type: 'string | undefined',
          description:
            'Default for the <code>collapsedHeaderHeight</code> prop.',
        },
        {
          name: 'expandedHeaderHeight',
          type: 'string | undefined',
          description:
            'Default for the <code>expandedHeaderHeight</code> prop.',
        },
      ],
    },
    {
      entries: [
        {
          name: 'OgeAccordionConfigProvider',
          type: '(props: { config?: OgeAccordionConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Wrap a subtree to change the accordion’s defaults and user-facing strings beneath it — the React counterpart of Angular’s <code>provideOgeAccordionConfig()</code>. Both shallow-merge <code>messages</code> over the same <code>@oge-ui/behavior</code> defaults, so an override reads identically in either layer.',
        },
        {
          name: 'useOgeAccordionConfig()',
          type: '() =&gt; OgeAccordionConfig',
          description:
            'Reads the resolved config of the current subtree — the counterpart of injecting <code>OGE_ACCORDION_CONFIG</code>.',
        },
        {
          name: 'OGE_DEFAULT_ACCORDION_CONFIG',
          type: 'OgeAccordionConfig',
          description:
            'The built-in defaults themselves, re-exported from <code>@oge-ui/behavior</code> so both layers start from one object.',
        },
      ],
    },
  ],
};

export const OGE_REACT_PANEL_BAR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgePanelBarItemDefinition[] | undefined',
          description:
            'The item tree. An entry with <code>children</code> is an expandable group; one with <code>content</code> (and no children) expands into free content; the rest are selectable leaves. <code>content</code> is any <code>ReactNode</code>.',
        },
        {
          name: 'expandMode',
          type: "'single' | 'multiple' | 'full'",
          default: "'multiple'",
          description:
            "Kendo's three modes: <code>multiple</code> lets groups open independently, <code>single</code> collapses a group's open siblings, <code>full</code> is single with the open root group filling the host's height (give the host one).",
        },
        {
          name: 'selectedKey',
          type: 'string | undefined',
          description:
            'The selected item (controlled, with <code>onSelectedKeyChange</code>; <code>defaultSelectedKey</code> for uncontrolled): its <code>key</code>, or its position id (<code>p0-1</code>) when it has none. Announced as <code>aria-current</code>.',
        },
        {
          name: 'expandedKeys',
          type: 'readonly string[] | undefined',
          description:
            "Ids (<code>key</code> or position id) of the expanded groups (controlled, with <code>onExpandedKeysChange</code>; <code>defaultExpandedKeys</code> for uncontrolled). Uncontrolled, the items' own <code>expanded</code> flags seed the state once.",
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disables the whole panel bar; a disabled item disables its subtree and leaves the Tab sequence.',
        },
        {
          name: 'deferRendering',
          type: 'boolean',
          default: 'true',
          description:
            "Render a group's children or content only from its first expand on (kept afterwards); <code>false</code> renders every level up front.",
        },
        {
          name: 'animation',
          type: 'boolean | number',
          default: 'true',
          description:
            'Height animation: <code>true</code> uses the default duration, a number overrides it in milliseconds, <code>false</code> disables it. Suppressed under <code>prefers-reduced-motion</code>.',
        },
        {
          name: 'keyboardNavigation',
          type: 'boolean',
          default: 'true',
          description:
            'Enables Up/Down/Home/End and Right/Left header navigation.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Accessible name of the root list.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgePanelBarHeaderContext) =&gt; ReactNode',
          description:
            'Replaces the icon / title / description / badge layout inside each header button — the counterpart of <code>[ogePanelBarHeaderTemplate]</code>. It renders inside the <code>&lt;button&gt;</code>, so no focusable controls.',
        },
        {
          name: 'renderContent',
          type: '(context: OgePanelBarContentContext) =&gt; ReactNode',
          description:
            'Renders the body of every content item, replacing its <code>content</code> — the counterpart of <code>[ogePanelBarContentTemplate]</code>.',
        },
        {
          name: 'className / style',
          type: 'string | CSSProperties',
          description:
            'Merged onto the host; the Angular host takes <code>class</code>/<code>style</code> natively.',
        },
      ],
    },
    {
      title: 'Keyboard & accessibility',
      entries: [
        {
          name: 'APG disclosure, not treeview',
          type: '—',
          description:
            'Kendo renders its PanelBar as <code>role="tree"</code>, but a tree may own nothing but tree items — and panel bar groups may hold free content. So every header is a real <code>&lt;button&gt;</code> in the Tab sequence (<code>aria-expanded</code> + <code>aria-controls</code> on groups, <code>aria-current</code> on the selected leaf), collapsed groups are <code>inert</code>, and Up/Down/Home/End plus Right/Left (expand-or-enter / collapse-or-parent, mirrored in RTL) are layered on top. Collapsing a group that holds focus hands focus to its header.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Imperative handle (via ref)',
      entries: [
        {
          name: 'isExpanded(id)',
          type: '(id: string) =&gt; boolean',
          description:
            'Whether the group with this id (<code>key</code> or position id) is expanded.',
        },
        {
          name: 'expand(id)',
          type: '(id: string) =&gt; Promise&lt;boolean&gt;',
          description:
            'Runs the expand pipeline (cancelable pre-event, then commit); resolves whether the group ended up expanded.',
        },
        {
          name: 'collapse(id)',
          type: '(id: string) =&gt; Promise&lt;boolean&gt;',
          description:
            'Runs the collapse pipeline; resolves whether the group ended up collapsed.',
        },
        {
          name: 'toggle(id)',
          type: '(id: string) =&gt; Promise&lt;boolean&gt;',
          description: 'Expands a collapsed group, collapses an expanded one.',
        },
        {
          name: 'expandAll()',
          type: '() =&gt; void',
          description:
            'Expands every enabled group. <code>multiple</code> mode only — otherwise a dev-mode warning and a no-op.',
        },
        {
          name: 'collapseAll()',
          type: '() =&gt; void',
          description: 'Collapses every expanded group.',
        },
        {
          name: 'focus(id?)',
          type: '(id?: string) =&gt; void',
          description: 'Focuses a header by id, or the first enabled one.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Callbacks',
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgePanelBarItemClickEvent&lt;OgePanelBarItemDefinition&gt;) =&gt; void',
          description: 'A header was activated — before it toggles or selects.',
        },
        {
          name: 'onItemExpanding',
          type: '(event: OgePanelBarItemExpandingEvent&lt;OgePanelBarItemDefinition&gt;) =&gt; void',
          description:
            'Cancelable pre-event of a group expanding — set <code>event.cancel = true</code> to keep it closed.',
        },
        {
          name: 'onItemCollapsing',
          type: '(event: OgePanelBarItemCollapsingEvent&lt;OgePanelBarItemDefinition&gt;) =&gt; void',
          description: 'Cancelable pre-event of a group collapsing.',
        },
        {
          name: 'onItemExpanded',
          type: '(event: OgePanelBarItemToggleEvent&lt;OgePanelBarItemDefinition&gt;) =&gt; void',
          description: 'A group expanded.',
        },
        {
          name: 'onItemCollapsed',
          type: '(event: OgePanelBarItemToggleEvent&lt;OgePanelBarItemDefinition&gt;) =&gt; void',
          description:
            'A group collapsed — also each sibling a <code>single</code> / <code>full</code> expand closed.',
        },
        {
          name: 'onSelectionChanged',
          type: '(event: OgePanelBarSelectionChangedEvent&lt;OgePanelBarItemDefinition&gt;) =&gt; void',
          description:
            'The selected item changed through a user click (<code>previousKey</code> included).',
        },
        {
          name: 'onSelectedKeyChange',
          type: '(key: string) =&gt; void',
          description:
            'The selection a click committed — the controlled half of <code>selectedKey</code>.',
        },
        {
          name: 'onExpandedKeysChange',
          type: '(keys: string[]) =&gt; void',
          description:
            'The expanded ids after a toggle — the controlled half of <code>expandedKeys</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgePanelBarItemDefinition',
          type: 'interface',
          description:
            '<code>key</code>, <code>title</code>, <code>description</code>, <code>icon</code> (SVG path data), <code>badge</code>, <code>hint</code>, <code>disabled</code>, <code>visible</code>, <code>expanded</code>, <code>selectable</code> (default: leaves only), <code>content</code> and <code>children</code>. The shared <code>OgePanelBarItem</code> with a <code>ReactNode</code> body.',
        },
        {
          name: 'OgePanelBarExpandMode',
          type: "'single' | 'multiple' | 'full'",
          description: 'Expansion vocabulary.',
        },
        {
          name: 'OgePanelBarItemClickEvent / OgePanelBarItemExpandingEvent / OgePanelBarItemCollapsingEvent / OgePanelBarItemToggleEvent / OgePanelBarSelectionChangedEvent',
          type: 'interfaces',
          description:
            'Payloads: <code>item</code>, <code>key</code>, <code>level</code> and the originating <code>event</code>; the <code>-ing</code> ones carry a mutable <code>cancel</code>, the selection one <code>previousKey</code>.',
        },
        {
          name: 'OgePanelBarProps / OgePanelBarHandle / OgePanelBarHeaderContext / OgePanelBarContentContext',
          type: 'interfaces',
          description:
            'Props, the <code>ref</code> handle and the two render-prop contexts.',
        },
      ],
    },
  ],
};

export const OGE_REACT_EXPANSION_PANEL_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'title',
          type: 'string',
          default: "''",
          description: 'Header title.',
        },
        {
          name: 'subtitle',
          type: 'string | undefined',
          description: 'Secondary line under the title.',
        },
        {
          name: 'icon',
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>) rendered as a 24×24 aria-hidden icon before the title.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Native <code>title</code> tooltip of the header button.',
        },
        {
          name: 'expanded',
          type: 'boolean',
          default: 'false',
          description:
            'Whether the body is shown (controlled, with <code>onExpandedChange</code>; <code>defaultExpanded</code> for uncontrolled). User and handle toggles run <code>onExpanding</code> / <code>onCollapsing</code> and the guard first.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Blocks toggling; the header stays visible (<code>aria-disabled</code>) but leaves the Tab sequence.',
        },
        {
          name: 'expandGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            "Veto run before every toggle — the accordion's <code>expandGuard</code>: <code>false</code>, a throw or a rejection blocks; while a promise is pending the header shows a spinner and ignores clicks.",
        },
        {
          name: 'togglePosition',
          type: "'start' | 'end'",
          default: "'end'",
          description:
            'Side of the header the chevron sits on — logical, so RTL mirrors it.',
        },
        {
          name: 'hideToggle',
          type: 'boolean | undefined',
          description:
            "Hides the chevron; falls back to the accordion config's <code>hideToggle</code>.",
        },
        {
          name: 'headingLevel',
          type: 'number',
          default: '3',
          description:
            '<code>aria-level</code> of the heading wrapping the header button (native h1–h6 where it can).',
        },
        {
          name: 'useRegionRole',
          type: 'boolean',
          default: 'true',
          description:
            'Gives the body <code>role="region"</code> (APG-optional).',
        },
        {
          name: 'animation',
          type: 'boolean | number',
          default: 'true',
          description:
            'Height animation: <code>true</code> uses the default duration, a number overrides it in milliseconds, <code>false</code> disables it. Suppressed under reduced motion.',
        },
        {
          name: 'deferRendering',
          type: 'boolean',
          default: 'true',
          description:
            'Render <code>children</code> only from the first expand on (kept afterwards).',
        },
        {
          name: 'stylingMode',
          type: "'outlined' | 'filled' | 'flat'",
          default: "'outlined'",
          description: "Visual variant — the accordion's.",
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: "Density of the header row — the accordion's.",
        },
        {
          name: 'headerActions',
          type: 'ReactNode',
          description:
            'Real buttons beside the toggle — never inside it (the counterpart of the projected <code>ogeExpansionPanelActions</code> elements).',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description: 'The panel body.',
        },
        {
          name: 'className / style',
          type: 'string | CSSProperties',
          description:
            'Merged onto the host; the Angular host takes <code>class</code>/<code>style</code> natively.',
        },
      ],
    },
    {
      title: 'Keyboard & accessibility',
      entries: [
        {
          name: 'APG disclosure',
          type: '—',
          description:
            'The title is a <code>&lt;button aria-expanded aria-controls&gt;</code> inside a heading; Enter / Space toggle it natively, the body is <code>role="region"</code> labelled by the header and <code>inert</code> while collapsed. Collapsing a panel that holds focus hands focus back to the header. The pipeline is <code>runOgeExpansionToggle</code> in <code>&#64;oge-ui/behavior</code>, shared with the panel bar.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Imperative handle (via ref)',
      entries: [
        {
          name: 'isExpanded()',
          type: '() =&gt; boolean',
          description: 'Whether the panel is expanded.',
        },
        {
          name: 'expand()',
          type: '() =&gt; Promise&lt;boolean&gt;',
          description:
            'Runs the expand pipeline; resolves whether the panel ended up expanded.',
        },
        {
          name: 'collapse()',
          type: '() =&gt; Promise&lt;boolean&gt;',
          description:
            'Runs the collapse pipeline; resolves whether the panel ended up collapsed.',
        },
        {
          name: 'toggle()',
          type: '() =&gt; Promise&lt;boolean&gt;',
          description: 'Expands a collapsed panel, collapses an expanded one.',
        },
        {
          name: 'focus()',
          type: '() =&gt; void',
          description: 'Focuses the header button.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Callbacks',
      entries: [
        {
          name: 'onExpanding',
          type: '(event: OgeExpansionPanelExpandingEvent) =&gt; void',
          description:
            'Cancelable pre-event of an expand — set <code>event.cancel = true</code> to keep the panel collapsed.',
        },
        {
          name: 'onCollapsing',
          type: '(event: OgeExpansionPanelCollapsingEvent) =&gt; void',
          description: 'Cancelable pre-event of a collapse.',
        },
        {
          name: 'onOpened',
          type: '(event: OgeExpansionPanelToggleEvent) =&gt; void',
          description: 'The panel expanded through a user or handle toggle.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeExpansionPanelToggleEvent) =&gt; void',
          description: 'The panel collapsed through a user or handle toggle.',
        },
        {
          name: 'onExpandedChange',
          type: '(expanded: boolean) =&gt; void',
          description:
            'The state a toggle committed — the controlled half of <code>expanded</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeExpansionPanelExpandingEvent / OgeExpansionPanelCollapsingEvent',
          type: '{ event?: Event; cancel: boolean }',
          description: 'Cancelable pre-event payloads.',
        },
        {
          name: 'OgeExpansionPanelToggleEvent',
          type: '{ event?: Event }',
          description: 'Payload of the past-tense events.',
        },
        {
          name: 'OgeExpansionPanelProps / OgeExpansionPanelHandle',
          type: 'interfaces',
          description: 'Props and the <code>ref</code> handle.',
        },
      ],
    },
  ],
};
