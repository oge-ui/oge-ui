import { demoSource } from '../../shared/demo-source';

const USERS = `interface User {
  id: number;
  name: string;
  role: string;
}

const USERS: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer' },
  { id: 2, name: 'Alan Turing', role: 'Researcher' },
  { id: 3, name: 'Grace Hopper', role: 'Admiral' },
  { id: 4, name: 'Margaret Hamilton', role: 'Director' },
];`;

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMention'] },
  types: { '@oge-ui/inputs': ['OgeMentionToken'] },
  before: USERS,
  template: `<!-- Type @ at the start or after a space: a caret-anchored list opens.
     Arrows move, Enter or Tab inserts "@Name ", Escape closes it until the
     next trigger. The value is plain text; [(mentions)] reports what was
     mentioned and where, and follows later edits. -->
<oge-mention
  label="Comment"
  [items]="users"
  displayExpr="name"
  valueExpr="id"
  [allowSpaces]="true"
  [(value)]="text"
  [(mentions)]="mentioned"
/>
<p>Mentioned ids: {{ ids() }}</p>`,
  body: `protected readonly users = USERS;
protected readonly text = signal('');
protected readonly mentioned = signal<readonly OgeMentionToken<User>[]>([]);
protected readonly ids = computed(() =>
  this.mentioned().map((m) => m.value).join(', '),
);`,
});

export const TRIGGERS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMention'] },
  types: { '@oge-ui/inputs': ['OgeMentionTrigger'] },
  before: `interface Tag {
  name: string;
}`,
  template: `<!-- One field, several trigger characters — each with its own items and
     expressions. -->
<oge-mention label="Task" [triggers]="triggers" [multiline]="false" />`,
  body: `protected readonly triggers: OgeMentionTrigger<Tag>[] = [
  { char: '@', items: [{ name: 'ada' }, { name: 'grace' }], displayExpr: 'name' },
  { char: '#', items: [{ name: 'urgent' }, { name: 'bug' }, { name: 'docs' }], displayExpr: 'name' },
];`,
});

export const REMOTE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMention'] },
  before: USERS,
  template: `<!-- items may be a function of the typed query (sync or a promise):
     it is debounced by searchTimeout, stale answers are ignored, and the
     list shows loading / error rows meanwhile. -->
<oge-mention
  label="Message"
  [items]="search"
  displayExpr="name"
  [searchTimeout]="200"
  [minSearchLength]="1"
/>`,
  body: `protected readonly search = (query: string): Promise<User[]> =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          USERS.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())),
        ),
      300,
    ),
  );`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMention', 'OgeMentionItemTemplate'] },
  before: USERS,
  template: `<!-- A custom suggestion row; the context carries the item, index,
     trigger, query and whether the row is active. -->
<oge-mention label="Reply" [items]="users" displayExpr="name">
  <ng-template ogeMentionItemTemplate let-user>
    <span class="flex flex-col">
      <strong>{{ user.name }}</strong>
      <small>{{ user.role }}</small>
    </span>
  </ng-template>
</oge-mention>`,
  body: `protected readonly users = USERS;`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeMention'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  before: USERS,
  template: `<!-- A FormValueControl and a ControlValueAccessor — the value is the text. -->
<oge-mention
  label="Note"
  [items]="users"
  displayExpr="name"
  hint="Mention a reviewer with @"
  [formControl]="note"
/>`,
  body: `protected readonly users = USERS;
protected readonly note = new FormControl('', [Validators.required]);`,
});
