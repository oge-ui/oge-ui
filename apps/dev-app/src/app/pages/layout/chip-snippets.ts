import { demoSource } from '../../shared/demo-source';

const STAR = `const STAR = 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.8 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z';`;

export const CHIPS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChip'] },
  before: STAR,
  template: `<!-- A plain chip is static text — no role, nothing focusable.
     icon takes SVG path data; avatar renders image → initials, aria-hidden. -->
<oge-chip label="Angular" />
<oge-chip label="Featured" [icon]="star" severity="accent" />
<oge-chip label="Ada Lovelace" [avatar]="{ name: 'Ada Lovelace' }" />
<oge-chip label="Passed" severity="success" stylingMode="outlined" />
<oge-chip label="Blocked" severity="danger" size="sm" />`,
  body: `protected readonly star = STAR;`,
});

export const SELECTABLE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChip'] },
  template: `<!-- selectable renders a toggle <button aria-pressed>; the check glyph
     and the accent frame show the state, never colour alone. -->
<oge-chip label="Remote" [selectable]="true" [(selected)]="remote" />
<oge-chip label="Full-time" [selectable]="true" [(selected)]="fullTime" />
<p>remote: {{ remote() }} · full-time: {{ fullTime() }}</p>`,
  body: `protected readonly remote = signal(true);
protected readonly fullTime = signal(false);`,
});

export const REMOVABLE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChip'] },
  template: `<!-- removable adds a separate, real remove button ("Remove Design").
     The chip moves no data — drop it in (removed). -->
@for (tag of tags(); track tag) {
  <oge-chip [label]="tag" [removable]="true" (removed)="drop(tag)" />
}`,
  body: `protected readonly tags = signal(['Design', 'Research', 'Writing']);

protected drop(tag: string): void {
  this.tags.update((tags) => tags.filter((t) => t !== tag));
}`,
});

export const SINGLE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChipList'] },
  types: { '@oge-ui/layout': ['OgeChipItem', 'OgeChipKey'] },
  template: `<!-- Selectable → an APG listbox: one tab stop, arrows / Home / End move,
     Space or Enter toggles. A second press clears a single selection. -->
<oge-chip-list
  [items]="sizes"
  selectionMode="single"
  [(selectedKeys)]="size"
  ariaLabel="Size"
/>`,
  body: `protected readonly sizes: OgeChipItem[] = [
  { key: 's', label: 'Small' },
  { key: 'm', label: 'Medium' },
  { key: 'l', label: 'Large' },
  { key: 'xl', label: 'X-Large', disabled: true },
];
protected readonly size = signal<readonly OgeChipKey[]>(['m']);`,
});

export const MULTIPLE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChipList'] },
  types: {
    '@oge-ui/layout': [
      'OgeChipItem',
      'OgeChipKey',
      'OgeChipSelectionChangedEvent',
    ],
  },
  template: `<!-- multiple → aria-multiselectable; selectionChanged carries the
     previous and the next keys plus the toggled chip. -->
<oge-chip-list
  [items]="filters"
  selectionMode="multiple"
  [(selectedKeys)]="active"
  ariaLabel="Filters"
  (selectionChanged)="last.set($event.item.label)"
/>
<p>active: {{ active().join(', ') || 'none' }} · last: {{ last() }}</p>`,
  body: `protected readonly filters: OgeChipItem[] = [
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'bug', label: 'Bug', severity: 'danger' },
  { key: 'docs', label: 'Docs', severity: 'accent' },
];
protected readonly active = signal<readonly OgeChipKey[]>(['open']);
protected readonly last = signal('—');`,
});

export const GRID_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChipList'] },
  types: { '@oge-ui/layout': ['OgeChipItem', 'OgeChipItemRemovedEvent'] },
  template: `<!-- Not selectable but removable → an APG layout grid: each chip is a
     row with a label cell and a cell holding a real remove button. Arrows walk
     the cells, Delete / Backspace remove, focus lands on the neighbour. -->
<oge-chip-list
  [items]="people()"
  [removable]="true"
  ariaLabel="Recipients"
  (itemRemoved)="remove($event)"
/>`,
  body: `protected readonly people = signal<OgeChipItem[]>([
  { key: 1, label: 'Ada Lovelace', avatar: { name: 'Ada Lovelace' } },
  { key: 2, label: 'Grace Hopper', avatar: { name: 'Grace Hopper' } },
  { key: 3, label: 'Alan Turing', avatar: { name: 'Alan Turing' } },
  { key: 4, label: 'Katherine Johnson', avatar: { name: 'Katherine Johnson' } },
]);

protected remove(event: OgeChipItemRemovedEvent): void {
  this.people.update((people) => people.filter((p) => p.key !== event.item.key));
}`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeChipList', 'OgeChipTemplate'] },
  types: { '@oge-ui/layout': ['OgeChipItem', 'OgeChipKey'] },
  template: `<!-- [ogeChipTemplate] replaces the label only: the list keeps the role,
     focus, check glyph and remove affordance. Keep it non-interactive. -->
<oge-chip-list
  [items]="languages"
  selectionMode="multiple"
  [(selectedKeys)]="picked"
  ariaLabel="Languages"
>
  <ng-template ogeChipTemplate let-item let-selected="selected">
    <strong>{{ item.label }}</strong>
    <span class="text-(--oge-muted-color)">{{ counts[item.key] }}</span>
  </ng-template>
</oge-chip-list>`,
  body: `protected readonly languages: OgeChipItem[] = [
  { key: 'ts', label: 'TypeScript' },
  { key: 'rs', label: 'Rust' },
  { key: 'go', label: 'Go' },
];
protected readonly counts: Record<string, number> = { ts: 128, rs: 42, go: 37 };
protected readonly picked = signal<readonly OgeChipKey[]>(['ts']);`,
});
