import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/{chip,chip-list}.tsx —
 * keep in sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/chip-api-data.ts` (the parity gate
 * diffs the two member by member): the same props, `onX` callbacks for the
 * outputs, the controlled/uncontrolled pairs for the two-way models, and
 * `renderChip` for the `[ogeChipTemplate]` directive.
 */

const STYLE_ROWS = [
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    default: "config ?? 'md'",
    description: 'Density preset — 24 / 28 / 34 px tall.',
  },
  {
    name: 'stylingMode',
    type: "'filled' | 'outlined'",
    default: "config ?? 'filled'",
    description:
      '<code>filled</code> is the tinted surface, <code>outlined</code> a hairline frame on a transparent background.',
  },
];

const HOST_ROWS = [
  {
    name: 'className',
    type: 'string',
    description: 'Extra classes on the host element.',
  },
  {
    name: 'style',
    type: 'CSSProperties',
    description: 'Inline styles on the host element.',
  },
];

export const OGE_REACT_CHIP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Visible text and accessible name.',
        },
        {
          name: 'icon',
          type: 'string',
          description:
            'SVG path data (<code>d</code>, 24×24 viewBox) of a leading <code>aria-hidden</code> icon.',
        },
        {
          name: 'avatar',
          type: 'OgeChipAvatar',
          description:
            'A small leading avatar — the image, else the initials, else a person glyph. Always <code>aria-hidden</code>. Wins over <code>icon</code>.',
        },
        {
          name: 'selectable',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the chip as a toggle <code>&lt;button aria-pressed&gt;</code> with a check glyph for the pressed state.',
        },
        {
          name: 'selected',
          type: 'boolean',
          description:
            'Pressed state (controlled); <code>defaultSelected</code> is the uncontrolled initial value.',
        },
        {
          name: 'defaultSelected',
          type: 'boolean',
          default: 'false',
          description: 'Initial pressed state when uncontrolled.',
        },
        {
          name: 'removable',
          type: 'boolean',
          default: 'false',
          description:
            'Adds a separate, real remove button named by the <code>remove</code> message (&ldquo;Remove {label}&rdquo;); Delete / Backspace on a selectable chip&rsquo;s toggle remove too. 24px target, 44px on coarse pointers.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the toggle and the remove button.',
        },
        ...STYLE_ROWS,
        {
          name: 'severity',
          type: "'neutral' | 'accent' | 'success' | 'warning' | 'danger'",
          description: 'Colour; <code>undefined</code> is the neutral chip.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name of the toggle when the label is not enough; also names the remove button.',
        },
        ...HOST_ROWS,
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeChipHandle)',
      entries: [
        {
          name: 'focus()',
          type: '() => void',
          description: 'Focuses the toggle button, else the remove button.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onSelectedChange',
          type: '(selected: boolean) => void',
          description: 'The pressed state a toggle committed.',
        },
        {
          name: 'onRemoved',
          type: '(event: OgeChipRemovedEvent) => void',
          description:
            'The remove button (or Delete / Backspace) was pressed — hide the chip.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeChipProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeChip&gt;</code>.',
        },
        {
          name: 'OgeChipHandle',
          type: '{ focus(): void }',
          description: 'The ref handle.',
        },
        {
          name: 'OgeChipAvatar',
          type: '{ src?: string; name?: string; initials?: string }',
          description: 'Leading avatar data of a chip.',
        },
        {
          name: 'OgeChipRemovedEvent',
          type: '{ event?: Event }',
          description: 'Payload of <code>onRemoved</code>.',
        },
        {
          name: 'OgeChipSeverity',
          type: "'neutral' | 'accent' | 'success' | 'warning' | 'danger'",
          description: 'Chip colour vocabulary.',
        },
        {
          name: 'OgeChipSize',
          type: "'sm' | 'md' | 'lg'",
          description: 'Density presets.',
        },
        {
          name: 'OgeChipStylingMode',
          type: "'filled' | 'outlined'",
          description: 'Surface presets.',
        },
      ],
    },
  ],
};

export const OGE_REACT_CHIP_LIST_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeChipItem[]',
          default: '[]',
          description:
            'The chips, in order. <code>key</code> identifies a chip in every event; the list moves no data.',
        },
        {
          name: 'selectionMode',
          type: "'none' | 'single' | 'multiple'",
          default: "'none'",
          description:
            'Selection turns the list into a WAI-ARIA APG <strong>listbox</strong>; with <code>none</code>, removable chips form an APG layout <strong>grid</strong> and static chips a plain <strong>list</strong> (<code>ogeChipListRole</code>). A second press clears a <code>single</code> selection.',
        },
        {
          name: 'selectedKeys',
          type: 'readonly OgeChipKey[]',
          description:
            'Keys of the selected chips (controlled); <code>defaultSelectedKeys</code> is the uncontrolled initial value.',
        },
        {
          name: 'defaultSelectedKeys',
          type: 'readonly OgeChipKey[]',
          default: '[]',
          description: 'Initial selection when uncontrolled.',
        },
        {
          name: 'removable',
          type: 'boolean',
          default: 'false',
          description:
            'Default removability of every chip (<code>OgeChipItem.removable</code> overrides it). In a listbox the ✕ is <code>aria-hidden</code> and Delete / Backspace is the keyboard path; in a grid it is a real button.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disables every chip (<code>aria-disabled</code>): nothing toggles, nothing is removed.',
        },
        ...STYLE_ROWS,
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name; a listbox or grid falls back to the <code>chipList</code> message.',
        },
        {
          name: 'renderChip',
          type: '(context: OgeChipRenderContext) => ReactNode',
          description:
            'Replaces every chip&rsquo;s label — the Angular <code>[ogeChipTemplate]</code>. Keep it non-interactive.',
        },
        ...HOST_ROWS,
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeChipListHandle)',
      entries: [
        {
          name: 'focus(index?)',
          type: '(index?: number) => void',
          description:
            'Focuses the chip at <code>index</code> (default: the roving tab stop).',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onSelectedKeysChange',
          type: '(keys: OgeChipKey[]) => void',
          description: 'The committed selection.',
        },
        {
          name: 'onSelectionChanged',
          type: '(event: OgeChipSelectionChangedEvent) => void',
          description:
            'A click, Space or Enter changed the selection: next and previous keys, the toggled item and index.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeChipItemClickEvent) => void',
          description: 'A chip was clicked or activated with Enter / Space.',
        },
        {
          name: 'onItemRemoving',
          type: '(event: OgeChipItemRemovingEvent) => void',
          description:
            'Cancelable: a chip is about to be removed. Set <code>cancel</code> to keep it.',
        },
        {
          name: 'onItemRemoved',
          type: '(event: OgeChipItemRemovedEvent) => void',
          description:
            'Drop the chip from <code>items</code> now; focus moves to its neighbour (Delete: next, Backspace: previous).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeChipListProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeChipList&gt;</code>.',
        },
        {
          name: 'OgeChipListHandle',
          type: '{ focus(index?: number): void }',
          description: 'The ref handle.',
        },
        {
          name: 'OgeChipRenderContext',
          type: '{ item; index; selected; removable; disabled }',
          description: 'Argument of <code>renderChip</code>.',
        },
        {
          name: 'OgeChipItem',
          type: '{ key; label; icon?; avatar?; disabled?; removable?; severity? }',
          description: 'One chip.',
        },
        {
          name: 'OgeChipKey',
          type: 'string | number',
          description: 'Identity of a chip.',
        },
        {
          name: 'OgeChipSelectionMode',
          type: "'none' | 'single' | 'multiple'",
          description: 'Selection vocabulary.',
        },
        {
          name: 'OgeChipSelectionChangedEvent',
          type: '{ selectedKeys; previousKeys; item; index; event? }',
          description: 'Payload of <code>onSelectionChanged</code>.',
        },
        {
          name: 'OgeChipItemClickEvent',
          type: '{ item; index; event }',
          description: 'Payload of <code>onItemClick</code>.',
        },
        {
          name: 'OgeChipItemRemovingEvent',
          type: '{ item; index; event?; cancel: boolean }',
          description: 'Payload of <code>onItemRemoving</code>.',
        },
        {
          name: 'OgeChipItemRemovedEvent',
          type: '{ item; index; event? }',
          description: 'Payload of <code>onItemRemoved</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_CHIP_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeChipConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeChipMessages',
          description:
            'Every user-facing string: <code>remove</code> (default <code>Remove {label}</code>) and <code>chipList</code> (default <code>Chips</code>). Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.chip</code>).',
        },
        {
          name: 'size / stylingMode',
          type: '—',
          description:
            'Defaults for the matching props of both components. <code>useOgeChipConfig()</code> reads the resolved value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeChipConfigProvider',
          type: '({ config?, children }) => JSX.Element',
          description: 'Subtree-scoped defaults.',
        },
        {
          name: 'useOgeChipConfig',
          type: '() => OgeChipConfig',
          description: 'Reads the resolved config.',
        },
        {
          name: 'OGE_DEFAULT_CHIP_CONFIG',
          type: 'OgeChipConfig',
          description: 'The defaults.',
        },
        {
          name: 'OGE_DEFAULT_CHIP_MESSAGES',
          type: 'OgeChipMessages',
          description: 'The English catalog.',
        },
        {
          name: 'OgeChipConfig',
          type: '{ messages: OgeChipMessages; size?; stylingMode? }',
          description: 'Resolved config shape.',
        },
        {
          name: 'OgeChipConfigInput',
          type: 'Partial<OgeChipConfig> with partial messages',
          description: 'What the provider accepts.',
        },
        {
          name: 'OgeChipMessages',
          type: '{ remove: string; chipList: string }',
          description: 'The chip catalog.',
        },
      ],
    },
  ],
};
