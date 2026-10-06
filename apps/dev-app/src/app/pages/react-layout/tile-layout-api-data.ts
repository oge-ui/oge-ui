import type { ApiGroup, ApiSections } from '../../shared/api-reference';
import {
  TILE_EVENT_TYPES,
  TILE_FIELDS,
  TILE_KEYBOARD,
  TILE_MESSAGES,
  TILE_VOCABULARY,
} from '../layout/tile-layout-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/tile-layout.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/tile-layout-api-data.ts` (the parity
 * gate diffs the two member by member): the same props, callbacks for the
 * outputs, render props in place of the template slots, the `ref` handle for
 * the public methods, the context provider in place of the DI one. The
 * declarative `<oge-tile-layout-item>` children have no React twin — the
 * `items` array is the one shape.
 */

export const OGE_REACT_TILE_LAYOUT_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeTileLayoutItemData[]',
          default: '[]',
          description: `The tiles. Fields: ${TILE_FIELDS}.`,
        },
        {
          name: 'columns',
          type: 'number',
          default: 'config ?? 4',
          description:
            'Number of grid columns. Column spans are clamped to it; below 480px of container width the layout collapses to one column.',
        },
        {
          name: 'rowHeight',
          type: "number | 'auto'",
          default: 'config ?? 160',
          description:
            'Height of one row track in px, or <code>auto</code> to size rows by their content.',
        },
        {
          name: 'gap',
          type: 'number',
          default: 'config ?? 16',
          description: 'Gap between tiles in px.',
        },
        {
          name: 'columnWidth',
          type: 'number | string',
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
          type: 'OgeTileLayoutState',
          description:
            'The committed layout (controlled; pair with <code>onStateChange</code>). Passing the prop — even as <code>undefined</code>, which lays the tiles out from their own <code>order</code> and spans — makes the component controlled; leave it out for an uncontrolled layout.',
        },
        {
          name: 'defaultState',
          type: 'OgeTileLayoutState',
          description: 'Initial layout when uncontrolled.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          default: "messages.layoutLabel ('Dashboard')",
          description: 'Accessible name of the list.',
        },
        {
          name: 'locale',
          type: 'string',
          default: 'config ?? runtime default',
          description:
            'BCP 47 locale of the announcements&rsquo; plural rules.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgeTileLayoutRenderContext) => ReactNode',
          description:
            'Replaces the header title of every tile — the Angular <code>[ogeTileLayoutHeaderTemplate]</code>. Buttons inside it never start a drag.',
        },
        {
          name: 'renderContent',
          type: '(context: OgeTileLayoutRenderContext) => ReactNode',
          description:
            'The body of every tile — the Angular <code>[ogeTileLayoutContentTemplate]</code>.',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra classes on the host element.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description: 'Inline style of the host element.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'ref handle (OgeTileLayoutHandle)',
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
            'Validates (<code>sanitizeOgeTileLayoutState</code>) and applies a persisted state; <code>false</code> and no change when it is invalid. Calls <code>onLayoutChanged</code>.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onReordering',
          type: '(event: OgeTileLayoutReorderingEvent) => void',
          description:
            'A tile is about to move — set <code>cancel</code> to keep it.',
        },
        {
          name: 'onReordered',
          type: '(event: OgeTileLayoutReorderedEvent) => void',
          description: 'A tile moved.',
        },
        {
          name: 'onResizing',
          type: '(event: OgeTileLayoutResizingEvent) => void',
          description:
            'A tile is about to change its spans — set <code>cancel</code> to keep them.',
        },
        {
          name: 'onResized',
          type: '(event: OgeTileLayoutResizedEvent) => void',
          description: 'A tile changed its spans.',
        },
        {
          name: 'onLayoutChanged',
          type: '(event: OgeTileLayoutChangedEvent) => void',
          description:
            'The layout changed (move, resize, <code>applyState</code>) — persist <code>state</code>.',
        },
        {
          name: 'onStateChange',
          type: '(state: OgeTileLayoutState) => void',
          description:
            'Every committed layout — the controlled half of <code>state</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render props',
      entries: [
        {
          name: 'OgeTileLayoutRenderContext',
          type: '{ item: OgeTileLayoutItemData; key; index; colSpan; rowSpan }',
          description:
            'Argument of <code>renderHeader</code> / <code>renderContent</code>; the spans are the live preview while a resize is in progress.',
        },
      ],
    },
    TILE_EVENT_TYPES,
    TILE_VOCABULARY,
    TILE_KEYBOARD,
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeTileLayoutConfigProvider',
        type: '({ config?: OgeTileLayoutConfigInput; children }) => JSX.Element',
        description:
          'Subtree-scoped defaults for <code>columns</code>, <code>rowHeight</code>, <code>gap</code>, <code>locale</code> and the <code>messages</code> — the React counterpart of <code>provideOgeTileLayoutConfig()</code>.',
      },
      {
        name: 'useOgeTileLayoutConfig()',
        type: '() => OgeTileLayoutConfig',
        description: 'Reads the resolved config of the nearest provider.',
      },
    ],
  },
];

export const OGE_REACT_TILE_LAYOUT_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [TILE_MESSAGES],
};
