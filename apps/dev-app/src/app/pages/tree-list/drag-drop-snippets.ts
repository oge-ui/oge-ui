import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeTreeList'] },
  types: { '@oge-ui/tree-list': ['OgeTreeRowReparentEvent'] },
  dataset: 'org',
  template: `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
  [rowDragging]="true"
  (rowReparented)="onReparent($event)"
/>`,
  body: `protected onReparent(event: OgeTreeRowReparentEvent<unknown>): void {
  console.log(event.key, 'moved under', event.toParentKey);
}`,
});
