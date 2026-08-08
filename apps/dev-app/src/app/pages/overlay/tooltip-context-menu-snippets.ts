import { demoSource } from '../../shared/demo-source';

export const TOOLTIP_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgeTooltip'],
  },
  template: `<!-- any element becomes a tooltip trigger -->
<oge-button text="Save" ogeTooltip="Saves your changes" />
<button type="button" ogeTooltip="Plain elements work too">Hover me</button>

<!-- shows on hover after a dwell, immediately on keyboard focus;
     hides on leave, blur or Escape; wired to aria-describedby -->`,
});

export const TOOLTIP_OPTIONS_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgeTooltip'],
  },
  helpers: { '@oge-ui/overlay': ['provideOgeOverlayConfig'] },
  types: { '@angular/core': ['ApplicationConfig'] },
  template: `<oge-button text="Below" ogeTooltip="Prefers the bottom edge"
            tooltipPlacement="bottom" />
<oge-button text="Slow" ogeTooltip="Waits 800ms before showing"
            [tooltipShowDelay]="800" />
<oge-button text="Muted" ogeTooltip="Never appears"
            [tooltipDisabled]="true" />`,
  after: `// application-wide defaults
export const appConfig: ApplicationConfig = {
  providers: [
    provideOgeOverlayConfig({ tooltipShowDelayMs: 300, tooltipHideDelayMs: 150 }),
  ],
};`,
});

export const CONTEXT_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeContextMenu'] },
  types: { '@oge-ui/overlay': ['OgeMenuItem'] },
  template: `<div [ogeContextMenu]="rowMenu" tabindex="0">
  Right-click me (or press Shift+F10)
</div>`,
  body: `// the canonical OgeMenuItem model: separators, checked state,
// danger severity, per-item actions
protected readonly rowMenu: OgeMenuItem[] = [
  { text: 'Open', value: 'open' },
  { text: 'Duplicate', value: 'duplicate' },
  { separator: true, text: '' },
  { text: 'Delete', value: 'delete', severity: 'danger' },
];`,
});

export const CONTEXT_EVENTS_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeContextMenu'] },
  types: { '@oge-ui/overlay': ['OgeMenuItem'] },
  template: `<div
  [ogeContextMenu]="menu"
  contextMenuAriaLabel="File actions"
  (contextMenuItemClick)="run($event.item.value)"
  (contextMenuOpened)="log('opened')"
  (contextMenuClosed)="log('closed')"
></div>`,
  body: `protected readonly menu: OgeMenuItem[] = [
  { text: 'Open', value: 'open' },
  { text: 'Delete', value: 'delete', severity: 'danger' },
];

// $event: { item, index, event } — the same payload as OgeMenuList
protected run(command: unknown): void {
  console.log('run', command);
}

protected log(phase: string): void {
  console.log(phase);
}`,
});
