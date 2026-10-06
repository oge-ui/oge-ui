import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeTileLayout,
  sanitizeOgeTileLayoutState,
  type OgeTileLayoutHandle,
  type OgeTileLayoutItemData,
  type OgeTileLayoutState,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  TILE_DASHBOARD,
  TILE_KPIS,
  TILE_RESIZABLE,
} from '../layout/tile-layout-demo-data';
import { LAYOUT_TILE_LAYOUT_DEMOS } from './tile-layout-snippets';

/**
 * TOC of the React view — the same five sections as the Angular tile layout
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_TILE_LAYOUT_SECTIONS = [
  'Dashboard & spans',
  'Reorder by drag & keyboard',
  'Resizing tiles',
  'Persisted layout state',
  'Declarative tiles & templates',
] as const;

const BUTTON_CLASS =
  'rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700';

const kpi = (key: string | number) =>
  TILE_KPIS[String(key)] ?? { value: '—', caption: '' };

function ReorderDemo(): ReactNode {
  const [log, setLog] = useState(
    'Drag a header or press Ctrl+Arrow on a tile.',
  );
  return createElement(
    'div',
    null,
    createElement(OgeTileLayout, {
      key: 'layout',
      items: TILE_DASHBOARD,
      columns: 4,
      rowHeight: 110,
      ariaLabel: 'Reorderable dashboard',
      onReordered: (e) =>
        setLog(
          `Moved ${e.key} from ${e.fromIndex + 1} to ${e.toIndex + 1} (${e.source})`,
        ),
      renderContent: ({ item }) =>
        createElement('strong', { className: 'text-lg' }, kpi(item.key).value),
    }),
    createElement(
      'p',
      {
        key: 'log',
        className: 'mt-3 text-sm',
        'data-testid': 'tile-reorder-log',
      },
      log,
    ),
  );
}

function ResizeDemo(): ReactNode {
  const [log, setLog] = useState('Drag a corner or press Ctrl+Shift+Arrow.');
  return createElement(
    'div',
    null,
    createElement(OgeTileLayout, {
      key: 'layout',
      items: TILE_RESIZABLE,
      columns: 4,
      rowHeight: 110,
      resizable: true,
      ariaLabel: 'Resizable dashboard',
      onResizing: (e) => {
        e.cancel = e.next.rowSpan > 3;
      },
      onResized: (e) =>
        setLog(`${e.key}: ${e.next.colSpan} × ${e.next.rowSpan} (${e.source})`),
      renderContent: ({ colSpan, rowSpan }) =>
        createElement(
          'span',
          { className: 'text-lg' },
          `${colSpan} × ${rowSpan}`,
        ),
    }),
    createElement(
      'p',
      {
        key: 'log',
        className: 'mt-3 text-sm',
        'data-testid': 'tile-resize-log',
      },
      log,
    ),
  );
}

const parse = (text: string): unknown => {
  try {
    return sanitizeOgeTileLayoutState(JSON.parse(text));
  } catch {
    return null;
  }
};

function StateDemo(): ReactNode {
  const layout = useRef<OgeTileLayoutHandle>(null);
  const [state, setState] = useState<OgeTileLayoutState | undefined>();
  const [saved, setSaved] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeTileLayout, {
      key: 'layout',
      ref: layout,
      items: TILE_DASHBOARD.slice(0, 4),
      columns: 4,
      rowHeight: 100,
      resizable: true,
      state,
      onStateChange: setState,
      onLayoutChanged: (e) => setSaved(JSON.stringify(e.state)),
      ariaLabel: 'Persisted dashboard',
      renderContent: ({ item }) =>
        createElement('span', { className: 'text-sm' }, String(item.key)),
    }),
    createElement(
      'div',
      { key: 'buttons', className: 'mt-3 flex flex-wrap gap-2' },
      createElement(
        'button',
        {
          key: 'restore',
          type: 'button',
          className: BUTTON_CLASS,
          onClick: () => layout.current?.applyState(parse(saved)),
        },
        'Restore saved',
      ),
      createElement(
        'button',
        {
          key: 'reset',
          type: 'button',
          className: BUTTON_CLASS,
          onClick: () => setState(undefined),
        },
        'Reset',
      ),
    ),
    createElement(
      'pre',
      {
        key: 'state',
        className:
          'mt-3 overflow-x-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-900',
        'data-testid': 'tile-state',
      },
      saved || 'Move or resize a tile to save the layout.',
    ),
  );
}

const TEAM_TILES: readonly OgeTileLayoutItemData[] = [
  { key: 'welcome', title: 'Welcome', colSpan: 2 },
  { key: 'notes', title: 'Notes' },
  { key: 'links', title: 'Links', colSpan: 3 },
];

function TemplatesDemo(): ReactNode {
  const [notes, setNotes] = useState(3);
  return createElement(OgeTileLayout, {
    items: TEAM_TILES,
    columns: 3,
    rowHeight: 'auto',
    ariaLabel: 'Team board',
    renderHeader: ({ item }) =>
      item.key === 'notes'
        ? createElement(
            'span',
            { className: 'flex items-center gap-2' },
            'Notes',
            createElement(
              'button',
              {
                key: 'add',
                type: 'button',
                className: BUTTON_CLASS,
                onClick: () => setNotes(notes + 1),
              },
              'Add',
            ),
          )
        : item.title,
    renderContent: ({ item }) =>
      item.key === 'notes'
        ? createElement(
            'p',
            { className: '!my-0 text-sm', 'data-testid': 'tile-notes' },
            `${notes} notes pinned`,
          )
        : item.key === 'links'
          ? createElement(
              'a',
              {
                className: 'text-sm underline',
                href: '#declarative-tiles-templates',
              },
              'Team handbook',
            )
          : createElement(
              'p',
              { className: '!my-0 text-sm' },
              'Drag the headers or use Ctrl+Arrow keys to arrange the board.',
            ),
  });
}

/**
 * The React half of the tile layout page — rendered inside
 * `/components/tile-layout` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-tile-layout-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React tile layout carries the class names but no styles of its own —
  // the docs pull the Angular entry's SCSS (only that one, to stay inside the
  // per-component style budget)
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/layout/tile-layout/src/tile-layout.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['items', 'columns', 'colSpan', 'rowSpan', 'rowHeight']"
      heading="Dashboard & spans"
      description="Tiles take a <code>colSpan</code> and a <code>rowSpan</code> on a <code>columns</code>-wide grid; <code>grid-auto-flow: dense</code> back-fills the holes a wide tile leaves. The host is an inline-size container, so below 480px of its own width the layout collapses to one column instead of overflowing."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['reorderable', 'onReordering', 'onReordered', 'Ctrl+Arrow']"
      heading="Reorder by drag & keyboard"
      description="Drag a tile by its header (touch drags start at once — the header is a dedicated handle), or focus a tile and press <kbd>Ctrl</kbd>+arrows. Both run the same commit, so <code>onReordering</code> (cancelable) → <code>onReordered</code> → <code>onLayoutChanged</code> fire identically, focus stays on the moved tile and the new position is announced. <kbd>Escape</kbd> cancels a drag."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="reorder" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'resizable',
        'minColSpan / maxColSpan',
        'onResizing',
        'onResized',
      ]"
      heading="Resizing tiles"
      description="<code>resizable</code> adds a corner handle (pointer only, <code>aria-hidden</code>) whose drag snaps to whole tracks with a live preview; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+arrows are the keyboard twin. Spans stay inside each tile's bounds, <code>'horizontal'</code> / <code>'vertical'</code> lock an axis, and the cancelable <code>onResizing</code> here vetoes anything taller than three rows."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="resize" />
    </app-demo-card>

    <app-demo-card
      [chips]="['state', 'onLayoutChanged', 'applyState()', 'sanitize']"
      heading="Persisted layout state"
      description="<code>state</code> / <code>onStateChange</code> carry the serializable layout — <code>{ version: 1, tiles: [{ key, order, colSpan, rowSpan }] }</code>. Persist it from <code>onLayoutChanged</code>; hand it back through the ref's <code>applyState()</code>, which validates it first (persisted state is untrusted input), ignores keys it does not know and places new tiles after the saved ones."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="persisted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderHeader', 'renderContent', 'rowHeight: auto']"
      heading="Declarative tiles & templates"
      description="React has one shape — the <code>items</code> array: <code>renderHeader</code> replaces the title and <code>renderContent</code> fills the body (the Angular <code>ogeTileLayoutItemHeader</code> and content slots). Controls in a header stay real buttons — pressing one never starts a drag — and content inside a tile keeps its own place in the Tab order."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>
  `,
})
export class ReactLayoutTileLayoutDemos {
  protected readonly demos = LAYOUT_TILE_LAYOUT_DEMOS;

  protected readonly basics = () =>
    createElement(OgeTileLayout, {
      items: TILE_DASHBOARD,
      columns: 4,
      rowHeight: 120,
      ariaLabel: 'Sales dashboard',
      renderContent: ({ item }) =>
        createElement(
          'span',
          { className: 'contents' },
          createElement(
            'strong',
            { key: 'v', className: 'block text-xl' },
            kpi(item.key).value,
          ),
          createElement(
            'span',
            { key: 'c', className: 'text-sm text-gray-500 dark:text-gray-400' },
            kpi(item.key).caption,
          ),
        ),
    });

  protected readonly reorder = () => createElement(ReorderDemo);
  protected readonly resize = () => createElement(ResizeDemo);
  protected readonly persisted = () => createElement(StateDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
}
