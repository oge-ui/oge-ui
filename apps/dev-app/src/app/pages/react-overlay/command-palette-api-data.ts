import type { ApiSections } from '../../shared/api-reference';
import {
  COMMAND_FIELDS,
  COMMAND_PALETTE_KEYS,
  COMMAND_PALETTE_MATCHING,
} from '../overlay/command-palette-api-data';

/**
 * Hand-compiled from packages/react/overlay/src/lib/command-palette.tsx —
 * keep in sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../overlay/command-palette-api-data.ts`: the
 * two-way models become controlled props with `onXChange` callbacks (and
 * `defaultX` when uncontrolled), the methods a ref handle.
 */
export const OGE_REACT_COMMAND_PALETTE_API: ApiSections = {
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
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Open state (controlled; <code>defaultOpened</code> when uncontrolled). Opening clears the query and focuses the search box.',
        },
        {
          name: 'recent',
          type: 'readonly string[] | undefined',
          default: '[]',
          description:
            'Ids of the recently run commands, newest first, listed in a "Recent" section above an empty query (controlled; <code>defaultRecent</code> when uncontrolled) — persist it from <code>onRecentChange</code>.',
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
      title: 'Ref handle (OgeCommandPaletteHandle)',
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
          name: 'onOpenedChange',
          type: '(opened: boolean) => void',
          description:
            'The hotkey, a run, a dismissal or a method changed the open state.',
        },
        {
          name: 'onRecentChange',
          type: '(recent: readonly string[]) => void',
          description: 'The recent list after a run.',
        },
        {
          name: 'onCommandExecute',
          type: '(event: OgeCommandExecuteEvent) => void',
          description:
            'A command was chosen — by Enter or a click — after its own <code>run</code>. The palette closes unless the handler sets <code>keepOpen</code>.',
        },
        {
          name: 'onQueryChange',
          type: '(query: string) => void',
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
          description: 'Payload of <code>onCommandExecute</code>.',
        },
        {
          name: 'OgeCommandPaletteProps',
          type: 'interface',
          description: 'The props above.',
        },
        {
          name: 'OgeCommandPaletteHandle',
          type: '{ open(); close(); toggle() }',
          description: 'What a <code>ref</code> reaches.',
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
  ],
};
