import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeColumn', 'OgeTreeList'] },
  dataset: 'org',
  template: `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
  [filterRow]="true"
  [searchPanel]="true"
  filterMode="withAncestors"
>
  <oge-column field="name" caption="Name" />
  <oge-column field="office" caption="Office" />
</oge-tree-list>`,
});
