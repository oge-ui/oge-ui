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

export const ADAPTIVE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox', 'OgeTagBox', 'OgeDateBox'] },
  template: `<!-- below 600px wide: bottom sheets / a full-screen calendar -->
<oge-select-box
  label="City"
  adaptiveMode="auto"
  [items]="cities"
  [searchEnabled]="true"
  [(value)]="city"
/>
<oge-tag-box
  label="Skills"
  adaptiveMode="auto"
  [items]="skills"
  [(value)]="skillIds"
/>
<oge-date-box label="Due date" adaptiveMode="auto" [(value)]="due" />`,
  body: `protected readonly cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];
protected readonly skills = ['Angular', 'Signals', 'Nx', 'Vitest', 'SCSS'];
protected readonly city = signal<unknown>(null);
protected readonly skillIds = signal<readonly unknown[]>([]);
protected readonly due = signal<Date | null>(null);

// or for the whole app:
// providers: [provideOgeInputsConfig({ adaptiveMode: 'auto' })]`,
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

export const REMOTE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  before: `interface Customer {
  id: number;
  name: string;
}

/** 5,000 rows "on the server" — the editor only ever asks for one page. */
const CUSTOMERS: Customer[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: \`Customer \${String(i + 1).padStart(4, '0')}\`,
}));`,
  template: `<oge-select-box
  label="Customer"
  displayExpr="name"
  valueExpr="id"
  [dataSource]="customers"
  [pageSize]="40"
  [searchEnabled]="true"
  [searchTimeout]="300"
  [virtualScroll]="true"
  [showClearButton]="true"
  [(value)]="customerId"
/>`,
  body: `protected readonly customerId = signal<unknown>(1234);

/**
 * Any @oge-ui/core DataSource works. The editor sends skip/take + searchText,
 * aborts superseded requests (options.signal) and caches pages per search;
 * byKey resolves a value no loaded page holds (the initial 1234 here).
 */
protected readonly customers = Object.assign(
  new CustomDataSource<Customer>({
    key: 'id',
    load: async ({ skip = 0, take = 40, searchText }) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const term = (searchText ?? '').toLowerCase();
      const rows = CUSTOMERS.filter((c) => c.name.toLowerCase().includes(term));
      return { data: rows.slice(skip, skip + take), totalCount: rows.length };
    },
  }),
  {
    byKey: async (key: unknown) =>
      CUSTOMERS.find((c) => c.id === key) ?? null,
  },
);`,
});

export const TEMPLATES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSelectBox'] },
  types: {
    '@oge-ui/inputs': ['OgeDropDownClosingEvent'],
  },
  template: `<oge-select-box
  label="Status"
  [items]="statuses"
  displayExpr="name"
  valueExpr="id"
  groupBy="phase"
  [groupTemplate]="group"
  [fieldTemplate]="field"
  [itemTemplate]="option"
  [headerTemplate]="header"
  [footerTemplate]="footer"
  (closing)="onClosing($event)"
  [(value)]="statusId"
/>

<ng-template #group let-label>
  <span class="demo-group">Phase · {{ label }}</span>
</ng-template>
<ng-template #field let-item let-text="text">
  @if (item) {
    <span class="demo-dot" [style.background]="item.color"></span>
  }
  {{ text }}
</ng-template>
<ng-template #option let-item>
  <span class="demo-dot" [style.background]="item.color"></span>
  {{ item.name }}
</ng-template>
<ng-template #header let-items>{{ items.length }} statuses</ng-template>
<ng-template #footer>
  <label>
    <input type="checkbox" [checked]="pinned()" (change)="pinned.set(!pinned())" />
    Keep open (cancels closing)
  </label>
</ng-template>`,
  body: `protected readonly statuses = [
  { id: 'todo', name: 'To do', phase: 'Open', color: '#94a3b8' },
  { id: 'doing', name: 'In progress', phase: 'Open', color: '#6366f1' },
  { id: 'review', name: 'In review', phase: 'Open', color: '#f59e0b' },
  { id: 'done', name: 'Done', phase: 'Closed', color: '#10b981' },
];
protected readonly statusId = signal<unknown>('doing');
protected readonly pinned = signal(false);

/** A cancelable pre-event: veto Escape / outside-click closes while pinned. */
protected onClosing(event: OgeDropDownClosingEvent): void {
  if (this.pinned() && event.reason !== 'select') event.cancel = true;
}`,
});

export const TAGBOX_FEATURES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTagBox'] },
  types: { '@oge-ui/inputs': ['OgeSelectBoxCustomItemEvent'] },
  template: `<oge-tag-box
  label="Skills"
  [items]="skills()"
  displayExpr="name"
  valueExpr="id"
  groupBy="area"
  [searchEnabled]="true"
  [showSelectAll]="true"
  [acceptCustomValue]="true"
  [maxSelectedItems]="5"
  [maxDisplayedTags]="3"
  [tagTemplate]="tag"
  hint="Type a new skill and press Enter"
  (customItemCreating)="createSkill($event)"
  [(value)]="skillIds"
/>

<ng-template #tag let-item let-text="text">#{{ text }}</ng-template>`,
  body: `protected readonly skills = signal([
  { id: 1, name: 'Angular', area: 'Frontend' },
  { id: 2, name: 'Signals', area: 'Frontend' },
  { id: 3, name: 'SCSS', area: 'Frontend' },
  { id: 4, name: 'Nx', area: 'Tooling' },
  { id: 5, name: 'Vitest', area: 'Tooling' },
  { id: 6, name: 'Playwright', area: 'Tooling' },
]);
protected readonly skillIds = signal<readonly unknown[]>([1, 4]);
private nextId = 100;

protected createSkill(
  event: OgeSelectBoxCustomItemEvent<{ id: number; name: string; area: string }>,
): void {
  const item = { id: this.nextId++, name: event.text, area: 'Custom' };
  this.skills.update((all) => [...all, item]);
  event.customItem = item;
}`,
});

export const TAGBOX_REMOTE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTagBox'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  before: `interface City {
  id: number;
  name: string;
}

const CITIES: City[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i + 1,
  name: \`City \${i + 1}\`,
}));`,
  template: `<oge-tag-box
  label="Delivery cities"
  displayExpr="name"
  valueExpr="id"
  [dataSource]="cities"
  [searchEnabled]="true"
  [virtualScroll]="true"
  [(value)]="cityIds"
/>`,
  body: `protected readonly cityIds = signal<readonly unknown[]>([]);

protected readonly cities = new CustomDataSource<City>({
  key: 'id',
  load: async ({ skip = 0, take = 30, searchText, signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    signal?.throwIfAborted(); // a newer search superseded this request
    const term = (searchText ?? '').toLowerCase();
    const rows = CITIES.filter((c) => c.name.toLowerCase().includes(term));
    return { data: rows.slice(skip, skip + take), totalCount: rows.length };
  },
});`,
});
