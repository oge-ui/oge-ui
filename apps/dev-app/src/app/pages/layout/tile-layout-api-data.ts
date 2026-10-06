import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/tile-layout/src/** and
 * packages/behavior/src/lib/layout/tile-layout-core.ts — keep in sync with
 * the source TSDoc when the public API changes.
 */

export const TILE_FIELDS =
  '<code>key</code>, <code>title?</code>, <code>colSpan?</code>, <code>rowSpan?</code>, <code>order?</code>, <code>minColSpan?</code> / <code>maxColSpan?</code>, <code>minRowSpan?</code> / <code>maxRowSpan?</code>, <code>resizable?</code>, <code>reorderable?</code>';

export const TILE_EVENT_TYPES: ApiGroup = {
  title: 'Events & state',
  entries: [
    {
      name: 'OgeTileLayoutReorderingEvent',
      type: "{ item; key; fromIndex; toIndex; source: 'pointer' | 'keyboard' | 'api'; event?; cancel }",
      description:
        'A tile is about to move — set <code>cancel</code> to keep it where it is. The pointer drop and the keyboard emit the same payload.',
    },
    {
      name: 'OgeTileLayoutReorderedEvent',
      type: "Omit<OgeTileLayoutReorderingEvent, 'cancel'>",
      description: 'A tile moved.',
    },
    {
      name: 'OgeTileLayoutResizingEvent',
      type: '{ item; key; previous: OgeTileLayoutSpan; next: OgeTileLayoutSpan; source; event?; cancel }',
      description:
        'A tile is about to change its spans (already clamped to its bounds) — set <code>cancel</code> to keep them.',
    },
    {
      name: 'OgeTileLayoutResizedEvent',
      type: "Omit<OgeTileLayoutResizingEvent, 'cancel'>",
      description: 'A tile changed its spans.',
    },
    {
      name: 'OgeTileLayoutChangedEvent',
      type: '{ state: OgeTileLayoutState; source }',
      description:
        'The layout changed through a move, a resize or <code>applyState()</code> — the state to persist.',
    },
    {
      name: 'OgeTileLayoutState',
      type: '{ version: 1; tiles: { key; order; colSpan; rowSpan }[] }',
      description:
        'The serializable layout. <code>order</code> is the 0-based display position. Tiles the state does not list are placed after the known ones; entries whose key no longer exists are ignored.',
    },
    {
      name: 'sanitizeOgeTileLayoutState(input, knownKeys?)',
      type: '(input: unknown, knownKeys?: Iterable<OgeTileLayoutKey>) => OgeTileLayoutState | null',
      description:
        'Validates persisted / imported state (untrusted input): never throws, rejects prototype keys at any depth, drops unknown fields, duplicate and unknown keys, keeps integer spans ≥ 1 and renumbers the order. <code>applyState()</code> runs it for you.',
    },
  ],
};

export const TILE_VOCABULARY: ApiGroup = {
  title: 'Vocabulary',
  entries: [
    {
      name: 'OgeTileLayoutItemData',
      type: 'interface',
      description: `One tile as data: ${TILE_FIELDS}.`,
    },
    {
      name: 'OgeTileLayoutResizable',
      type: "boolean | 'horizontal' | 'vertical'",
      description: 'Which spans the user may change.',
    },
    {
      name: 'OgeTileLayoutSpan',
      type: '{ colSpan: number; rowSpan: number }',
      description: 'Column and row span of a tile.',
    },
    {
      name: 'OgeTileLayoutKey',
      type: 'string | number',
      description: 'Identity of a tile.',
    },
    {
      name: 'OgeTileLayoutChangeSource',
      type: "'pointer' | 'keyboard' | 'api'",
      description: 'What started a change; <code>api</code> is a method call.',
    },
  ],
};

export const TILE_KEYBOARD: ApiGroup = {
  title: 'Keyboard',
  entries: [
    {
      name: 'Arrow keys / Home / End',
      type: 'focus',
      description:
        'Move focus between tiles (one roving tab stop; ↑/↓ go to the closest tile in the row above / below). Content inside a tile keeps its own Tab order, and the tile keys only act while the tile itself is focused.',
    },
    {
      name: 'Ctrl+← / Ctrl+→',
      type: 'move',
      description:
        'Move the focused tile one position earlier / later (mirrored in RTL). <kbd>⌘</kbd> works as <kbd>Ctrl</kbd>.',
    },
    {
      name: 'Ctrl+↑ / Ctrl+↓',
      type: 'move',
      description:
        'Move the focused tile to the position of the tile above / below.',
    },
    {
      name: 'Ctrl+Shift+← / Ctrl+Shift+→',
      type: 'resize',
      description:
        'Shrink / grow the column span (mirrored in RTL), within the tile&rsquo;s bounds.',
    },
    {
      name: 'Ctrl+Shift+↑ / Ctrl+Shift+↓',
      type: 'resize',
      description: 'Shrink / grow the row span.',
    },
    {
      name: 'Escape',
      type: 'cancel',
      description: 'Cancels a pointer drag or resize in progress.',
    },
  ],
};

export const OGE_TILE_LAYOUT_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeTileLayoutItemData[]',
          default: '[]',
          description: `The tiles as data, rendered after the declarative <code>oge-tile-layout-item</code> children. Fields: ${TILE_FIELDS}.`,
        },
        {
          name: 'columns',
          type: 'number | undefined',
          default: 'config ?? 4',
          description:
            'Number of grid columns. Column spans are clamped to it; below 480px of container width the layout collapses to one column.',
        },
        {
          name: 'rowHeight',
          type: "number | 'auto' | undefined",
          default: 'config ?? 160',
          description:
            'Height of one row track in px, or <code>auto</code> to size rows by their content.',
        },
        {
          name: 'gap',
          type: 'number | undefined',
          default: 'config ?? 16',
          description: 'Gap between tiles in px.',
        },
        {
          name: 'columnWidth',
          type: 'number | string | undefined',
          description:
            'Fixed column width (<code>240</code> px or any CSS length); default equal <code>1fr</code> columns.',
        },
        {
          name: 'resizable',
          type: "boolean | 'horizontal' | 'vertical'",
          default: 'false',
          description:
            'Default resizability of every tile (the item&rsquo;s own <code>resizable</code> overrides it): a corner handle for the pointer, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+arrows for the keyboard.',
        },
        {
          name: 'reorderable',
          type: 'boolean',
          default: 'true',
          description:
            'Default reorderability: drag by the header, <kbd>Ctrl</kbd>+arrows on the keyboard.',
        },
        {
          name: 'state',
          type: 'OgeTileLayoutState | undefined',
          default: 'undefined',
          description:
            'The committed layout (two-way <code>[(state)]</code>). <code>undefined</code> lays the tiles out from their own <code>order</code> and spans; every move and resize writes a new state.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          default: "messages.layoutLabel ('Dashboard')",
          description: 'Accessible name of the list.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          default: 'config ?? LOCALE_ID',
          description:
            'BCP 47 locale of the announcements&rsquo; plural rules.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus(key?)',
          type: '(key?: OgeTileLayoutKey) => void',
          description: 'Focuses a tile (default: the current tab stop).',
        },
        {
          name: 'moveTile(key, toIndex)',
          type: '(key: OgeTileLayoutKey, toIndex: number) => boolean',
          description:
            "Moves a tile through the cancelable pipeline (<code>source: 'api'</code>); <code>false</code> when nothing moved.",
        },
        {
          name: 'resizeTile(key, colSpan, rowSpan)',
          type: '(key: OgeTileLayoutKey, colSpan: number, rowSpan: number) => boolean',
          description:
            'Gives a tile new spans, clamped to its bounds, through the cancelable pipeline.',
        },
        {
          name: 'getState()',
          type: '() => OgeTileLayoutState',
          description: 'The current layout as a serializable state.',
        },
        {
          name: 'applyState(state)',
          type: '(state: unknown) => boolean',
          description:
            'Validates (<code>sanitizeOgeTileLayoutState</code>) and applies a persisted state; <code>false</code> and no change when it is invalid. Emits <code>layoutChanged</code>.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'reordering',
          type: 'OgeTileLayoutReorderingEvent',
          description:
            'A tile is about to move — set <code>cancel</code> to keep it.',
        },
        {
          name: 'reordered',
          type: 'OgeTileLayoutReorderedEvent',
          description: 'A tile moved.',
        },
        {
          name: 'resizing',
          type: 'OgeTileLayoutResizingEvent',
          description:
            'A tile is about to change its spans — set <code>cancel</code> to keep them.',
        },
        {
          name: 'resized',
          type: 'OgeTileLayoutResizedEvent',
          description: 'A tile changed its spans.',
        },
        {
          name: 'layoutChanged',
          type: 'OgeTileLayoutChangedEvent',
          description:
            'The layout changed (move, resize, <code>applyState</code>) — persist <code>state</code>.',
        },
        {
          name: 'stateChange',
          type: 'OgeTileLayoutState | undefined',
          description: 'The <code>[(state)]</code> model&rsquo;s change half.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Template slots',
      entries: [
        {
          name: 'OgeTileLayoutHeaderTemplate',
          type: '[ogeTileLayoutHeaderTemplate]',
          description:
            'Replaces the title in the header of every <code>items</code> tile. The header stays the drag handle; buttons inside it are real controls that never start a drag.',
        },
        {
          name: 'OgeTileLayoutContentTemplate',
          type: '[ogeTileLayoutContentTemplate]',
          description:
            'The body of every <code>items</code> tile. Ordinary flow content in the normal Tab order.',
        },
        {
          name: 'OgeTileLayoutTemplateContext',
          type: '{ $implicit: OgeTileLayoutItemData; key; index; colSpan; rowSpan }',
          description:
            'Context of both slots; the spans are the live preview while a resize is in progress.',
        },
      ],
    },
    TILE_EVENT_TYPES,
    TILE_VOCABULARY,
    TILE_KEYBOARD,
  ],
};

export const OGE_TILE_LAYOUT_ITEM_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'key',
          type: 'string | number | undefined',
          default: 'auto id',
          description:
            'Identity reported by every event and stored in the state. Set it when the layout is persisted — the auto id is per page load.',
        },
        {
          name: 'title',
          type: 'string | undefined',
          description: 'Header text; also the tile&rsquo;s accessible name.',
        },
        {
          name: 'colSpan / rowSpan',
          type: 'number | undefined',
          default: '1',
          description: 'Columns and rows the tile spans.',
        },
        {
          name: 'order',
          type: 'number | undefined',
          description:
            'Initial position; tiles without one keep document order.',
        },
        {
          name: 'minColSpan / maxColSpan',
          type: 'number | undefined',
          default: '1 / columns',
          description: 'Bounds of a column-span resize.',
        },
        {
          name: 'minRowSpan / maxRowSpan',
          type: 'number | undefined',
          default: '1 / unbounded',
          description: 'Bounds of a row-span resize.',
        },
        {
          name: 'resizable',
          type: "boolean | 'horizontal' | 'vertical' | undefined",
          description: 'Overrides the layout&rsquo;s <code>resizable</code>.',
        },
        {
          name: 'reorderable',
          type: 'boolean | undefined',
          description: 'Overrides the layout&rsquo;s <code>reorderable</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Slots',
      entries: [
        {
          name: 'OgeTileLayoutItemHeader',
          type: '[ogeTileLayoutItemHeader]',
          description:
            'Attribute slot: the projected element replaces the header title. Everything else projected is the tile body.',
        },
      ],
    },
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'provideOgeTileLayoutConfig(config)',
        type: '(config: OgeTileLayoutConfigInput | (() => OgeTileLayoutConfigInput)) => Provider',
        description:
          'Application- or component-scoped defaults for <code>columns</code>, <code>rowHeight</code>, <code>gap</code>, <code>locale</code> and the <code>messages</code> (a function makes it live).',
      },
      {
        name: 'OGE_TILE_LAYOUT_CONFIG',
        type: 'InjectionToken<OgeTileLayoutConfig>',
        description:
          'The token behind <code>provideOgeTileLayoutConfig()</code>, with <code>OGE_DEFAULT_TILE_LAYOUT_CONFIG</code> as its factory default.',
      },
    ],
  },
];

export const TILE_MESSAGES: ApiGroup = {
  title: 'Messages',
  entries: [
    {
      name: 'OgeTileLayoutMessages',
      type: 'interface',
      description:
        '<code>layoutLabel</code>, <code>tileRoleDescription</code>, <code>untitledTile</code> (<code>{position}</code>), <code>keyboardHint</code>, <code>dragHint</code>, <code>moved</code> (<code>{title}</code>, <code>{position}</code>, <code>{count}</code>), <code>resized</code> (ICU plurals over <code>{colSpan}</code> / <code>{rowSpan}</code>), <code>unchanged</code>, <code>dragCancelled</code>. Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.tileLayout</code>).',
    },
    {
      name: 'OgeTileLayoutConfig / OgeTileLayoutConfigInput',
      type: 'interface',
      description:
        'The config shape (<code>messages</code>, <code>columns?</code>, <code>rowHeight?</code>, <code>gap?</code>, <code>locale?</code>) and its partial input; <code>OGE_DEFAULT_TILE_LAYOUT_CONFIG</code> / <code>OGE_DEFAULT_TILE_LAYOUT_MESSAGES</code> are the resolved defaults.',
    },
  ],
};

export const OGE_TILE_LAYOUT_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [TILE_MESSAGES],
};
