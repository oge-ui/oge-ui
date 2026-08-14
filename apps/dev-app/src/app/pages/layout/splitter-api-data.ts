import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/src/lib/splitter/** — keep in sync with
 * the source TSDoc when the public API changes.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Panes & sizing',
    entries: [
      {
        name: 'panes',
        type: 'readonly OgeSplitterPaneData[] | undefined',
        description:
          'Data-driven panes rendered after the projected <code>&lt;oge-splitter-pane&gt;</code> children.',
      },
      {
        name: 'dataSource',
        type: 'DataSource<OgeSplitterPaneData> | undefined',
        description:
          'Remote pane list, loaded through <code>&#64;oge-ui/core</code>&rsquo;s <code>DataSource</code> contract and merged after <code>panes</code>. A source that publishes <code>changes</code> triggers a reload.',
      },
      {
        name: 'itemHoldTimeout',
        type: 'number',
        default: '750',
        description:
          'Milliseconds a pointer must rest on a pane before <code>paneHold</code> fires.',
      },
      {
        name: 'sizes',
        type: 'readonly OgeSplitterSize[] | undefined',
        description:
          'Current pane sizes — two-way, and the whole persistable state. Setting it overrides the per-pane <code>size</code> inputs. Numbers are ratios; <code>&#39;240px&#39;</code> pins a pane.',
      },
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description:
          'Axis the panes are laid out along. Also drives which arrow keys move a separator.',
      },
      {
        name: 'separatorSize',
        type: 'number',
        default: '6',
        description:
          'Thickness of each separator in pixels — a real grid track, so it never eats into a pane.',
      },
    ],
  },
  {
    title: 'Interaction',
    entries: [
      {
        name: 'resizable',
        type: 'boolean',
        default: 'true',
        description: 'Pins every separator when <code>false</code>.',
      },
      {
        name: 'step',
        type: 'number',
        default: '5',
        description: 'Share points one arrow-key press moves a separator.',
      },
      {
        name: 'keyboardNavigation',
        type: 'boolean',
        default: 'true',
        description:
          'Enables Arrow / Home / End / Enter / Ctrl+Arrow on the separators. While off they also leave the Tab sequence.',
      },
      {
        name: 'showCollapseGrips',
        type: 'boolean',
        default: 'true',
        description:
          'Renders an <code>aria-hidden</code> chevron on the separator for each collapsible neighbour — one for the pane before it, one for the pane after. The keyboard paths (Enter, Ctrl+Arrow) stay available either way.',
      },
      {
        name: 'disabled',
        type: 'boolean',
        default: 'false',
        description:
          'Disables the whole splitter — no dragging, no keyboard, no collapsing.',
      },
    ],
  },
  {
    title: 'Accessibility & text',
    entries: [
      {
        name: 'ariaLabel',
        type: 'string | undefined',
        description: 'Accessible name of the splitter container.',
      },
      {
        name: 'messages',
        type: 'Partial<OgeSplitterMessages>',
        default: '{}',
        description:
          'Per-instance overrides of the config strings, including the separators’ accessible names.',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'collapse(target)',
        type: '(target: number | string) => boolean',
        description:
          'Collapses a pane by index or key. Returns <code>false</code> when the pane is not collapsible or <code>paneCollapsing</code> vetoed it.',
      },
      {
        name: 'expand(target)',
        type: '(target: number | string) => boolean',
        description:
          'Expands a collapsed pane, restoring the size it had when it collapsed and scaling its siblings back down to fit.',
      },
      {
        name: 'toggle(target)',
        type: '(target: number | string) => boolean',
        description: 'Collapses the pane if expanded, expands it otherwise.',
      },
      {
        name: 'isCollapsed(target)',
        type: '(target: number | string) => boolean',
        description: 'Whether a pane is currently collapsed.',
      },
      {
        name: 'resize(separatorIndex, delta)',
        type: '(separatorIndex: number, delta: number) => boolean',
        description:
          'Moves a separator by <code>delta</code> share points — the programmatic equivalent of an arrow key. <code>false</code> when that separator cannot move.',
      },
      {
        name: 'focus(separatorIndex?)',
        type: '(separatorIndex?: number) => void',
        description: 'Focuses a separator, the first one by default.',
      },
    ],
  },
];

const EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'resizeStarted',
        type: 'OgeSplitterResizeStartEvent',
        description:
          'Emitted once when a drag or keyboard resize begins. The reference <code>onResizeStart</code>.',
      },
      {
        name: 'resized',
        type: 'OgeSplitterResizeEvent',
        description:
          'Emitted every time the sizes change during a resize — once per pointer move. The reference <code>onResize</code>.',
      },
      {
        name: 'resizeEnded',
        type: 'OgeSplitterResizeEvent',
        description:
          'Emitted once when the gesture finishes, after the sizes model has been published. The reference <code>onResizeEnd</code>.',
      },
      {
        name: 'paneCollapsing',
        type: 'OgeSplitterPaneCollapsingEvent',
        description:
          'Cancelable pre-event of a pane collapsing — set <code>cancel = true</code> to block it.',
      },
      {
        name: 'paneExpanding',
        type: 'OgeSplitterPaneCollapsingEvent',
        description: 'Cancelable pre-event of a pane expanding.',
      },
      {
        name: 'paneCollapsed',
        type: 'OgeSplitterPaneCollapsedEvent',
        description: 'Emitted after a pane collapsed.',
      },
      {
        name: 'paneExpanded',
        type: 'OgeSplitterPaneCollapsedEvent',
        description: 'Emitted after a pane expanded.',
      },
      {
        name: 'paneClick',
        type: 'OgeSplitterPaneClickEvent',
        description:
          'Emitted when a pane is clicked. A nested splitter reports its own panes — the event does not surface on the parent.',
      },
      {
        name: 'paneHold',
        type: 'OgeSplitterPaneHoldEvent',
        description:
          'A pane was held for <code>itemHoldTimeout</code> — a touch long-press or a mouse hold.',
      },
      {
        name: 'paneContextMenu',
        type: 'OgeSplitterPaneHoldEvent',
        description: 'A pane was right-clicked or long-pressed for a menu.',
      },
      {
        name: 'sizesChange',
        type: 'readonly OgeSplitterSize[] | undefined',
        description: 'Two-way model output of <code>sizes</code>.',
      },
    ],
  },
];

export const OGE_SPLITTER_API: ApiSections = {
  properties: PROPERTY_GROUPS,
  methods: METHOD_GROUPS,
  events: EVENT_GROUPS,
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeSplitterOrientation',
          type: "'horizontal' | 'vertical'",
          description: 'Axis the panes are laid out along.',
        },
        {
          name: 'OgeSplitterGripSide',
          type: "'start' | 'end'",
          description:
            "Which neighbour a separator's collapse grip acts on: <code>'start'</code> is the pane before it (the APG primary pane), <code>'end'</code> the one after.",
        },
        {
          name: 'OgeSplitterSize',
          type: 'number | string',
          description:
            'A number (or <code>&#39;&lt;n&gt;%&#39;</code>) is a <strong>ratio</strong> of the space the flexible panes share, so <code>[30, 30]</code> lays out like <code>[50, 50]</code>. <code>&#39;&lt;n&gt;px&#39;</code> pins the pane to a fixed track. Any other string is ignored with a dev-mode warning.',
        },
        {
          name: 'OgeSplitterPaneData',
          type: 'interface',
          description:
            'Data-driven counterpart of a declarative pane: <code>key</code>, <code>size</code>, <code>minSize</code>, <code>maxSize</code>, <code>collapsible</code>, <code>collapsed</code>, <code>collapsedSize</code>, <code>resizable</code>, <code>scrollable</code>, <code>disabled</code>, <code>visible</code>, <code>text</code>, <code>cssClass</code>, <code>htmlAttributes</code>, <code>panes</code>, <code>orientation</code>.',
        },
        {
          name: 'OgeSplitterPaneTemplateContext',
          type: 'interface',
          description:
            'Context of <code>[ogeSplitterPaneTemplate]</code>: <code>$implicit</code> (the pane entry), <code>index</code>, <code>collapsed</code>.',
        },
        {
          name: 'OgeSplitterResizeStartEvent',
          type: 'interface',
          description:
            '<code>separatorIndex</code>, <code>sizes</code> at the start of the gesture, and the originating <code>event</code> (absent for a keyboard resize).',
        },
        {
          name: 'OgeSplitterResizeEvent',
          type: 'interface',
          description:
            '<code>separatorIndex</code>, current <code>sizes</code>, <code>previousSizes</code> from the start of the gesture, and the originating <code>event</code>.',
        },
        {
          name: 'OgeSplitterPaneCollapsingEvent',
          type: 'interface',
          description:
            '<code>index</code>, <code>key</code>, <code>item</code>, <code>event</code>, and a mutable <code>cancel</code> flag.',
        },
        {
          name: 'OgeSplitterPaneCollapsedEvent',
          type: 'interface',
          description:
            '<code>index</code>, <code>key</code>, <code>item</code>, <code>event</code>.',
        },
        {
          name: 'OgeSplitterPaneHoldEvent',
          type: 'interface',
          description:
            'Payload of <code>paneHold</code> and <code>paneContextMenu</code>: <code>index</code>, <code>key?</code>, <code>item?</code>, <code>event</code>.',
        },
        {
          name: 'OgeSplitterPaneClickEvent',
          type: 'interface',
          description:
            '<code>index</code>, <code>key</code>, <code>item</code> and the originating <code>event</code>.',
        },
      ],
    },
  ],
};

export const OGE_SPLITTER_PANE_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity used by DOM ids and by the collapse API’s string targets.',
        },
        {
          name: 'size',
          type: 'OgeSplitterSize | undefined',
          description:
            'Initial size — a ratio number, <code>&#39;40%&#39;</code> or <code>&#39;240px&#39;</code>. Panes without one split whatever the sized ones leave.',
        },
        {
          name: 'minSize',
          type: 'OgeSplitterSize | undefined',
          description:
            'Smallest size a resize may leave this pane at. A pixel value also becomes the grid track’s floor.',
        },
        {
          name: 'maxSize',
          type: 'OgeSplitterSize | undefined',
          description: 'Largest size a resize may grow this pane to.',
        },
        {
          name: 'collapsible',
          type: 'boolean',
          default: 'false',
          description:
            'Allows the pane to be collapsed from its separator — Enter, the grip, or a double click.',
        },
        {
          name: 'collapsed',
          type: 'boolean',
          default: 'false',
          description:
            'Collapsed state — two-way. Writes run the splitter’s pipeline, so a vetoed change reverts the binding.',
        },
        {
          name: 'collapsedSize',
          type: 'OgeSplitterSize | undefined',
          default: '0',
          description: 'Size the pane keeps while collapsed.',
        },
        {
          name: 'resizable',
          type: 'boolean',
          default: 'true',
          description:
            'Pins the pane — both of its separators refuse to drag and report <code>aria-disabled</code>.',
        },
        {
          name: 'scrollable',
          type: 'boolean',
          default: 'true',
          description:
            'Clips overflowing content instead of scrolling it when <code>false</code>.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disabled panes cannot be collapsed and their separators are inert.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description: 'Removes the pane entirely when <code>false</code>.',
        },
        {
          name: 'text',
          type: 'string | undefined',
          description:
            'Plain-text body, rendered when the pane has no projected content.',
        },
        {
          name: 'htmlAttributes',
          type: 'Readonly<Record<string, string>> | undefined',
          description:
            'Extra attributes on the pane element. Keys removed from the bag are removed from the DOM, so clearing it clears the element.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          description: 'Extra class on the pane element.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'collapse()',
          type: '() => void',
          description:
            'Collapses this pane, subject to the splitter’s pipeline.',
        },
        {
          name: 'expand()',
          type: '() => void',
          description: 'Expands this pane, subject to the splitter’s pipeline.',
        },
        {
          name: 'toggle()',
          type: '() => void',
          description: 'Collapses the pane if expanded, expands it otherwise.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'collapsedChange',
          type: 'boolean',
          description: 'Two-way model output of <code>collapsed</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Directives',
      entries: [
        {
          name: 'OgeSplitterPaneTemplate',
          type: '[ogeSplitterPaneTemplate]',
          description:
            'Structural directive rendering the body of every data-driven <code>panes</code> entry. Declarative children use their projected content instead.',
        },
      ],
    },
  ],
};

export const OGE_SPLITTER_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'provideOgeSplitterConfig(config)',
          type: '(config: OgeSplitterConfigInput) => Provider',
          description:
            'Application- or component-scoped defaults. <code>messages</code> is shallow-merged over the built-in strings.',
        },
        {
          name: 'separatorSize',
          type: 'number | undefined',
          default: '6',
          description: 'Default for the <code>separatorSize</code> input.',
        },
        {
          name: 'step',
          type: 'number | undefined',
          default: '5',
          description: 'Default for the <code>step</code> input.',
        },
        {
          name: 'showCollapseGrips',
          type: 'boolean | undefined',
          default: 'true',
          description: 'Default for the <code>showCollapseGrips</code> input.',
        },
        {
          name: 'messages',
          type: 'OgeSplitterMessages',
          description:
            'Every user-facing string: <code>separator</code> (with <code>{{first}}</code> / <code>{{second}}</code> placeholders), <code>collapsed</code>, <code>collapsePane</code>, <code>expandPane</code>, <code>noData</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeSplitterConfig',
          type: 'interface',
          description:
            'Shape held by <code>OGE_SPLITTER_CONFIG</code>: <code>messages</code> plus the optional input defaults.',
        },
        {
          name: 'OgeSplitterConfigInput',
          type: 'interface',
          description:
            'Argument of <code>provideOgeSplitterConfig()</code> — every field optional, <code>messages</code> partial.',
        },
        {
          name: 'OgeSplitterMessages',
          type: 'interface',
          description:
            'Every user-facing string in the splitter, including the separators’ accessible names.',
        },
        {
          name: 'OGE_SPLITTER_CONFIG',
          type: 'InjectionToken<OgeSplitterConfig>',
          description:
            'The token itself — inject it to read the effective defaults.',
        },
        {
          name: 'OGE_DEFAULT_SPLITTER_CONFIG',
          type: 'OgeSplitterConfig',
          description: 'The built-in defaults, exported for composition.',
        },
        {
          name: 'OGE_DEFAULT_SPLITTER_MESSAGES',
          type: 'OgeSplitterMessages',
          description: 'The built-in English strings.',
        },
      ],
    },
  ],
};
