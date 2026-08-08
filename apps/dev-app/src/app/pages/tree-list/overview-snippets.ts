import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeColumn', 'OgeTreeList'] },
  dataset: 'org',
  template: `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
>
  <oge-column field="name" caption="Name" />
  <oge-column field="title" caption="Title" [width]="140" />
  <oge-column field="office" caption="Office" [width]="140" />
  <oge-column field="headcount" caption="Reports" dataType="number" [width]="110" />
</oge-tree-list>`,
});
