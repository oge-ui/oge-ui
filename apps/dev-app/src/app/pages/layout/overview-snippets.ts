import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAccordion', 'OgeAccordionItem'] },
  template: `<oge-accordion [(selectedIndex)]="index">
  <oge-accordion-item title="Account" description="Name and e-mail">
    Account settings…
  </oge-accordion-item>
  <oge-accordion-item title="Notifications" [badge]="3">
    Notification settings…
  </oge-accordion-item>
  <oge-accordion-item title="Archived" [disabled]="true">
    Never reachable…
  </oge-accordion-item>
</oge-accordion>`,
  body: `protected readonly index = signal(0);`,
});

export const ITEMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeAccordion', 'OgeAccordionContentTemplate'],
  },
  types: { '@oge-ui/layout': ['OgeAccordionItemData'] },
  template: `<oge-accordion [items]="sections" [multiple]="true" [(expandedKeys)]="open">
  <ng-template ogeAccordionContentTemplate let-item>
    Body of <b>{{ item.title }}</b>…
  </ng-template>
</oge-accordion>`,
  body: `protected readonly sections: OgeAccordionItemData[] = [
  { key: 'general', title: 'General', description: 'Language and time zone' },
  { key: 'security', title: 'Security', badge: 2 },
  { key: 'danger', title: 'Danger zone' },
];

protected readonly open = signal<string[]>(['general']);`,
});

export const MODE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAccordion'] },
  types: { '@oge-ui/layout': ['OgeAccordionItemData'] },
  template: `<!-- multiple: several panels stay open.
     collapsible: the last open panel may be closed, leaving none.
     Without collapsible the open panel is aria-disabled (APG). -->
<oge-accordion [multiple]="multiple()" [collapsible]="collapsible()" [items]="items" />`,
  body: `protected readonly multiple = signal(true);
protected readonly collapsible = signal(true);

protected readonly items: OgeAccordionItemData[] = [
  { key: 'a', title: 'First' },
  { key: 'b', title: 'Second' },
];`,
});

export const LAZY_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeAccordion',
      'OgeAccordionContentTemplate',
      'OgeAccordionItem',
    ],
  },
  template: `<!-- deferRendering (default true): content is created on first expand.
     keepAlive (default true): it then stays mounted while collapsed. -->
<oge-accordion [keepAlive]="keepAlive()" [multiple]="true" [collapsible]="true">
  <oge-accordion-item title="First">
    <ng-template ogeAccordionContentTemplate>Created at {{ stamp() }}</ng-template>
  </oge-accordion-item>
</oge-accordion>`,
  body: `protected readonly keepAlive = signal(true);

protected stamp(): string {
  return new Date().toLocaleTimeString();
}`,
});

export const GUARD_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAccordion'] },
  types: { '@oge-ui/layout': ['OgeAccordionItemData'] },
  template: `<oge-accordion [items]="guarded" [multiple]="true" [collapsible]="true" />`,
  body: `// resolve(false) vetoes, rejection vetoes too; while the promise is
// pending the header shows a spinner and ignores further clicks
protected readonly guarded: OgeAccordionItemData[] = [
  { key: 'plain', title: 'Opens right away' },
  { key: 'slow', title: 'Confirms first', expandGuard: () => this.confirm() },
];

private confirm(): boolean {
  return confirm('Open this section?');
}`,
});

export const INVALID_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAccordion'] },
  types: { '@oge-ui/layout': ['OgeAccordionItemData'] },
  template: `<oge-accordion [items]="formSections" [multiple]="true" [collapsible]="true" #acc />
<button type="button" (click)="acc.expandInvalid()">Show all errors</button>`,
  body: `// flag the sections your form group reports as invalid
protected readonly formSections: OgeAccordionItemData[] = [
  { key: 'contact', title: 'Contact' },
  { key: 'billing', title: 'Billing', invalid: true },
  { key: 'shipping', title: 'Shipping', invalid: true },
];`,
});

export const LOADER_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeAccordion',
      'OgeAccordionContentTemplate',
      'OgeAccordionItem',
    ],
  },
  template: `<oge-accordion [multiple]="true" [collapsible]="true">
  <oge-accordion-item title="Invoices" [contentLoader]="loadInvoices">
    <ng-template ogeAccordionContentTemplate let-data="data">
      {{ data }}
    </ng-template>
  </oge-accordion-item>
</oge-accordion>`,
  body: `// a skeleton shows while pending; a rejection renders a retry button
protected readonly loadInvoices = () =>
  new Promise<string>((resolve) =>
    setTimeout(() => resolve('42 invoices'), 900),
  );`,
});

export const ACTIONS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeAccordion',
      'OgeAccordionHeaderActionsTemplate',
      'OgeAccordionItem',
    ],
  },
  template: `<!-- APG puts the panel title in a <button>; a second focusable control
     inside it would be a nested-interactive violation. Header actions are
     rendered as siblings of that button, so they are real, Tab-reachable
     controls and arrow navigation skips them. -->
<oge-accordion>
  <oge-accordion-item title="Team">
    <ng-template ogeAccordionHeaderActionsTemplate let-index="index">
      <button type="button" (click)="remove(index)">Remove</button>
    </ng-template>
    Members…
  </oge-accordion-item>
</oge-accordion>`,
  body: `protected remove(index: number): void {
  console.log('remove section', index);
}`,
});

export const PANEL_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeAccordion',
      'OgeAccordionActionRow',
      'OgeAccordionItem',
    ],
  },
  types: { '@oge-ui/layout': ['OgeAccordionExpandedEvent'] },
  template: `<!-- [(expanded)] is two-way per panel, and writing to it still runs the
     pipeline — a veto reverts the binding. #p exposes open()/close()/toggle().
     afterExpand fires once the height animation settles. -->
<oge-accordion (afterExpand)="onSettled($event)">
  <oge-accordion-item #p title="Profile" [(expanded)]="profileOpen">
    <p>…fields…</p>
    <div ogeAccordionActionRow>
      <button type="button" (click)="p.close()">Cancel</button>
      <button type="button" (click)="save()">Save</button>
    </div>
  </oge-accordion-item>
</oge-accordion>`,
  body: `protected readonly profileOpen = signal(true);

protected onSettled(event: OgeAccordionExpandedEvent): void {
  console.log('settled', event.key);
}

protected save(): void {
  console.log('saved');
}`,
});

export const STYLING_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAccordion'] },
  types: { '@oge-ui/layout': ['OgeAccordionItemData'] },
  template: `<oge-accordion
  [items]="items"
  togglePosition="start"
  displayMode="flat"
  stylingMode="filled"
  size="sm"
/>`,
  body: `protected readonly items: OgeAccordionItemData[] = [
  { key: 'a', title: 'First' },
  { key: 'b', title: 'Second' },
];`,
});
