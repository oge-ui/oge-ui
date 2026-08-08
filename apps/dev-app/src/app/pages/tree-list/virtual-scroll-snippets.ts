import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeTreeList'] },
  template: `<!-- 100 branches × 999 rows = 100.000 nodes -->
<oge-tree-list
  [data]="rows"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
  [virtualScroll]="true"
  style="height: 480px"
/>`,
  body: `protected readonly rows = Array.from({ length: 100 }, (_, branch) => [
  { id: branch * 1000, parentId: null, name: \`Branch \${branch + 1}\` },
  ...Array.from({ length: 999 }, (_, leaf) => ({
    id: branch * 1000 + leaf + 1,
    parentId: branch * 1000,
    name: \`Node \${leaf + 1}\`,
  })),
]).flat();`,
});
