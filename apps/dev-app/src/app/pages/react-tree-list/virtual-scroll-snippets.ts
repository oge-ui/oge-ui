import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/** Mirror of `../tree-list/virtual-scroll-snippets.ts`. Pure data. */
export const TREE_VIRTUAL_DEMOS: readonly ReactDemo[] = [
  {
    title: '100.000 nodes',
    source: reactDemoSource({
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      name: 'BigTree',
      before: `// 100 branches × 999 rows = 100.000 nodes
const rows = Array.from({ length: 100 }, (_, branch) => [
  { id: branch * 1000, parentId: null, name: \`Branch \${branch + 1}\` },
  ...Array.from({ length: 999 }, (_, leaf) => ({
    id: branch * 1000 + leaf + 1,
    parentId: branch * 1000,
    name: \`Node \${leaf + 1}\`,
  })),
]).flat();`,
      jsx: `<OgeTreeList
  data={rows}
  keyExpr="id"
  parentIdExpr="parentId"
  autoExpandAll
  virtualScroll
  style={{ height: 480 }}
  columns={[{ field: 'name' }]}
/>`,
    }),
  },
];
