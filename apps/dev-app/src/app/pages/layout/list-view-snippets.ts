import { demoSource } from '../../shared/demo-source';

const PEOPLE = `interface Person {
  id: number;
  name: string;
  role: string;
  team: string;
  away?: boolean;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Analyst', team: 'Research' },
  { id: 2, name: 'Grace Hopper', role: 'Compiler lead', team: 'Platform' },
  { id: 3, name: 'Alan Turing', role: 'Cryptanalyst', team: 'Research', away: true },
  { id: 4, name: 'Margaret Hamilton', role: 'Flight software', team: 'Platform' },
  { id: 7, name: 'Barbara Liskov', role: 'Abstractions', team: 'Design' },
];`;

export const BASICS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeListView', 'OgeListViewItemTemplate'],
  },
  types: { '@oge-ui/layout': ['OgeListViewItemClickEvent'] },
  before: PEOPLE,
  template: `<!-- selectionMode "none" (the default) renders role="list": the items hold
     one roving tab stop, arrows / Home / End / type-ahead move it and Enter
     (or a click) reports itemClick. -->
<oge-list-view
  [items]="people"
  displayExpr="name"
  ariaLabel="Team"
  (itemClick)="onClick($event)"
>
  <ng-template ogeListViewItemTemplate let-person>
    <span class="flex flex-col">
      <strong>{{ person.name }}</strong>
      <small>{{ person.role }}</small>
    </span>
  </ng-template>
</oge-list-view>
<p>Opened: {{ opened() ?? '—' }}</p>`,
  body: `protected readonly people = PEOPLE;
protected readonly opened = signal<string | null>(null);
protected onClick(event: OgeListViewItemClickEvent<Person>): void {
  this.opened.set(event.item.name);
}`,
});

export const SELECTION_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeListView'] },
  types: { '@oge-ui/layout': ['OgeListViewKey'] },
  before: PEOPLE,
  template: `<!-- A selectable list is an APG listbox: the viewport takes focus and tracks
     the active option with aria-activedescendant. Space toggles, Shift+arrows
     extend, Ctrl+A selects all; disabledExpr marks options aria-disabled. -->
<oge-list-view
  [items]="people"
  displayExpr="name"
  disabledExpr="away"
  selectionMode="multiple"
  [showSelectionControls]="true"
  [(selectedKeys)]="picked"
  ariaLabel="Reviewers"
/>
<p>Selected: {{ picked().join(', ') || 'none' }}</p>`,
  body: `protected readonly people = PEOPLE;
protected readonly picked = signal<readonly OgeListViewKey[]>([2]);`,
});

export const GROUPING_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeListView', 'OgeListViewGroupTemplate'],
  },
  before: PEOPLE,
  template: `<!-- Each group is a labelled segment; its header is aria-hidden and
     position: sticky inside the segment, so the next header pushes it out. -->
<oge-list-view
  [items]="people"
  displayExpr="name"
  groupExpr="team"
  selectionMode="single"
  height="260px"
  ariaLabel="People by team"
>
  <ng-template ogeListViewGroupTemplate let-team let-count="count">
    {{ team }} · {{ count }}
  </ng-template>
</oge-list-view>`,
  body: `protected readonly people = PEOPLE;`,
});

export const VIRTUAL_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeListView'] },
  types: { '@oge-ui/layout': ['OgeListViewKey'] },
  template: `<!-- Fixed row heights let the list render only a window of rows — 10 000
     tickets stay instant. Keyboard navigation scrolls the active option into
     the window first, so aria-activedescendant always resolves. -->
<oge-list-view
  [items]="tickets"
  displayExpr="name"
  selectionMode="single"
  [(selectedKeys)]="selected"
  [virtualScroll]="{ itemHeight: 44 }"
  [height]="320"
  ariaLabel="Tickets"
/>`,
  body: `protected readonly tickets = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: \`Ticket #\${String(i + 1).padStart(5, '0')}\`,
}));
protected readonly selected = signal<readonly OgeListViewKey[]>([]);`,
});

export const SEARCH_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeListView'] },
  before: `interface City {
  id: number;
  name: string;
  country: string;
}

const NAMES = ['İstanbul', 'Ankara', 'Berlin', 'München', 'Paris', 'Zürich', 'Kraków', 'São Paulo'];

function page(index: number, size = 16): City[] {
  return Array.from({ length: size }, (_, i) => {
    const n = index * size + i;
    return { id: n + 1, name: \`\${NAMES[n % NAMES.length]} \${n + 1}\`, country: 'Demo' };
  });
}`,
  template: `<!-- The search field filters locale- and accent-insensitively ("istanbul"
     finds "İstanbul") and announces the result count. pageLoadMode "scroll"
     asks for the next page near the end; "button" renders a Load more button. -->
<oge-list-view
  [items]="cities()"
  displayExpr="name"
  [searchEnabled]="true"
  pageLoadMode="scroll"
  [hasMore]="cities().length < 96"
  [loading]="loading()"
  [height]="300"
  ariaLabel="Cities"
  (loadMoreRequested)="loadMore()"
/>`,
  body: `protected readonly cities = signal<City[]>(page(0));
protected readonly loading = signal(false);

protected loadMore(): void {
  this.loading.set(true);
  setTimeout(() => {
    const next = page(this.cities().length / 16);
    this.cities.set([...this.cities(), ...next]);
    this.loading.set(false);
  }, 600);
}`,
});

export const ACTIONS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeListView'] },
  types: {
    '@oge-ui/layout': [
      'OgeListViewItemAction',
      'OgeListViewItemActionClickEvent',
    ],
  },
  before: `interface Message {
  id: number;
  from: string;
  subject: string;
}`,
  template: `<!-- Swipe a row sideways on touch (mirrored in RTL) or hover it with a mouse
     to reveal the actions; the keyboard twin is each action's shortcut,
     advertised in aria-keyshortcuts. -->
<oge-list-view
  [items]="inbox()"
  displayExpr="subject"
  selectionMode="single"
  [itemActions]="actions"
  ariaLabel="Inbox"
  (itemActionClick)="onAction($event)"
/>
<p>Last action: {{ last() ?? '—' }}</p>`,
  body: `protected readonly inbox = signal<Message[]>([
  { id: 1, from: 'Build bot', subject: 'Nightly build passed' },
  { id: 2, from: 'Ayşe Kaya', subject: 'Design review moved to Friday' },
  { id: 3, from: 'Billing', subject: 'Your invoice for October' },
]);
protected readonly last = signal<string | null>(null);
protected readonly actions: OgeListViewItemAction[] = [
  { key: 'archive', label: 'Archive', severity: 'accent', shortcut: 'Shift+A' },
  { key: 'delete', label: 'Delete', severity: 'danger', shortcut: 'Delete' },
];

protected onAction(event: OgeListViewItemActionClickEvent<Message>): void {
  this.last.set(\`\${event.action.label}: \${event.item.subject}\`);
  this.inbox.set(this.inbox().filter((m) => m.id !== event.key));
}`,
});
