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

export const TOOLTIP_TEMPLATES_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/overlay': ['OgeTooltip'],
  },
  template: `<!-- rich content: a template + context, with a callout arrow -->
<oge-button text="Ada Lovelace" [ogeTooltip]="person" [tooltipContext]="ada"
            [tooltipArrow]="true" tooltipPlacement="bottom" [tooltipMaxWidth]="240" />
<ng-template #person let-p>
  <strong>{{ p.name }}</strong> · {{ p.role }}<br />Last seen {{ p.seen }}
</ng-template>

<!-- show modes: hover (default), focus, click, manual -->
<oge-button text="Click me" ogeTooltip="Toggled by clicking" tooltipShowMode="click" />
<oge-button text="Copy" ogeTooltip="Copied!" tooltipShowMode="manual"
            #copied="ogeTooltip" (clicked)="copied.open()" />`,
  body: `protected readonly ada = { name: 'Ada Lovelace', role: 'Engineer', seen: '5 min ago' };`,
});

export const CONTEXT_DELEGATION_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeContextMenu'] },
  types: { '@oge-ui/overlay': ['OgeContextMenuOpeningEvent', 'OgeMenuItem'] },
  template: `<!-- one menu serves every row: contextMenuTarget delegates by selector -->
<ul [ogeContextMenu]="[]" contextMenuTarget="li" contextMenuAriaLabel="File actions"
    (contextMenuOpening)="build($event)" #menu="ogeContextMenu">
  @for (file of files; track file.name) {
    <li tabindex="0" [attr.data-name]="file.name">{{ file.name }}</li>
  }
</ul>

<!-- imperative: open at a viewport point (or menu.open($event)) -->
<button type="button" (click)="menu.open(240, 160)">Open at (240, 160)</button>`,
  body: `protected readonly files = [
  { name: 'report.xlsx', locked: false },
  { name: 'budget.xlsx', locked: true },
];

// cancelable; build the items for the row that was right-clicked
protected build(event: OgeContextMenuOpeningEvent): void {
  const name = event.target.getAttribute('data-name');
  const file = this.files.find((f) => f.name === name);
  if (!file) {
    event.cancel = true;
    return;
  }
  const items: OgeMenuItem[] = [
    { text: 'Open ' + file.name, value: 'open' },
    { text: 'Delete', value: 'delete', severity: 'danger', disabled: file.locked },
  ];
  event.items = items;
}`,
});
