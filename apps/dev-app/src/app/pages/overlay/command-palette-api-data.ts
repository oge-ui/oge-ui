import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/overlay/src/lib/command-palette/** and
 * packages/behavior/src/lib/overlay/command-palette-core.ts — keep in sync
 * with the source TSDoc when the public API changes.
 */

export const COMMAND_FIELDS =
  '<code>id</code>, <code>label</code>, <code>group?</code> (the heading it is listed under), <code>keywords?</code> (extra words that find it), <code>description?</code>, <code>shortcut?</code> (shown as a <code>kbd</code>, e.g. <code>Mod+Shift+P</code>), <code>icon?</code> (SVG path data), <code>disabled?</code>, <code>run?</code> (called on run)';

export const COMMAND_PALETTE_MATCHING =
  'Accent- and case-insensitive fuzzy matching: the query’s characters in order ("gtst" finds "Go to settings"), a prefix first, then a word start (camelCase counts), then a contiguous hit, then a scattered one; keywords score at 80 % and the description at 60 %. Matches keep their groups, each ordered by its best hit, and the matched characters are wrapped in <code>&lt;mark&gt;</code>.';

export const COMMAND_PALETTE_KEYS =
  'The search box is an APG combobox over a listbox (<code>aria-activedescendant</code>): ↑ / ↓ move and wrap, skipping disabled commands; Page Up / Page Down move by eight; Ctrl+Home / Ctrl+End jump (plain Home / End stay with the text); Enter runs; Escape or a backdrop press closes and focus returns to where it was. A polite status announces the result count.';

export const OGE_COMMAND_PALETTE_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'commands',
          type: 'readonly OgeCommand[] (required)',
          description: `The commands, in order. Fields: ${COMMAND_FIELDS}.`,
        },
        {
          name: 'opened',
          type: 'boolean (model)',
          default: 'false',
          description:
            'Two-way open state. Opening clears the query and focuses the search box.',
        },
        {
          name: 'recent',
          type: 'readonly string[] (model)',
          default: '[]',
          description:
            'Ids of the recently run commands, newest first, listed in a "Recent" section above an empty query — two-way, so an app can persist it.',
        },
        {
          name: 'hotkey',
          type: 'string | null',
          default: "'Mod+K'",
          description:
            'Global shortcut that toggles the palette — <code>Mod</code> is ⌘ on Apple platforms and Ctrl elsewhere. <code>null</code> turns it off. A keydown another handler already prevented is ignored.',
        },
        {
          name: 'placeholder',
          type: 'string | undefined',
          default: 'commandPalettePlaceholder message',
          description: 'Placeholder of the search box.',
        },
        {
          name: 'recentLimit',
          type: 'number',
          default: '5',
          description:
            'How many recent commands to keep and list; <code>0</code> turns the recent section off.',
        },
        {
          name: 'maxResults',
          type: 'number',
          default: '50',
          description:
            'Upper bound of listed matches for a query (the empty query lists every command).',
        },
        {
          name: 'messages',
          type: 'Partial<OgeOverlayMessages>',
          description:
            'Per-instance overrides of <code>commandPaletteLabel</code>, <code>commandPalettePlaceholder</code>, <code>commandPaletteEmpty</code>, <code>commandPaletteRecent</code> and <code>commandPaletteResults</code>.',
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
          description: 'Opens the palette with an empty query.',
        },
        {
          name: 'close()',
          type: '() => void',
          description: 'Closes the palette; focus returns to where it was.',
        },
        {
          name: 'toggle()',
          type: '() => void',
          description: 'Opens a closed palette, closes an open one.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'commandExecute',
          type: 'OgeCommandExecuteEvent',
          description:
            'A command was chosen — by Enter or a click — after its own <code>run</code>. The palette closes unless the handler sets <code>keepOpen</code>.',
        },
        {
          name: 'recentChange',
          type: 'readonly string[]',
          description:
            'The banana half of <code>[(recent)]</code>: the recent list after a run.',
        },
        {
          name: 'queryChange',
          type: 'string',
          description:
            'The query changed (also when opening or closing clears it).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Matching & keyboard',
      entries: [
        {
          name: 'Matching',
          type: 'ogeFuzzyMatch',
          description: COMMAND_PALETTE_MATCHING,
        },
        {
          name: 'Keyboard',
          type: 'role="combobox" → role="listbox"',
          description: COMMAND_PALETTE_KEYS,
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeCommand',
          type: 'interface',
          description: `One command: ${COMMAND_FIELDS}.`,
        },
        {
          name: 'OgeCommandExecuteEvent',
          type: '{ command: OgeCommand; keepOpen: boolean }',
          description: 'Payload of <code>commandExecute</code>.',
        },
        {
          name: 'ogeFuzzyMatch',
          type: '(query, text) => OgeFuzzyMatch | null',
          description:
            'The matcher on its own: <code>{ score, ranges }</code> with <code>[start, end)</code> ranges in the source text, or <code>null</code>.',
        },
        {
          name: 'ogeMatchesShortcut',
          type: '(event, shortcut, apple?) => boolean',
          description:
            'Whether a keydown is a shortcut such as <code>Mod+K</code> — for wiring the commands’ own shortcuts.',
        },
        {
          name: 'ogeFormatShortcut',
          type: '(shortcut, apple?) => string',
          description:
            'A shortcut for display: <code>⇧⌘P</code> on Apple platforms, <code>Ctrl+Shift+P</code> elsewhere.',
        },
      ],
    },
    {
      title: 'Behavior building blocks (@oge-ui/behavior)',
      entries: [
        {
          name: 'ogeCommandPaletteSections / ogeCommandPaletteOptions',
          type: '(commands, query, { recent?, limit? }) => OgeCommandPaletteSection[]',
          description:
            'The grouped result list (<code>{ key, group, recent, options }</code>, each option <code>{ command, index, score, segments }</code>) and its flat keyboard order.',
        },
        {
          name: 'ogeCommandPaletteKeyIntent / ogeCommandPaletteFirstActive',
          type: '(event, active, options, page?) => OgeCommandPaletteKeyIntent | null',
          description:
            "The key map (<code>{ kind: 'move' | 'run', index }</code>) and the option made active when the list changes.",
        },
        {
          name: 'ogeCommandPaletteRecent',
          type: '(recent, id, limit) => string[]',
          description:
            'The recent list after a run: newest first, de-duplicated, bounded.',
        },
        {
          name: 'ogeFuzzyHighlight / ogeParseShortcut / ogeIsApplePlatform',
          type: 'helpers',
          description:
            'Ranges → <code>SearchHighlightSegment[]</code>; <code>Mod+Shift+P</code> → <code>OgeShortcut</code>; whether <code>Mod</code> means ⌘.',
        },
        {
          name: 'OgeFuzzyMatch / OgeCommandPaletteSection / OgeCommandPaletteOption / OgeCommandPaletteFilterOptions / OgeCommandPaletteKeyIntent / OgeShortcut',
          type: 'types',
          description: 'The shapes of the building blocks above.',
        },
      ],
    },
  ],
};
