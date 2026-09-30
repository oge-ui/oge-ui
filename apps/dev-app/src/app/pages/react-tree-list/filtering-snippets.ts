import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';
import { ORG_NODE } from './org-node-source';

/** Mirror of `../tree-list/filtering-snippets.ts`. Pure data. */
export const TREE_FILTERING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Ancestors preserved',
    source: reactDemoSource({
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      name: 'FilteredOrg',
      before: ORG_NODE,
      jsx: `<OgeTreeList
  data={org}
  keyExpr="id"
  parentIdExpr="parentId"
  autoExpandAll
  filterRow
  searchPanel
  headerFilter
  filterMode="withAncestors"
  columns={[
    { field: 'name', caption: 'Name' },
    { field: 'office', caption: 'Office' },
  ]}
/>`,
    }),
  },
];
