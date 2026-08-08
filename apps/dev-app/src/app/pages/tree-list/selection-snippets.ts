import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeTreeList'] },
  types: { '@oge-ui/core': ['RowKey'] },
  dataset: 'org',
  template: `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
  selectionMode="checkbox"
  [selectionRecursive]="true"
  [(selectedKeys)]="selectedKeys"
/>`,
  body: `protected readonly selectedKeys = signal<RowKey[]>([]);`,
});
