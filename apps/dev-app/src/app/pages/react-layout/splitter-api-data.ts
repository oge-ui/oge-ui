import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/splitter.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Mirrors `pages/layout/splitter-api-data.ts` block for block and group for
 * group. What differs is the idiom — a controlled/uncontrolled
 * <code>sizes</code> pair instead of a two-way model, callbacks instead of
 * outputs, a <code>ref</code> handle instead of public methods, a render prop
 * instead of a <code>TemplateRef</code>, and <code>OgeSplitterPaneItem</code>
 * objects instead of projected <code>&lt;oge-splitter-pane&gt;</code> children —
 * and that is exactly what a reader crossing the switch needs spelled out. The
 * parity gate diffs the two tables member by member.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    title: 'Panes & sizing',
    entries: [
      {
        name: 'panes',
        type: 'readonly OgeSplitterPaneItem[] | undefined',
        description:
          'The panes, in layout order — the React counterpart of the projected <code>&lt;oge-splitter-pane&gt;</code> children: every field of a pane plus its <code>content</code>.',
      },
      {
        name: 'dataSource',
        type: 'OgeSplitterDataSourceLike | undefined',
        description:
          'Remote pane list, loaded through <code>&#64;oge-ui/core</code>&rsquo;s <code>DataSource</code> contract and merged after <code>panes</code>. A source that publishes <code>changes</code> triggers a reload.',
      },
      {
        name: 'itemHoldTimeout',
        type: 'number',
        default: '750',
        description:
          'Milliseconds a pointer must rest on a pane before <code>onPaneHold</code> fires.',
      },
      {
        name: 'sizes',
        type: 'readonly OgeSplitterSize[] | undefined',
        description:
          'Current pane sizes — the controlled half of the pair, and the whole persistable state. Setting it overrides the per-pane <code>size</code> fields. Numbers are ratios; <code>&#39;240px&#39;</code> pins a pane.',
      },
      {
        name: 'defaultSizes',
        type: 'readonly OgeSplitterSize[] | undefined',
        description:
          'Initial sizes of the uncontrolled pair — the component owns them from there. Never combine with <code>sizes</code>.',
      },
      {
        name: 'renderPane',
        type: '(pane: OgeSplitterPaneItem, index: number, collapsed: boolean) =&gt; ReactNode',
        description:
          'Body of every pane that carries no <code>content</code> — the React face of <code>[ogeSplitterPaneTemplate]</code>.',
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
        type: 'Partial&lt;OgeSplitterMessages&gt;',
        description:
          'Per-instance overrides of the <code>&lt;OgeSplitterConfigProvider&gt;</code> strings, including the separators’ accessible names.',
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
          'Extra classes on the splitter element — the React host styling idiom; an Angular host takes <code>class</code> natively.',
      },
      {
        name: 'style',
        type: 'CSSProperties | undefined',
        description:
          'Inline styles on the splitter element. The splitter fills its container and has no intrinsic height, so this is usually where the height comes from.',
      },
      {
        name: 'id',
        type: 'string | undefined',
        description:
          'Id of the splitter element; the separators and panes derive their own ids independently.',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'OgeSplitterHandle (ref)',
    entries: [
      {
        name: 'collapse(target)',
        type: '(target: number | string) => boolean',
        description:
          'Collapses a pane by index or key. Returns <code>false</code> when the pane is not collapsible or <code>onPaneCollapsing</code> vetoed it.',
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
        name: 'onResizeStarted',
        type: '(event: OgeSplitterResizeStartEvent) =&gt; void',
        description:
          'Fires once when a drag or keyboard resize begins. The reference <code>onResizeStart</code>.',
      },
      {
        name: 'onResized',
        type: '(event: OgeSplitterResizeEvent) =&gt; void',
        description:
          'Fires every time the sizes change during a resize — once per pointer move. The reference <code>onResize</code>.',
      },
      {
        name: 'onResizeEnded',
        type: '(event: OgeSplitterResizeEvent) =&gt; void',
        description:
          'Fires once when the gesture finishes, after the new sizes have been published. The reference <code>onResizeEnd</code>.',
      },
      {
        name: 'onPaneCollapsing',
        type: '(event: OgeSplitterPaneCollapsingEvent) =&gt; void',
        description:
          'Cancelable pre-event of a pane collapsing — set <code>cancel = true</code> to block it.',
      },
      {
        name: 'onPaneExpanding',
        type: '(event: OgeSplitterPaneCollapsingEvent) =&gt; void',
        description: 'Cancelable pre-event of a pane expanding.',
      },
      {
        name: 'onPaneCollapsed',
        type: '(event: OgeSplitterPaneCollapsedEvent) =&gt; void',
        description: 'Fires after a pane collapsed.',
      },
      {
        name: 'onPaneExpanded',
        type: '(event: OgeSplitterPaneCollapsedEvent) =&gt; void',
        description: 'Fires after a pane expanded.',
      },
      {
        name: 'onPaneClick',
        type: '(event: OgeSplitterPaneClickEvent) =&gt; void',
        description:
          'Fires when a pane is clicked. A nested splitter reports its own panes — the event does not surface on the parent.',
      },
      {
        name: 'onPaneHold',
        type: '(event: OgeSplitterPaneHoldEvent) =&gt; void',
        description:
          'A pane was held for <code>itemHoldTimeout</code> — a touch long-press or a mouse hold.',
      },
      {
        name: 'onPaneContextMenu',
        type: '(event: OgeSplitterPaneHoldEvent) =&gt; void',
        description: 'A pane was right-clicked or long-pressed for a menu.',
      },
      {
        name: 'onSizesChange',
        type: '(sizes: readonly OgeSplitterSize[]) =&gt; void',
        description:
          'The controlled half of <code>sizes</code>; Angular’s <code>[(sizes)]</code> model is both halves at once. Persist the array here.',
      },
    ],
  },
];

export const OGE_REACT_SPLITTER_API: ApiSections = {
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
          name: 'OgeSplitterPaneItem',
          type: 'interface',
          description:
            'One pane of the <code>panes</code> prop — every field of <code>OgeSplitterPaneData</code> (<code>key</code>, <code>size</code>, <code>minSize</code>, <code>maxSize</code>, <code>collapsible</code>, <code>collapsed</code>, <code>collapsedSize</code>, <code>resizable</code>, <code>scrollable</code>, <code>disabled</code>, <code>visible</code>, <code>text</code>, <code>cssClass</code>, <code>htmlAttributes</code>, <code>orientation</code>) plus <code>content</code> and a nested <code>panes</code> array of the same shape.',
        },
        {
          name: 'OgeSplitterHandle',
          type: 'interface',
          description:
            'The <code>ref</code> handle: <code>collapse</code>, <code>expand</code>, <code>toggle</code>, <code>isCollapsed</code>, <code>resize</code>, <code>focus</code> — the React face of the Angular public methods.',
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
            'Payload of <code>onPaneHold</code> and <code>onPaneContextMenu</code>: <code>index</code>, <code>key?</code>, <code>item?</code>, <code>event</code>.',
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

/**
 * The React face of `<oge-splitter-pane>`: React has no child component to
 * project, so a pane is an object in the `panes` prop — the same fields, plus
 * `content` and a nested `panes` array.
 */
export const OGE_REACT_SPLITTER_PANE_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity used by DOM ids and by the handle’s string targets.',
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
            'Collapsed state. Writing it runs the splitter’s pipeline, so a vetoed change is reverted — the React face of Angular’s <code>[(collapsed)]</code> model, whose other half is <code>onPaneCollapsed</code> / <code>onPaneExpanded</code>.',
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
            'Plain-text body, rendered when the pane has neither <code>content</code> nor a <code>renderPane</code>.',
        },
        {
          name: 'htmlAttributes',
          type: 'Readonly&lt;Record&lt;string, string&gt;&gt; | undefined',
          description:
            'Extra attributes on the pane element. Keys removed from the bag are removed from the DOM, so clearing it clears the element.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          description: 'Extra class on the pane element.',
        },
        {
          name: 'content',
          type: 'ReactNode',
          description:
            'Pane body — the React counterpart of the content projected into an <code>&lt;oge-splitter-pane&gt;</code>. Takes precedence over <code>renderPane</code> and <code>text</code>.',
        },
        {
          name: 'panes',
          type: 'readonly OgeSplitterPaneItem[] | undefined',
          description:
            'Nested splitter inside this pane, rendered on the opposite axis by default — the data form of an <code>&lt;OgeSplitter&gt;</code> placed in <code>content</code>.',
        },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          description: 'Axis of the nested splitter, when this pane has one.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderPane',
          type: '(pane, index, collapsed) =&gt; ReactNode',
          description:
            'The splitter-level renderer for panes with no <code>content</code> — the React replacement for the <code>[ogeSplitterPaneTemplate]</code> structural directive. Documented as a prop of <code>&lt;OgeSplitter&gt;</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SPLITTER_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'OgeSplitterConfigProvider',
          type: '(props: { config?: OgeSplitterConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Wrap a subtree to change the splitter defaults and user-facing strings beneath it — the React counterpart of Angular’s <code>provideOgeSplitterConfig()</code>. Both shallow-merge <code>messages</code> over the same <code>&#64;oge-ui/behavior</code> defaults, so an override reads identically in either layer.',
        },
        {
          name: 'useOgeSplitterConfig()',
          type: '() =&gt; OgeSplitterConfig',
          description:
            'Reads the resolved config of the current subtree — how a splitter of your own picks up the same defaults.',
        },
      ],
    },
  ],
  properties: [
    {
      title: 'OgeSplitterConfig',
      entries: [
        {
          name: 'separatorSize',
          type: 'number | undefined',
          default: '6',
          description: 'Default for the <code>separatorSize</code> prop.',
        },
        {
          name: 'step',
          type: 'number | undefined',
          default: '5',
          description: 'Default for the <code>step</code> prop.',
        },
        {
          name: 'showCollapseGrips',
          type: 'boolean | undefined',
          default: 'true',
          description: 'Default for the <code>showCollapseGrips</code> prop.',
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
            'Shape the provider publishes: <code>messages</code> plus the optional prop defaults.',
        },
        {
          name: 'OgeSplitterConfigInput',
          type: 'interface',
          description:
            'The provider’s <code>config</code> prop — every field optional, <code>messages</code> partial.',
        },
        {
          name: 'OgeSplitterMessages',
          type: 'interface',
          description:
            'Every user-facing string in the splitter, including the separators’ accessible names.',
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
