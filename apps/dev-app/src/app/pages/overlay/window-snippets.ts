import { demoSource } from '../../shared/demo-source';

export const WINDOW_BASIC_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgeWindow'],
  },
  template: `<oge-button text="Open window" (clicked)="opened.set(true)" />

<!-- non-modal: no backdrop, no focus trap, no scroll lock -->
<oge-window title="Quick notes" [(opened)]="opened" [width]="360">
  <textarea aria-label="Notes"></textarea>
</oge-window>`,
  body: `protected readonly opened = signal(false);`,
});

export const WINDOW_STACKING_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeWindow'] },
  template: `<!-- any number at once; a press or focus brings one to the front -->
<oge-window title="Inspector" [(opened)]="inspector" placement="top-start"
            (activated)="active.set('Inspector')">…</oge-window>
<oge-window title="Layers" [(opened)]="layers" placement="top-end"
            (activated)="active.set('Layers')">…</oge-window>
<oge-window title="Console" [(opened)]="console" placement="bottom"
            [zIndex]="2000" (activated)="active.set('Console')">…</oge-window>`,
  body: `protected readonly inspector = signal(true);
protected readonly layers = signal(true);
protected readonly console = signal(true);
protected readonly active = signal('');`,
});

export const WINDOW_DRAG_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeWindow'] },
  types: {
    '@oge-ui/overlay': ['OgeWindowMovedEvent', 'OgeWindowResizedEvent'],
  },
  template: `<!-- title bar drags, eight edge handles resize; with the frame focused:
     arrows move (10px, Shift 1px), Ctrl/⌘+arrows resize -->
<oge-window title="Drag me" [(opened)]="opened"
            [minWidth]="260" [minHeight]="160" [maxWidth]="640"
            (moved)="onMoved($event)" (resized)="onResized($event)">
  …
</oge-window>`,
  body: `protected readonly opened = signal(false);

protected onMoved(event: OgeWindowMovedEvent): void {
  console.log(event.x, event.y, event.source); // 'pointer' | 'keyboard' | 'api'
}

protected onResized(event: OgeWindowResizedEvent): void {
  console.log(event.width, event.height, event.edge);
}`,
});

export const WINDOW_STATE_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeWindow'] },
  types: {
    '@oge-ui/overlay': ['OgeWindowState', 'OgeWindowStateChangingEvent'],
  },
  template: `<!-- title-bar buttons, a title-bar double-click, Alt+↑ / Alt+↓,
     the two-way state model or minimize() / maximize() / restore() -->
<oge-window #report title="Report" [(opened)]="opened" [(state)]="state"
            (stateChanging)="onStateChanging($event)">
  …
</oge-window>`,
  body: `protected readonly opened = signal(false);
protected readonly state = signal<OgeWindowState>('normal');

// cancelable, like every -ing event
protected onStateChanging(event: OgeWindowStateChangingEvent): void {
  if (event.state === 'maximized' && this.locked()) event.cancel = true;
}

protected readonly locked = signal(false);`,
});

export const WINDOW_PLACEMENT_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeWindow'] },
  types: { '@oge-ui/overlay': ['OgeWindowPlacement'] },
  template: `<!-- placement applies when there is no position; start/end mirror in RTL.
     keepInViewport=false lets the window hang off the edges, but the
     title bar always stays reachable -->
<oge-window title="Placed window" [(opened)]="opened"
            [placement]="placement()" [keepInViewport]="contained()" />

<!-- an explicit position (viewport px) wins and moves it when it changes -->
<oge-window title="Pinned" [(opened)]="pinned" [position]="{ x: 24, y: 96 }" />`,
  body: `protected readonly opened = signal(false);
protected readonly pinned = signal(false);
protected readonly placement = signal<OgeWindowPlacement>('bottom-end');
protected readonly contained = signal(true);`,
});

export const WINDOW_EVENTS_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeWindow'] },
  types: {
    '@oge-ui/overlay': ['OgeWindowClosingEvent', 'OgeWindowClosedEvent'],
  },
  template: `<oge-window title="Event log" [(opened)]="opened"
            (opening)="log('opening')" (closing)="onClosing($event)"
            (closed)="onClosed($event)" (moved)="log('moved')"
            (resized)="log('resized')" (stateChanged)="log('stateChanged')"
            (activated)="log('activated')">
  …
</oge-window>`,
  body: `protected readonly opened = signal(false);

// Escape (focus inside, no popup open), ✕ and close() — all cancelable
protected onClosing(event: OgeWindowClosingEvent): void {
  this.log(\`closing (\${event.reason})\`);
}

protected onClosed(event: OgeWindowClosedEvent): void {
  this.log(\`closed (\${event.reason})\`);
}

protected log(entry: string): void {
  console.log(entry);
}`,
});
