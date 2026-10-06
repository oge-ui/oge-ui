import { demoSource } from '../../shared/demo-source';

const DASHBOARD_ITEMS = `protected readonly tiles: OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2 },
  { key: 'orders', title: 'Orders' },
  { key: 'visitors', title: 'Visitors' },
  { key: 'traffic', title: 'Traffic sources', colSpan: 2, rowSpan: 2 },
  { key: 'conversion', title: 'Conversion' },
  { key: 'refunds', title: 'Refunds' },
  { key: 'tickets', title: 'Open tickets', colSpan: 2 },
];
protected readonly kpis: Record<string, string> = {
  revenue: '€ 48,210',
  orders: '1,284',
  visitors: '23,915',
  traffic: '61% search',
  conversion: '3.4%',
  refunds: '18',
  tickets: '42',
};`;

export const BASICS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeTileLayout', 'OgeTileLayoutContentTemplate'],
  },
  types: { '@oge-ui/layout': ['OgeTileLayoutItemData'] },
  template: `<!-- A labelled list of tiles on a 4-column grid. colSpan / rowSpan
     place each tile; grid-auto-flow: dense back-fills the gaps. Below
     480px of container width the layout collapses to one column. -->
<oge-tile-layout
  [items]="tiles"
  [columns]="4"
  [rowHeight]="120"
  ariaLabel="Sales dashboard"
>
  <ng-template ogeTileLayoutContentTemplate let-item>
    <strong class="kpi">{{ kpis[item.key] }}</strong>
  </ng-template>
</oge-tile-layout>`,
  body: DASHBOARD_ITEMS,
});

export const REORDER_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeTileLayout', 'OgeTileLayoutContentTemplate'],
  },
  types: {
    '@oge-ui/layout': ['OgeTileLayoutItemData', 'OgeTileLayoutReorderedEvent'],
  },
  template: `<!-- Drag a tile by its header, or focus it and press Ctrl+Arrow keys.
     Both run the same commit: reordering (cancelable) → reordered →
     layoutChanged, and the move is announced in the shared live region.
     Escape cancels a drag. -->
<oge-tile-layout
  [items]="tiles"
  [columns]="4"
  [rowHeight]="110"
  ariaLabel="Reorderable dashboard"
  (reordered)="onReordered($event)"
>
  <ng-template ogeTileLayoutContentTemplate let-item>
    <strong>{{ kpis[item.key] }}</strong>
  </ng-template>
</oge-tile-layout>
<p>{{ log() }}</p>`,
  body: `${DASHBOARD_ITEMS}
protected readonly log = signal('Drag a header or press Ctrl+Arrow on a tile.');
protected onReordered(event: OgeTileLayoutReorderedEvent): void {
  this.log.set(
    \`Moved \${event.key} from \${event.fromIndex + 1} to \${event.toIndex + 1} (\${event.source})\`,
  );
}`,
});

export const RESIZE_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeTileLayout', 'OgeTileLayoutContentTemplate'],
  },
  types: {
    '@oge-ui/layout': [
      'OgeTileLayoutItemData',
      'OgeTileLayoutResizedEvent',
      'OgeTileLayoutResizingEvent',
    ],
  },
  template: `<!-- resizable turns on the corner handle (pointer) and Ctrl+Shift+Arrow
     (keyboard). Spans snap to whole tracks and stay inside each tile's
     min/max bounds; 'horizontal' / 'vertical' lock an axis. -->
<oge-tile-layout
  [items]="tiles"
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
    {{ colSpan }} × {{ rowSpan }}
  </ng-template>
</oge-tile-layout>
<p>{{ log() }}</p>`,
  body: `protected readonly tiles: OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2, maxColSpan: 3 },
  { key: 'orders', title: 'Orders', maxRowSpan: 2 },
  { key: 'traffic', title: 'Traffic sources', resizable: 'horizontal' },
  { key: 'tickets', title: 'Open tickets', resizable: false },
];
protected readonly log = signal('Drag a corner or press Ctrl+Shift+Arrow.');
protected onResizing(event: OgeTileLayoutResizingEvent): void {
  // veto anything taller than three rows
  event.cancel = event.next.rowSpan > 3;
}
protected onResized(event: OgeTileLayoutResizedEvent): void {
  this.log.set(\`\${event.key}: \${event.next.colSpan} × \${event.next.rowSpan}\`);
}`,
});

export const STATE_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeTileLayout', 'OgeTileLayoutContentTemplate'],
  },
  helpers: { '@oge-ui/layout': ['sanitizeOgeTileLayoutState'] },
  types: {
    '@oge-ui/layout': ['OgeTileLayoutItemData', 'OgeTileLayoutState'],
  },
  template: `<!-- [(state)] is the serializable layout: { version: 1, tiles: [{ key,
     order, colSpan, rowSpan }] }. Persist it on layoutChanged; restore it
     through applyState(), which validates untrusted input first. -->
<oge-tile-layout
  #layout
  [items]="tiles"
  [columns]="4"
  [rowHeight]="100"
  resizable
  [(state)]="state"
  ariaLabel="Persisted dashboard"
  (layoutChanged)="saved.set(json($event.state))"
>
  <ng-template ogeTileLayoutContentTemplate let-item>{{ item.key }}</ng-template>
</oge-tile-layout>
<button type="button" (click)="layout.applyState(parse(saved()))">Restore saved</button>
<button type="button" (click)="state.set(undefined)">Reset</button>
<pre>{{ saved() }}</pre>`,
  body: `protected readonly tiles: OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2 },
  { key: 'orders', title: 'Orders' },
  { key: 'visitors', title: 'Visitors' },
  { key: 'tickets', title: 'Open tickets', colSpan: 2 },
];
protected readonly state = signal<OgeTileLayoutState | undefined>(undefined);
protected readonly saved = signal('');
protected json(state: OgeTileLayoutState): string {
  return JSON.stringify(state);
}
protected parse(text: string): unknown {
  try {
    // applyState() runs sanitizeOgeTileLayoutState itself; calling it here
    // too lets you reject a bad file before touching the layout
    return sanitizeOgeTileLayoutState(JSON.parse(text));
  } catch {
    return null;
  }
}`,
});

export const DECLARATIVE_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeTileLayout',
      'OgeTileLayoutItem',
      'OgeTileLayoutItemHeader',
    ],
  },
  template: `<!-- Declarative tiles: projected content is the body, an element marked
     ogeTileLayoutItemHeader replaces the title. Buttons in a header stay
     real controls — pressing them never starts a drag. -->
<oge-tile-layout [columns]="3" [rowHeight]="'auto'" ariaLabel="Team board">
  <oge-tile-layout-item key="welcome" title="Welcome" [colSpan]="2">
    <p>Drag the headers or use Ctrl+Arrow keys to arrange the board.</p>
  </oge-tile-layout-item>
  <oge-tile-layout-item key="notes" title="Notes">
    <span ogeTileLayoutItemHeader>
      Notes
      <button type="button" (click)="count.set(count() + 1)">Add</button>
    </span>
    <p>{{ count() }} notes pinned</p>
  </oge-tile-layout-item>
  <oge-tile-layout-item key="links" title="Links" [colSpan]="3">
    <a href="#declarative-tiles-templates">Team handbook</a>
  </oge-tile-layout-item>
</oge-tile-layout>`,
  body: `protected readonly count = signal(3);`,
});
