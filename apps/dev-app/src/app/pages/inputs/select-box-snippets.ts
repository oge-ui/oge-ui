import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  template: `<oge-select-box
  label="City"
  [items]="cities"
  [(value)]="city"
/>`,
  body: `protected readonly cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];
protected readonly city = signal<unknown>(null);`,
});

export const MAPPING_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  template: `<oge-select-box
  label="Assignee"
  [items]="users"
  displayExpr="name"
  valueExpr="id"
  [searchEnabled]="true"
  [showClearButton]="true"
  [(value)]="assigneeId"
  (searchChanged)="onSearch($event.text)"
/>`,
  body: `protected readonly users = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
  { id: 3, name: 'Deniz Ünal', role: 'Engineering' },
];

protected readonly assigneeId = signal<unknown>(null);

protected onSearch(text: string): void {
  console.log('searching for', text);
}`,
});

export const GROUP_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  types: { '@oge-ui/inputs': ['OgeSelectBoxCustomItemEvent'] },
  template: `<!-- flat data, grouped on the fly -->
<oge-select-box
  label="Team member"
  [items]="users"
  displayExpr="name"
  valueExpr="id"
  groupBy="role"
  [(value)]="memberId"
/>

<!-- typed text becomes a new item -->
<oge-select-box
  label="Tag"
  [items]="tags()"
  [searchEnabled]="true"
  [acceptCustomValue]="true"
  (customItemCreating)="createTag($event)"
  [(value)]="tag"
/>`,
  body: `protected readonly users = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
];

protected readonly memberId = signal<unknown>(null);
protected readonly tags = signal(['angular', 'signals']);
protected readonly tag = signal<unknown>(null);

protected createTag(event: OgeSelectBoxCustomItemEvent<string>): void {
  event.customItem = event.text; // or a promise, or null to reject
  this.tags.update((current) => [...current, event.text]);
}`,
});

export const LAZY_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  template: `<oge-select-box
  label="Warehouse"
  [items]="loadWarehouses"
  [(value)]="warehouse"
/>`,
  body: `protected readonly warehouse = signal<unknown>(null);

// invoked once, on first open — loading/error rows render while pending
protected readonly loadWarehouses = () =>
  new Promise<string[]>((resolve) =>
    setTimeout(() => resolve(['Hamburg', 'İzmir', 'Rotterdam']), 900),
  );`,
});

export const TAGBOX_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTagBox'] },
  template: `<oge-tag-box
  label="Skills"
  [items]="skills"
  [searchEnabled]="true"
  [showClearButton]="true"
  [(value)]="selectedSkills"
  (selectionChanged)="onDelta($event.addedItems, $event.removedItems)"
/>

<oge-tag-box
  label="Team"
  [items]="users"
  displayExpr="name"
  valueExpr="id"
  imageExpr="avatar"
  [maxDisplayedTags]="3"
  [(value)]="teamIds"
/>`,
  body: `protected readonly skills = ['Angular', 'TypeScript', 'CSS', 'Testing'];
protected readonly selectedSkills = signal<unknown[]>(['Angular']);

protected readonly users = [
  { id: 1, name: 'Elif Kaya', avatar: '/avatars/1.png' },
  { id: 2, name: 'Mert Demir', avatar: '/avatars/2.png' },
];
protected readonly teamIds = signal<unknown[]>([]);

protected onDelta(added: readonly unknown[], removed: readonly unknown[]): void {
  console.log({ added, removed });
}`,
});

export const STATES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  template: `<oge-select-box
  label="Plan"
  [items]="plans"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="soldOut"
  [(value)]="planId"
/>`,
  body: `protected readonly plans = [
  { id: 'free', name: 'Free', soldOut: false },
  { id: 'pro', name: 'Pro', soldOut: false },
  { id: 'enterprise', name: 'Enterprise', soldOut: true },
];

protected readonly planId = signal<unknown>('free');`,
});

export const CHROME_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  template: `<oge-select-box
  label="Country"
  labelMode="floating"
  [items]="countries"
  [showClearButton]="true"
  hint="Shipping destination"
  [(value)]="country"
/>

<oge-select-box
  label="Country"
  size="sm"
  stylingMode="filled"
  subscriptSizing="none"
  [items]="countries"
  [(value)]="country"
/>`,
  body: `protected readonly countries = ['Germany', 'Netherlands', 'Türkiye'];
protected readonly country = signal<unknown>(null);`,
});
