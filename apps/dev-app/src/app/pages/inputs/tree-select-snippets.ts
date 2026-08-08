import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTreeSelect'] },
  template: `<oge-tree-select
  label="Folder"
  [items]="folders"
  keyExpr="id"
  parentIdExpr="parentId"
  displayExpr="name"
  [rootValue]="null"
  [(value)]="folderId"
/>`,
  body: `protected readonly folders = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
];
protected readonly folderId = signal<unknown>(null);`,
});

export const NESTED_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTreeSelect'] },
  template: `<!-- nested payloads need only itemsExpr -->
<oge-tree-select
  label="Source file"
  [items]="tree"
  itemsExpr="children"
  displayExpr="name"
  [searchEnabled]="true"
  [(value)]="fileId"
/>`,
  body: `protected readonly tree = [
  { id: 1, name: 'src', children: [{ id: 2, name: 'main.ts' }] },
];
protected readonly fileId = signal<unknown>(null);`,
});

export const MULTIPLE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTreeSelect'] },
  template: `<oge-tree-select
  label="Permissions"
  [items]="folders"
  displayExpr="name"
  [rootValue]="null"
  selectionMode="multiple"
  showCheckBoxes="selectAll"
  selectedKeysMode="leavesOnly"
  [(value)]="permissions"
/>`,
  body: `protected readonly folders = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
];

// checking a node cascades to its descendants; 'leavesOnly' reports
// just the childless keys, so the value stays the concrete grants
protected readonly permissions = signal<unknown>([]);`,
});

export const LAZY_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTreeSelect'] },
  template: `<oge-tree-select
  label="Remote folder"
  [items]="roots"
  displayExpr="name"
  [rootValue]="null"
  hasItemsExpr="hasItems"
  [loadChildren]="loadChildren"
  [(value)]="remoteId"
/>`,
  body: `protected readonly roots = [
  { id: 1, parentId: null, name: 'Server root', hasItems: true },
  { id: 2, parentId: null, name: 'readme.txt', hasItems: false },
];
protected readonly remoteId = signal<unknown>(null);

// called once per node, on first expand — a placeholder row shows meanwhile
protected readonly loadChildren = (parent: { id: number; name: string }) =>
  new Promise<{ id: number; parentId: number; name: string }[]>((resolve) =>
    setTimeout(
      () => resolve([{ id: parent.id * 100, parentId: parent.id, name: 'logs' }]),
      700,
    ),
  );`,
});
