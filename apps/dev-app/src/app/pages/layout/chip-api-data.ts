import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/chip/src/** and the shared core
 * (packages/behavior/src/lib/layout/chip-core.ts) — keep in sync with the
 * source TSDoc when the public API changes.
 */

const SIZE_ROWS = [
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg' | undefined",
    default: "config ?? 'md'",
    description: 'Density preset — 24 / 28 / 34 px tall.',
  },
  {
    name: 'stylingMode',
    type: "'filled' | 'outlined' | undefined",
    default: "config ?? 'filled'",
    description:
      '<code>filled</code> is the tinted surface, <code>outlined</code> a hairline frame on a transparent background.',
  },
];

export const OGE_CHIP_API: ApiSections = {
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
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>, 24×24 viewBox) of a leading <code>aria-hidden</code> icon.',
        },
        {
          name: 'avatar',
          type: 'OgeChipAvatar | undefined',
          description:
            'A small leading avatar — the image, else the initials (from <code>initials</code> or <code>name</code>), else a person glyph. Always <code>aria-hidden</code>: the label is the name. Wins over <code>icon</code>.',
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
          type: 'boolean (model)',
          default: 'false',
          description:
            'Pressed state of a <code>selectable</code> chip — two-way <code>[(selected)]</code>.',
        },
        {
          name: 'removable',
          type: 'boolean',
          default: 'false',
          description:
            'Adds a separate, real remove button named by the <code>remove</code> message (&ldquo;Remove {label}&rdquo;); Delete / Backspace on a selectable chip&rsquo;s toggle remove too (<code>aria-keyshortcuts</code>). 24px target, 44px on coarse pointers.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the toggle and the remove button.',
        },
        ...SIZE_ROWS,
        {
          name: 'severity',
          type: "'neutral' | 'accent' | 'success' | 'warning' | 'danger' | undefined",
          description: 'Colour; <code>undefined</code> is the neutral chip.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the toggle when the label is not enough; also names the remove button. A static chip is plain text, so its name is always the label.',
        },
      ],
    },
  ],
  methods: [
    {
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
          name: 'selectedChange',
          type: 'boolean',
          description: 'The banana half of <code>[(selected)]</code>.',
        },
        {
          name: 'removed',
          type: 'OgeChipRemovedEvent',
          description:
            'The remove button (or Delete / Backspace) was pressed — hide the chip. The chip moves no data.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeChipAvatar',
          type: '{ src?: string; name?: string; initials?: string }',
          description: 'Leading avatar data of a chip.',
        },
        {
          name: 'OgeChipRemovedEvent',
          type: '{ event?: Event }',
          description: 'Payload of <code>removed</code>.',
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

export const OGE_CHIP_LIST_API: ApiSections = {
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
            'Selection turns the list into a WAI-ARIA APG <strong>listbox</strong> (options with <code>aria-selected</code>, <code>aria-multiselectable</code> for <code>multiple</code>). With <code>none</code>, removable chips form an APG layout <strong>grid</strong> and static chips a plain <strong>list</strong> (<code>ogeChipListRole</code>). A second press clears a <code>single</code> selection.',
        },
        {
          name: 'selectedKeys',
          type: 'readonly OgeChipKey[] (model)',
          default: '[]',
          description: 'Keys of the selected chips — two-way.',
        },
        {
          name: 'removable',
          type: 'boolean',
          default: 'false',
          description:
            'Default removability of every chip (<code>OgeChipItem.removable</code> overrides it). In a listbox the ✕ is an <code>aria-hidden</code> glyph and Delete / Backspace (<code>aria-keyshortcuts</code>) is the keyboard path; in a grid it is a real button in its own cell.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disables every chip (<code>aria-disabled</code>): nothing toggles, nothing is removed.',
        },
        ...SIZE_ROWS,
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name; a listbox or grid falls back to the <code>chipList</code> message, a static list stays unnamed.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus(index?)',
          type: '(index?: number) => void',
          description:
            'Focuses the chip at <code>index</code> (default: the roving tab stop). A static list ignores it.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'selectedKeysChange',
          type: 'OgeChipKey[]',
          description: 'The banana half of <code>[(selectedKeys)]</code>.',
        },
        {
          name: 'selectionChanged',
          type: 'OgeChipSelectionChangedEvent',
          description:
            'A click, Space or Enter changed the selection: <code>selectedKeys</code>, <code>previousKeys</code>, the toggled <code>item</code> and <code>index</code>.',
        },
        {
          name: 'itemClick',
          type: 'OgeChipItemClickEvent',
          description: 'A chip was clicked or activated with Enter / Space.',
        },
        {
          name: 'itemRemoving',
          type: 'OgeChipItemRemovingEvent',
          description:
            'Cancelable: a chip is about to be removed (✕ press, Delete or Backspace). Set <code>cancel</code> to keep it.',
        },
        {
          name: 'itemRemoved',
          type: 'OgeChipItemRemovedEvent',
          description:
            'Drop the chip from <code>items</code> now. Focus then moves to the chip that took its place (Delete) or the previous one (Backspace); when the last chip goes, focus stays where the app puts it.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeChipItem',
          type: '{ key; label; icon?; avatar?; disabled?; removable?; severity? }',
          description:
            'One chip. <code>disabled</code> chips are skipped by the arrows; <code>removable</code> overrides the list.',
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
          name: 'OgeChipTemplate',
          type: 'directive [ogeChipTemplate]',
          description:
            'Replaces the label of every chip; the list keeps role, focus, check glyph and remove affordance. Context: <code>OgeChipTemplateContext</code>.',
        },
        {
          name: 'OgeChipTemplateContext',
          type: '{ $implicit: OgeChipItem; index; selected; removable; disabled }',
          description: 'Context of <code>[ogeChipTemplate]</code>.',
        },
        {
          name: 'OgeChipSelectionChangedEvent',
          type: '{ selectedKeys; previousKeys; item; index; event? }',
          description: 'Payload of <code>selectionChanged</code>.',
        },
        {
          name: 'OgeChipItemClickEvent',
          type: '{ item; index; event }',
          description: 'Payload of <code>itemClick</code>.',
        },
        {
          name: 'OgeChipItemRemovingEvent',
          type: '{ item; index; event?; cancel: boolean }',
          description: 'Payload of <code>itemRemoving</code>.',
        },
        {
          name: 'OgeChipItemRemovedEvent',
          type: '{ item; index; event? }',
          description: 'Payload of <code>itemRemoved</code>.',
        },
      ],
    },
  ],
};

export const OGE_CHIP_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeChipConfig()',
      entries: [
        {
          name: 'messages',
          type: 'OgeChipMessages',
          description:
            'Every user-facing string: <code>remove</code> — the remove button&rsquo;s name with a <code>{label}</code> placeholder (default <code>Remove {label}</code>) — and <code>chipList</code>, the list&rsquo;s fallback name (default <code>Chips</code>). Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.chip</code>).',
        },
        {
          name: 'size / stylingMode',
          type: '—',
          description:
            'Defaults for the matching inputs of both components. Pass a function for a live config.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'provideOgeChipConfig',
          type: '(config: OgeChipConfigInput | (() => OgeChipConfigInput)) => Provider',
          description:
            'Application- or component-scoped defaults; a function makes the config live.',
        },
        {
          name: 'OGE_CHIP_CONFIG',
          type: 'InjectionToken<OgeChipConfig>',
          description: 'The resolved config both components inject.',
        },
        {
          name: 'OGE_DEFAULT_CHIP_CONFIG',
          type: 'OgeChipConfig',
          description: 'The defaults (from <code>&#64;oge-ui/behavior</code>).',
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
