import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/** Mirror of `../tree-list/lazy-loading-snippets.ts`. Pure data. */
export const TREE_LAZY_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Children per expansion',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-tree-list': ['OgeTreeList'],
        '@oge-ui/core': ['CustomDataSource'],
      },
      name: 'LazyOrg',
      before: `interface Node {
  id: number;
  parentId: number | null;
  name: string;
  hasReports: boolean;
}

/** The tree list asks for one level at a time: ['parentId', '=', key]. */
function parentKeyOf(options: { filter?: unknown }): string {
  const filter = options.filter as [string, string, unknown] | undefined;
  return String(filter?.[2] ?? '');
}

// children are fetched per expansion:
// load({ filter: ['parentId', '=', parentKey] })
const source = new CustomDataSource<Node>({
  key: 'id',
  load: (options) =>
    fetch(\`/api/org?parent=\${parentKeyOf(options)}\`)
      .then((response) => response.json())
      .then((data: Node[]) => ({ data, totalCount: data.length })),
});`,
      jsx: `<OgeTreeList
  data={source}
  keyExpr="id"
  parentIdExpr="parentId"
  hasItemsExpr="hasReports"
  columns={[{ field: 'name' }]}
/>`,
    }),
  },
];
