import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTab', 'OgeTabPanel'] },
  types: { '@oge-ui/tabs': ['OgeTabSelectionChangedEvent'] },
  template: `<oge-tab-panel [(selectedIndex)]="index" (selectionChanged)="onChanged($event)">
  <oge-tab text="Overview">Project overview…</oge-tab>
  <oge-tab text="Activity">Latest activity…</oge-tab>
  <oge-tab text="Settings" [disabled]="true">Settings…</oge-tab>
</oge-tab-panel>`,
  body: `protected readonly index = signal(0);

protected onChanged(event: OgeTabSelectionChangedEvent): void {
  console.log('now on', event.index);
}`,
});

export const ITEMS_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTabContentTemplate', 'OgeTabPanel'] },
  types: { '@oge-ui/tabs': ['OgeTabItem'] },
  template: `<oge-tab-panel [items]="docs" [(selectedKey)]="active">
  <ng-template ogeTabContentTemplate let-item>
    Editing <b>{{ item?.text }}</b>…
  </ng-template>
</oge-tab-panel>`,
  body: `protected readonly docs: OgeTabItem[] = [
  { key: 'readme', text: 'README.md' },
  { key: 'spec', text: 'spec.ts', badge: 3 },
  { key: 'draft', text: 'draft.md', dirty: true },
];

protected readonly active = signal('readme');`,
});

export const LAZY_SNIPPET = demoSource({
  use: {
    '@oge-ui/tabs': ['OgeTab', 'OgeTabContentTemplate', 'OgeTabPanel'],
  },
  template: `<!-- deferRendering (default true): a panel is created on first visit.
     keepAlive (default true): it then stays mounted while hidden. -->
<oge-tab-panel [keepAlive]="keepAlive()">
  <oge-tab text="First">
    <ng-template ogeTabContentTemplate>Created at {{ stamp() }}</ng-template>
  </oge-tab>
  <oge-tab text="Second">
    <ng-template ogeTabContentTemplate>Created at {{ stamp() }}</ng-template>
  </oge-tab>
</oge-tab-panel>`,
  body: `protected readonly keepAlive = signal(true);

protected stamp(): string {
  return new Date().toLocaleTimeString();
}`,
});

export const CLOSE_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTabPanel'] },
  types: { '@oge-ui/tabs': ['OgeTabClosedEvent', 'OgeTabItem'] },
  template: `<oge-tab-panel [items]="files()" [closable]="true" (tabClosed)="remove($event)" />`,
  body: `// the tab is removed by the app, after the guard allowed it
protected readonly files = signal<OgeTabItem[]>([
  { key: 'a.ts', text: 'a.ts' },
  // async closeGuard: resolve(false) keeps the tab, rejection = veto
  {
    key: 'b.ts',
    text: 'b.ts (guarded)',
    dirty: true,
    closeGuard: () => this.confirmDiscard(),
  },
]);

protected remove(e: OgeTabClosedEvent): void {
  this.files.set(this.files().filter((f) => f.key !== e.key));
}

private confirmDiscard(): boolean {
  return confirm('Discard unsaved changes?');
}`,
});

export const OVERFLOW_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTabs'] },
  types: { '@oge-ui/tabs': ['OgeTabItem'] },
  template: `<oge-tabs
  [items]="manyTabs"
  [(selectedIndex)]="index"
  showNavButtons="auto"
  [showTabListButton]="true"
/>`,
  body: `protected readonly manyTabs: OgeTabItem[] = Array.from(
  { length: 20 },
  (_, i) => ({ key: \`t\${i}\`, text: \`Section \${i + 1}\` }),
);

protected readonly index = signal(0);`,
});

export const REORDER_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTabPanel'] },
  types: { '@oge-ui/tabs': ['OgeTabItem', 'OgeTabReorderedEvent'] },
  template: `<oge-tab-panel
  [items]="stages"
  [allowTabReordering]="true"
  (tabReordered)="log($event)"
/>`,
  body: `protected readonly stages: OgeTabItem[] = [
  { key: 'plan', text: 'Plan' },
  { key: 'build', text: 'Build' },
  { key: 'ship', text: 'Ship' },
];

protected log(event: OgeTabReorderedEvent): void {
  console.log(event.fromIndex, '→', event.toIndex);
}`,
});

export const POSITION_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTab', 'OgeTabPanel'] },
  template: `<oge-tab-panel tabsPosition="start" stylingMode="secondary" size="sm">
  <oge-tab text="General">General settings…</oge-tab>
  <oge-tab text="Members">Team members…</oge-tab>
</oge-tab-panel>`,
});

export const ALIGNMENT_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTabs'] },
  types: { '@oge-ui/tabs': ['OgeTabItem'] },
  template: `<!-- start (default) · center · end · justify · stretch -->
<oge-tabs
  [items]="tabs"
  tabAlignment="stretch"
  indicatorFit="content"
  [(selectedIndex)]="index"
/>

<!-- with no visible tabs the strip renders messages.noData -->
<oge-tabs [items]="[]" />`,
  body: `protected readonly tabs: OgeTabItem[] = [
  { key: 'one', text: 'One' },
  { key: 'two', text: 'Two' },
];

protected readonly index = signal(0);`,
});

export const ANIMATION_SNIPPET = demoSource({
  use: { '@oge-ui/tabs': ['OgeTab', 'OgeTabPanel'] },
  template: `<oge-tab-panel
  panelAnimation="slide"
  [dynamicHeight]="true"
  [(selectedIndex)]="index"
>
  <oge-tab text="Short">One line.</oge-tab>
  <oge-tab text="Tall">Several lines of taller content…</oge-tab>
</oge-tab-panel>`,
  body: `protected readonly index = signal(0);`,
  after: `/* duration is a CSS variable, not an input:
   .oge-tab-panel-content { --oge-tab-panel-transition: 240ms; } */`,
});
