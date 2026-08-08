import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeDropDownButton'] },
  types: { '@oge-ui/overlay': ['OgeMenuItem'] },
  template: `<oge-drop-down-button
  text="Export"
  severity="accent"
  [items]="exportItems"
  (itemClick)="exportAs($event.item.value)"
/>`,
  body: `protected readonly exportItems: OgeMenuItem[] = [
  { text: 'Excel (.xlsx)', value: 'xlsx' },
  { text: 'CSV', value: 'csv' },
  { separator: true, text: '' },
  { text: 'PDF', value: 'pdf' },
];

protected exportAs(format: unknown): void {
  console.log('export as', format);
}`,
});

export const SPLIT_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeDropDownButton'] },
  types: { '@oge-ui/overlay': ['OgeMenuItem'] },
  template: `<oge-drop-down-button
  text="Run"
  [splitButton]="true"
  [rememberLastAction]="true"
  [items]="runTargets"
  (clicked)="runCurrent()"
  (itemClick)="run($event.item.value)"
/>`,
  body: `protected readonly runTargets: OgeMenuItem[] = [
  { text: 'Run tests', value: 'test' },
  { text: 'Run build', value: 'build' },
  { text: 'Run lint', value: 'lint' },
];

protected runCurrent(): void {
  console.log('run the remembered target');
}

protected run(target: unknown): void {
  console.log('run', target);
}`,
});

export const ASYNC_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeDropDownButton'] },
  types: { '@oge-ui/overlay': ['OgeMenuItem'] },
  template: `<oge-drop-down-button text="Branches" [items]="loadBranches" />`,
  body: `// invoked on first open, cached until the reference changes
protected readonly loadBranches = (): Promise<OgeMenuItem[]> =>
  fetch('/api/branches').then((response) => response.json());`,
});

export const CONTENT_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton', 'OgeDropDownButton', 'OgeDropDownContent'],
  },
  template: `<oge-drop-down-button text="Filters" [dropdownWidth]="260">
  <div *ogeDropDownContent="let close" class="p-3">
    …any content…
    <oge-button text="Apply" size="sm" (clicked)="apply(); close()" />
  </div>
</oge-drop-down-button>`,
  body: `protected apply(): void {
  console.log('apply the filters');
}`,
});
