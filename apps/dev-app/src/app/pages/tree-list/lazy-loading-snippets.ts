import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeTreeList'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  before: `interface Node {
  id: number;
  parentId: number | null;
  name: string;
  hasReports: boolean;
}`,
  template: `<!-- children are fetched per expansion:
     load({ filter: ['parentId', '=', parentKey] }) -->
<oge-tree-list
  [data]="source"
  keyExpr="id"
  parentIdExpr="parentId"
  hasItemsExpr="hasReports"
/>`,
  body: `protected readonly source = new CustomDataSource<Node>({
  key: 'id',
  load: (options) =>
    fetch(\`/api/org?parent=\${parentKeyOf(options)}\`)
      .then((response) => response.json())
      .then((data: Node[]) => ({ data, totalCount: data.length })),
});`,
  after: `/** The tree list asks for one level at a time: ['parentId', '=', key]. */
function parentKeyOf(options: { filter?: unknown }): string {
  const filter = options.filter as [string, string, unknown] | undefined;
  return String(filter?.[2] ?? '');
}`,
});
