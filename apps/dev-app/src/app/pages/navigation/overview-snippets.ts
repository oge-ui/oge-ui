import { demoSource } from '../../shared/demo-source';

const FOLDER = `interface Folder {
  id: number;
  parentId: number | null;
  name: string;
  hasItems?: boolean;
}`;

const FOLDERS = `protected readonly folders: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
];`;

export const FLAT_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  types: { '@oge-ui/core': ['RowKey'] },
  before: FOLDER,
  template: `<oge-tree-view
  [items]="folders"
  keyExpr="id"
  parentIdExpr="parentId"
  displayExpr="name"
  selectionMode="single"
  [(expandedKeys)]="open"
  [(selectedKeys)]="picked"
/>`,
  body: `${FOLDERS}

protected readonly open = signal<RowKey[]>([1]);
protected readonly picked = signal<RowKey[]>([]);`,
});

export const NESTED_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  before: `interface NestedFolder {
  id: number;
  name: string;
  children?: NestedFolder[];
}`,
  template: `<!-- nested payloads need only itemsExpr; the parent links are derived -->
<oge-tree-view [items]="tree" itemsExpr="children" displayExpr="name" />`,
  body: `protected readonly tree: NestedFolder[] = [
  {
    id: 1,
    name: 'src',
    children: [{ id: 2, name: 'app', children: [{ id: 3, name: 'main.ts' }] }],
  },
];`,
});

export const CHECK_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  types: { '@oge-ui/core': ['RowKey'] },
  before: FOLDER,
  template: `<oge-tree-view
  [items]="folders"
  displayExpr="name"
  selectionMode="multiple"
  showCheckBoxes="selectAll"
  [(selectedKeys)]="picked"
/>

<!-- selectedKeysMode projects the stored set on the way out:
     'all' (default) · 'leavesOnly' · 'excludeRecursive' -->`,
  body: `${FOLDERS}

protected readonly picked = signal<RowKey[]>([]);`,
});

export const SEARCH_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  before: FOLDER,
  template: `<oge-tree-view
  [items]="folders"
  displayExpr="name"
  [searchEnabled]="true"
  searchMode="contains"
  filterMode="withAncestors"
/>`,
  body: FOLDERS,
});

export const LAZY_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  before: FOLDER,
  template: `<oge-tree-view
  [items]="roots"
  displayExpr="name"
  hasItemsExpr="hasItems"
  [loadChildren]="loadChildren"
/>`,
  body: `protected readonly roots: Folder[] = [
  { id: 1, parentId: null, name: 'Documents', hasItems: true },
];

// a skeleton row shows while the promise is pending
protected readonly loadChildren = (parent: Folder): Promise<Folder[]> =>
  fetch(\`/api/folders?parent=\${parent.id}\`).then((r) => r.json());`,
});

export const VIRTUAL_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  before: FOLDER,
  template: `<!-- every row must actually be itemHeight tall -->
<oge-tree-view
  [items]="tenThousand"
  displayExpr="name"
  [virtualScroll]="{ itemHeight: 30 }"
  height="320px"
/>`,
  body: `protected readonly tenThousand: Folder[] = Array.from(
  { length: 10000 },
  (_, i) => ({ id: i + 1, parentId: null, name: \`Item \${i + 1}\` }),
);`,
});

export const DND_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  types: { '@oge-ui/navigation': ['OgeTreeReorderedEvent'] },
  before: FOLDER,
  template: `<oge-tree-view
  [items]="folders()"
  displayExpr="name"
  [allowDragging]="true"
  [allowDropInside]="true"
  (itemReordered)="reparent($event)"
/>`,
  body: `protected readonly folders = signal<Folder[]>([
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
]);

// the tree never mutates your data; apply the move yourself
protected reparent(e: OgeTreeReorderedEvent<Folder>): void {
  this.folders.update((rows) =>
    rows.map((row) =>
      row.id === e.dragKey
        ? {
            ...row,
            parentId:
              e.position === 'inside'
                ? (e.dropKey as number)
                : e.dropItem.parentId,
          }
        : row,
    ),
  );
}`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeItemTemplate', 'OgeTreeView'] },
  before: FOLDER,
  template: `<oge-tree-view [items]="folders" displayExpr="name">
  <!-- the TypeFor input is a pure type anchor: bind the same array you pass
       to [items] and let-item is typed as your row, not unknown -->
  <ng-template
    ogeTreeItemTemplate
    [ogeTreeItemTemplateTypeFor]="folders"
    let-item
    let-level="level"
  >
    <strong>{{ item.name }}</strong>
    <small>level {{ level }}</small>
  </ng-template>
</oge-tree-view>

<!-- the template renders inside role="treeitem", so it must not contain
     focusable controls — that would be a nested-interactive violation -->`,
  body: FOLDERS,
});

export const BETWEEN_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  types: {
    '@oge-ui/navigation': ['OgeTreeReorderedEvent', 'OgeTreeTransferredEvent'],
  },
  before: `${FOLDER}

type List = 'projects' | 'archive';`,
  template: `<!-- trees sharing a dragGroup accept each other's nodes;
     Ctrl+X on a node and Ctrl+V on a target is the keyboard twin -->
<oge-tree-view
  treeId="projects"
  [items]="lists.projects()"
  displayExpr="name"
  [allowDragging]="true"
  dragGroup="files"
  ariaLabel="Projects"
  (itemReordered)="received('projects', $event)"
  (itemTransferred)="removed('projects', $event)"
/>
<oge-tree-view
  treeId="archive"
  [items]="lists.archive()"
  displayExpr="name"
  [allowDragging]="true"
  dragGroup="files"
  ariaLabel="Archive"
  (itemReordered)="received('archive', $event)"
  (itemTransferred)="removed('archive', $event)"
/>`,
  body: `protected readonly lists = {
  projects: signal<Folder[]>([
    { id: 1, parentId: null, name: 'Website' },
    { id: 2, parentId: 1, name: 'Landing page' },
    { id: 3, parentId: null, name: 'Mobile app' },
  ]),
  archive: signal<Folder[]>([{ id: 11, parentId: null, name: '2024' }]),
};

// the trees never move data: the target adds, the source removes
protected received(list: List, e: OgeTreeReorderedEvent<Folder>): void {
  const parentId =
    e.position === 'inside' ? (e.dropKey as number) : e.dropItem.parentId;
  this.lists[list].update((rows) => [
    ...rows.filter((row) => row.id !== e.dragKey),
    { ...e.dragItem, parentId },
  ]);
}

protected removed(list: List, e: OgeTreeTransferredEvent<Folder>): void {
  this.lists[list].update((rows) => rows.filter((row) => row.id !== e.dragKey));
}`,
});

export const EDITING_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  types: { '@oge-ui/navigation': ['OgeTreeEditedEvent'] },
  before: FOLDER,
  template: `<!-- F2 (or a double-click here) renames; Enter / blur commits,
     Escape cancels and the focus returns to the node -->
<oge-tree-view
  [items]="folders()"
  displayExpr="name"
  [allowEditing]="true"
  [editOnDblClick]="true"
  [validateEdit]="validate"
  (itemEdited)="rename($event)"
/>`,
  body: `protected readonly folders = signal<Folder[]>([
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
]);

protected readonly validate = (value: string) =>
  value.length > 40 ? 'Keep names under 40 characters.' : null;

// the tree does not write the label: apply it to your data
protected rename(e: OgeTreeEditedEvent<Folder>): void {
  this.folders.update((rows) =>
    rows.map((row) => (row.id === e.key ? { ...row, name: e.value } : row)),
  );
}`,
});

export const PAGING_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeTreeView'] },
  types: { '@oge-ui/navigation': ['OgeTreeChildPageEvent'] },
  before: FOLDER,
  template: `<!-- five children per parent, then a "Show N more items" row;
     aria-setsize keeps reporting the real total -->
<oge-tree-view
  [items]="mail"
  displayExpr="name"
  [childPageSize]="5"
  [expandedKeys]="[1]"
  (childPageShown)="pageShown($event)"
/>
<p>{{ progress() }}</p>`,
  body: `protected readonly progress = signal('');
protected readonly mail: Folder[] = [
  { id: 1, parentId: null, name: 'Inbox' },
  ...Array.from({ length: 23 }, (_, i) => ({
    id: 100 + i,
    parentId: 1,
    name: \`Message \${i + 1}\`,
  })),
];

protected pageShown(e: OgeTreeChildPageEvent<Folder>): void {
  this.progress.set(\`\${e.shown} of \${e.total} shown\`);
}`,
});
