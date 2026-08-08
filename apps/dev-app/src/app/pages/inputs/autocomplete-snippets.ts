import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeAutocomplete'] },
  template: `<oge-autocomplete
  label="City"
  [items]="cities"
  [(value)]="cityName"
/>`,
  body: `protected readonly cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];

// the committed value is the TEXT itself, not an item value
protected readonly cityName = signal('');`,
});

export const TUNING_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeAutocomplete'] },
  template: `<oge-autocomplete
  label="Product"
  [items]="products"
  displayExpr="name"
  searchMode="startswith"
  [minSearchLength]="2"
  [maxItemCount]="5"
  [(value)]="productName"
/>`,
  body: `protected readonly products = [
  { id: 1, name: 'Aurora Display' },
  { id: 2, name: 'Aurora Keyboard' },
  { id: 3, name: 'Nimbus Router' },
];

protected readonly productName = signal('');`,
});

export const FORCE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeAutocomplete'] },
  template: `<oge-autocomplete
  label="Assignee"
  [items]="users"
  displayExpr="name"
  [forceSelection]="true"
  [(value)]="assigneeName"
  (selectionChanged)="assignee = $event.item"
/>

<!-- non-matching text reverts on blur; an exact match resolves
     to the item (canonical casing) and fires selectionChanged -->`,
  body: `protected readonly users = [
  { id: 1, name: 'Elif Kaya' },
  { id: 2, name: 'Mert Demir' },
];

protected readonly assigneeName = signal('');
protected assignee: unknown = null;`,
});

export const VIRTUAL_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeAutocomplete', 'OgeSelectBox'] },
  template: `<!-- 10 000 rows, ~15 in the DOM -->
<oge-autocomplete
  label="Account"
  [items]="accounts"
  [virtualScroll]="true"
  [maxItemCount]="10000"
  [(value)]="accountName"
/>

<oge-select-box
  label="Account"
  [items]="accounts"
  [searchEnabled]="true"
  [virtualScroll]="{ overscan: 6 }"
  [(value)]="accountId"
/>`,
  body: `protected readonly accounts = Array.from(
  { length: 10000 },
  (_, index) => \`Account \${index + 1}\`,
);

protected readonly accountName = signal('');
protected readonly accountId = signal<unknown>(null);`,
});

export const LAZY_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeAutocomplete'] },
  template: `<oge-autocomplete
  label="Repository"
  [items]="loadRepos"
  [(value)]="repo"
/>

<!-- or fully server-side: keep [items] in sync yourself -->
<oge-autocomplete
  [items]="serverItems()"
  [loading]="serverLoading()"
  [searchTimeout]="300"
  (searchChanged)="queryServer($event.text)"
/>`,
  body: `protected readonly repo = signal('');

// invoked once, on first open
protected readonly loadRepos = (): Promise<string[]> =>
  fetch('/api/repos').then((response) => response.json());

protected readonly serverItems = signal<string[]>([]);
protected readonly serverLoading = signal(false);

protected queryServer(text: string): void {
  this.serverLoading.set(true);
  fetch(\`/api/repos?q=\${encodeURIComponent(text)}\`)
    .then((response) => response.json())
    .then((items: string[]) => this.serverItems.set(items))
    .finally(() => this.serverLoading.set(false));
}`,
});

export const CHROME_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeAutocomplete'] },
  template: `<oge-autocomplete
  label="Tag"
  labelMode="floating"
  [showClearButton]="true"
  [showDropDownButton]="true"
  [openOnFieldClick]="true"
  hint="Start typing to search"
  [items]="tags"
  [(value)]="tag"
/>`,
  body: `protected readonly tags = ['angular', 'signals', 'zoneless'];
protected readonly tag = signal('');`,
});
