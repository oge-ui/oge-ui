import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeTileLayout,
  OgeTileLayoutContentTemplate,
  OgeTileLayoutItem,
  OgeTileLayoutItemHeader,
  sanitizeOgeTileLayoutState,
  type OgeTileLayoutReorderedEvent,
  type OgeTileLayoutResizedEvent,
  type OgeTileLayoutResizingEvent,
  type OgeTileLayoutState,
} from '@oge-ui/layout/tile-layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_TILE_LAYOUT_SECTIONS,
  ReactLayoutTileLayoutDemos,
} from '../react-layout/tile-layout';
import {
  BASICS_SNIPPET,
  DECLARATIVE_SNIPPET,
  REORDER_SNIPPET,
  RESIZE_SNIPPET,
  STATE_SNIPPET,
} from './tile-layout-snippets';
import {
  TILE_DASHBOARD,
  TILE_KPIS,
  TILE_RESIZABLE,
} from './tile-layout-demo-data';

const SECTIONS = [
  'Dashboard & spans',
  'Reorder by drag & keyboard',
  'Resizing tiles',
  'Persisted layout state',
  'Declarative tiles & templates',
] as const;

const BUTTON_CLASS =
  'rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700';

@Component({
  selector: 'app-layout-tile-layout',
  imports: [
    OgeTileLayout,
    OgeTileLayoutContentTemplate,
    OgeTileLayoutItem,
    OgeTileLayoutItemHeader,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutTileLayoutDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tile Layout"
      category="Layout"
      categoryLink="/components/tile-layout"
      [chips]="[
        'dashboard',
        'drag to reorder',
        'resize',
        'keyboard twins',
        'serializable state',
        'RTL',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTileLayout&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> arranges tiles on a CSS grid — a
          dashboard of figures, a launchpad, a personal start page — with the
          same markup, stylesheet and decisions as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-tile-layout</code> arranges tiles on a CSS grid — a
          dashboard of figures, a launchpad, a personal start page — with column
          and row spans, drag to reorder, resize handles and a serializable
          layout.
        </p>
      }
      <p>
        No APG pattern exists, so the tiles are a labelled
        <strong>list</strong> of focusable <code>role="group"</code> tiles
        (<code>aria-roledescription="tile"</code>) sharing one roving tab stop.
        Every drag has a keyboard twin: <kbd>Ctrl</kbd>+arrows move the focused
        tile, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+arrows resize it (horizontal
        arrows mirror in RTL), and each change is announced in the shared live
        region.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-tile-layout-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'columns', 'colSpan', 'rowSpan', 'rowHeight']"
        heading="Dashboard & spans"
        description="Tiles take a <code>colSpan</code> and a <code>rowSpan</code> on a <code>columns</code>-wide grid; <code>grid-auto-flow: dense</code> back-fills the holes a wide tile leaves. The host is an inline-size container, so below 480px of its own width the layout collapses to one column instead of overflowing."
        [code]="basicsSnippet"
        language="ts"
      >
        <oge-tile-layout
          [items]="dashboard"
          [columns]="4"
          [rowHeight]="120"
          ariaLabel="Sales dashboard"
        >
          <ng-template ogeTileLayoutContentTemplate let-item>
            <strong class="block text-xl">{{ kpi(item.key).value }}</strong>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{
              kpi(item.key).caption
            }}</span>
          </ng-template>
        </oge-tile-layout>
      </app-demo-card>

      <app-demo-card
        [chips]="['reorderable', 'reordering', 'reordered', 'Ctrl+Arrow']"
        heading="Reorder by drag & keyboard"
        description="Drag a tile by its header (touch drags start at once — the header is a dedicated handle), or focus a tile and press <kbd>Ctrl</kbd>+arrows. Both run the same commit, so <code>reordering</code> (cancelable) → <code>reordered</code> → <code>layoutChanged</code> fire identically, focus stays on the moved tile and the new position is announced. <kbd>Escape</kbd> cancels a drag."
        [code]="reorderSnippet"
        language="ts"
      >
        <oge-tile-layout
          [items]="dashboard"
          [columns]="4"
          [rowHeight]="110"
          ariaLabel="Reorderable dashboard"
          (reordered)="onReordered($event)"
        >
          <ng-template ogeTileLayoutContentTemplate let-item>
            <strong class="text-lg">{{ kpi(item.key).value }}</strong>
          </ng-template>
        </oge-tile-layout>
        <p class="mt-3 text-sm" data-testid="tile-reorder-log">
          {{ reorderLog() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'resizable',
          'minColSpan / maxColSpan',
          'resizing',
          'resized',
        ]"
        heading="Resizing tiles"
        description="<code>resizable</code> adds a corner handle (pointer only, <code>aria-hidden</code>) whose drag snaps to whole tracks with a live preview; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+arrows are the keyboard twin. Spans stay inside each tile's bounds, <code>'horizontal'</code> / <code>'vertical'</code> lock an axis, and the cancelable <code>resizing</code> event here vetoes anything taller than three rows."
        [code]="resizeSnippet"
        language="ts"
      >
        <oge-tile-layout
          [items]="resizableTiles"
          [columns]="4"
          [rowHeight]="110"
          resizable
          ariaLabel="Resizable dashboard"
          (resizing)="onResizing($event)"
          (resized)="onResized($event)"
        >
          <ng-template
            ogeTileLayoutContentTemplate
            let-colSpan="colSpan"
            let-rowSpan="rowSpan"
          >
            <span class="text-lg">{{ colSpan }} × {{ rowSpan }}</span>
          </ng-template>
        </oge-tile-layout>
        <p class="mt-3 text-sm" data-testid="tile-resize-log">
          {{ resizeLog() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['state', 'layoutChanged', 'applyState()', 'sanitize']"
        heading="Persisted layout state"
        description="<code>[(state)]</code> is the serializable layout — <code>{ version: 1, tiles: [{ key, order, colSpan, rowSpan }] }</code>. Persist it from <code>layoutChanged</code>; hand it back through <code>applyState()</code>, which validates it first (persisted state is untrusted input), ignores keys it does not know and places new tiles after the saved ones."
        [code]="stateSnippet"
        language="ts"
      >
        <oge-tile-layout
          #persisted
          [items]="stateTiles"
          [columns]="4"
          [rowHeight]="100"
          resizable
          [(state)]="state"
          ariaLabel="Persisted dashboard"
          (layoutChanged)="saved.set(json($event.state))"
        >
          <ng-template ogeTileLayoutContentTemplate let-item>
            <span class="text-sm">{{ item.key }}</span>
          </ng-template>
        </oge-tile-layout>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            [class]="buttonClass"
            (click)="persisted.applyState(parse(saved()))"
          >
            Restore saved
          </button>
          <button
            type="button"
            [class]="buttonClass"
            (click)="state.set(undefined)"
          >
            Reset
          </button>
        </div>
        <pre
          class="mt-3 overflow-x-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-900"
          data-testid="tile-state"
          >{{ saved() || 'Move or resize a tile to save the layout.' }}</pre>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'oge-tile-layout-item',
          'ogeTileLayoutItemHeader',
          'rowHeight: auto',
        ]"
        heading="Declarative tiles & templates"
        description="Tiles can be declared as <code>&amp;lt;oge-tile-layout-item&amp;gt;</code> children (merged before <code>items</code>): projected content becomes the body, an element marked <code>ogeTileLayoutItemHeader</code> replaces the title. Controls in a header stay real buttons — pressing one never starts a drag — and content inside a tile keeps its own place in the Tab order."
        [code]="declarativeSnippet"
        language="ts"
      >
        <oge-tile-layout [columns]="3" rowHeight="auto" ariaLabel="Team board">
          <oge-tile-layout-item key="welcome" title="Welcome" [colSpan]="2">
            <p class="!my-0 text-sm">
              Drag the headers or use Ctrl+Arrow keys to arrange the board.
            </p>
          </oge-tile-layout-item>
          <oge-tile-layout-item key="notes" title="Notes">
            <span ogeTileLayoutItemHeader class="flex items-center gap-2">
              Notes
              <button
                type="button"
                [class]="buttonClass"
                (click)="notes.set(notes() + 1)"
              >
                Add
              </button>
            </span>
            <p class="!my-0 text-sm" data-testid="tile-notes">
              {{ notes() }} notes pinned
            </p>
          </oge-tile-layout-item>
          <oge-tile-layout-item key="links" title="Links" [colSpan]="3">
            <a class="text-sm underline" href="#declarative-tiles-templates"
              >Team handbook</a
            >
          </oge-tile-layout-item>
        </oge-tile-layout>
      </app-demo-card>
    }
  `,
})
export class LayoutTileLayoutPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_TILE_LAYOUT_SECTIONS;
  protected readonly basicsSnippet = BASICS_SNIPPET;
  protected readonly reorderSnippet = REORDER_SNIPPET;
  protected readonly resizeSnippet = RESIZE_SNIPPET;
  protected readonly stateSnippet = STATE_SNIPPET;
  protected readonly declarativeSnippet = DECLARATIVE_SNIPPET;
  protected readonly buttonClass = BUTTON_CLASS;

  protected readonly dashboard = TILE_DASHBOARD;
  protected readonly resizableTiles = TILE_RESIZABLE;
  protected readonly stateTiles = TILE_DASHBOARD.slice(0, 4);

  protected readonly reorderLog = signal(
    'Drag a header or press Ctrl+Arrow on a tile.',
  );
  protected readonly resizeLog = signal(
    'Drag a corner or press Ctrl+Shift+Arrow.',
  );
  protected readonly state = signal<OgeTileLayoutState | undefined>(undefined);
  protected readonly saved = signal('');
  protected readonly notes = signal(3);

  protected kpi(key: string | number): { value: string; caption: string } {
    return TILE_KPIS[String(key)] ?? { value: '—', caption: '' };
  }

  protected onReordered(event: OgeTileLayoutReorderedEvent): void {
    this.reorderLog.set(
      `Moved ${event.key} from ${event.fromIndex + 1} to ${event.toIndex + 1} (${event.source})`,
    );
  }

  protected onResizing(event: OgeTileLayoutResizingEvent): void {
    event.cancel = event.next.rowSpan > 3;
  }

  protected onResized(event: OgeTileLayoutResizedEvent): void {
    this.resizeLog.set(
      `${event.key}: ${event.next.colSpan} × ${event.next.rowSpan} (${event.source})`,
    );
  }

  protected json(state: OgeTileLayoutState): string {
    return JSON.stringify(state);
  }

  protected parse(text: string): unknown {
    try {
      return sanitizeOgeTileLayoutState(JSON.parse(text));
    } catch {
      return null;
    }
  }
}
