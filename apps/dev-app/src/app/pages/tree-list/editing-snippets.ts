import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeTreeList'] },
  dataset: 'org',
  template: `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [editing]="{
    mode: 'form',
    allowUpdating: true,
    allowAdding: true,
    allowDeleting: true,
    formColCount: 2,
    formItems: ['name', 'title', { field: 'office', colSpan: 2 }]
  }"
  (initNewRow)="$event.values['title'] = 'Engineer'"
/>
<!-- treeList.addRow(parentKey) inserts under a chosen node -->`,
});
