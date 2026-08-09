import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  template: `<oge-splitter [(sizes)]="sizes">
  <oge-splitter-pane key="list" [minSize]="15">
    Result list…
  </oge-splitter-pane>
  <oge-splitter-pane key="detail" [minSize]="25">
    Detail view…
  </oge-splitter-pane>
</oge-splitter>`,
  body: `// Sizes are ratios, not percentages — [30, 30] lays out like [50, 50],
// so a configuration that does not add up to 100 is never an error.
protected readonly sizes = signal([35, 65]);`,
});

export const ORIENTATION_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  types: { '@oge-ui/layout': ['OgeSplitterOrientation'] },
  template: `<oge-splitter [orientation]="orientation()">
  <oge-splitter-pane>Top / left</oge-splitter-pane>
  <oge-splitter-pane>Bottom / right</oge-splitter-pane>
</oge-splitter>`,
  body: `protected readonly orientation = signal<OgeSplitterOrientation>('vertical');`,
});

export const FIXED_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  template: `<!-- A '<n>px' size pins the pane: it becomes a fixed grid track and
     drops out of the share pool, while '<n>%' and plain numbers stay ratios.
     min and max accept either unit, so a px floor on a ratio pane is fine. -->
<oge-splitter>
  <oge-splitter-pane size="240px" minSize="160px" maxSize="420px">
    Fixed sidebar — dragged in pixels
  </oge-splitter-pane>
  <oge-splitter-pane [minSize]="20">Fluid content</oge-splitter-pane>
</oge-splitter>`,
});

export const COLLAPSE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  types: { '@oge-ui/layout': ['OgeSplitterPaneCollapsedEvent'] },
  template: `<!-- Enter on the separator, the grip, or a double click all collapse the
     pane before it. It comes back at the size it left, and stays in the DOM
     as an inert element so aria-controls keeps pointing at something real. -->
<oge-splitter (paneCollapsed)="onCollapsed($event)">
  <oge-splitter-pane
    key="side"
    [size]="30"
    [collapsible]="true"
    collapsedSize="28px"
    [(collapsed)]="sideCollapsed"
  >
    Navigation…
  </oge-splitter-pane>
  <oge-splitter-pane key="main">Editor…</oge-splitter-pane>
</oge-splitter>`,
  body: `protected readonly sideCollapsed = signal(false);

protected onCollapsed(event: OgeSplitterPaneCollapsedEvent): void {
  console.log('collapsed', event.key);
}`,
});

export const PANES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPaneTemplate'] },
  types: { '@oge-ui/layout': ['OgeSplitterPaneData'] },
  template: `<oge-splitter [panes]="areas">
  <ng-template ogeSplitterPaneTemplate let-pane let-index="index">
    <h4>{{ index }} — {{ pane.key }}</h4>
  </ng-template>
</oge-splitter>`,
  body: `protected readonly areas: OgeSplitterPaneData[] = [
  { key: 'explorer', size: 25, minSize: 15, collapsible: true },
  { key: 'editor', size: 50 },
  { key: 'inspector', size: 25, minSize: 15 },
];`,
});

export const NESTED_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  template: `<!-- Nesting needs no second component: a splitter inside a pane just
     works, and a data-driven pane nests by carrying its own panes array
     (which defaults to the opposite axis). -->
<oge-splitter>
  <oge-splitter-pane size="220px" [collapsible]="true">
    Sidebar
  </oge-splitter-pane>
  <oge-splitter-pane>
    <oge-splitter orientation="vertical">
      <oge-splitter-pane [size]="70">Editor</oge-splitter-pane>
      <oge-splitter-pane [size]="30" [collapsible]="true">
        Terminal
      </oge-splitter-pane>
    </oge-splitter>
  </oge-splitter-pane>
</oge-splitter>`,
});

export const PERSIST_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  template: `<oge-splitter [(sizes)]="sizes">
  <oge-splitter-pane>Left</oge-splitter-pane>
  <oge-splitter-pane>Right</oge-splitter-pane>
</oge-splitter>`,
  body: `// [(sizes)] is the whole persistable state, so there is no stateKey to
// learn and no storage token to provide — save it wherever you like.
protected readonly sizes = signal<(number | string)[]>(
  JSON.parse(localStorage.getItem('editor-layout') ?? 'null') ?? [30, 70],
);

constructor() {
  effect(() =>
    localStorage.setItem('editor-layout', JSON.stringify(this.sizes())),
  );
}`,
});

export const EVENTS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  types: {
    '@oge-ui/layout': [
      'OgeSplitterPaneCollapsingEvent',
      'OgeSplitterResizeEvent',
    ],
  },
  template: `<oge-splitter
  (resizeStarted)="log('start')"
  (resized)="onResized($event)"
  (resizeEnded)="log('end')"
  (paneCollapsing)="onCollapsing($event)"
>
  <oge-splitter-pane key="a" [collapsible]="true">A</oge-splitter-pane>
  <oge-splitter-pane key="b">B</oge-splitter-pane>
</oge-splitter>`,
  body: `protected readonly locked = signal(true);

protected onResized(event: OgeSplitterResizeEvent): void {
  console.log(event.sizes, event.previousSizes);
}

// paneCollapsing / paneExpanding are cancelable — set cancel to veto.
protected onCollapsing(event: OgeSplitterPaneCollapsingEvent): void {
  if (this.locked()) event.cancel = true;
}

protected log(phase: string): void {
  console.log(phase);
}`,
});

export const KEYBOARD_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'] },
  template: `<!-- WAI-ARIA APG window splitter: every separator is a focusable
     role="separator" with aria-controls on the pane before it and
     aria-valuenow/min/max on one 0-100 scale.
       Arrow keys    move it by [step] share points (RTL mirrored)
       Home / End    jump to the primary pane's smallest / largest size
       Enter         collapse the primary pane, or restore it
       Ctrl + Arrow  collapse the pane the arrow points at, or restore
                     the collapsed one it points away from -->
<oge-splitter [step]="10" ariaLabel="Editor layout">
  <oge-splitter-pane [minSize]="20" [maxSize]="70" [collapsible]="true">
    Primary
  </oge-splitter-pane>
  <oge-splitter-pane [minSize]="20" [collapsible]="true">
    Secondary
  </oge-splitter-pane>
</oge-splitter>`,
});

export const FORM_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': ['OgeForm'],
    '@oge-ui/layout': ['OgeSplitter', 'OgeSplitterPane'],
  },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<!-- A pane is a plain block box, never a query container, so a form
     inside one keeps resolving its @container queries against itself.
     Drag the separator and the column count follows the PANE width —
     the window never moves. -->
<oge-splitter>
  <oge-splitter-pane [size]="78">
    <oge-form
      [(formData)]="server"
      [items]="fields"
      [colCountByScreen]="{ xs: 1, sm: 2, md: 3 }"
    />
  </oge-splitter-pane>
  <oge-splitter-pane [size]="22">Preview…</oge-splitter-pane>
</oge-splitter>`,
  body: `protected readonly server = signal({ host: '', port: 5432, user: '' });

protected readonly fields: OgeFormItemData[] = [
  { field: 'host', label: 'Host' },
  { field: 'port', label: 'Port' },
  { field: 'user', label: 'User' },
];`,
});

export const CONFIG_SNIPPET = `import { provideOgeSplitterConfig } from '@oge-ui/layout';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOgeSplitterConfig({
      separatorSize: 8,
      step: 10,
      messages: {
        separator: '{{first}} ile {{second}} arasını yeniden boyutlandır',
        collapsePane: 'Paneli daralt',
        expandPane: 'Paneli aç',
      },
    }),
  ],
};`;
