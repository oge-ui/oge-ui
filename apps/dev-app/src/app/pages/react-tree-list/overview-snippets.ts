import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';
import { ORG_NODE } from './org-node-source';

/**
 * Demo source for the React tree-list overview — mirror of
 * `../tree-list/overview-snippets.ts`: the same org chart, the same four
 * columns, every row expanded. Pure data, no React imports.
 */
export const TREE_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Flat id/parentId data',
    source: reactDemoSource({
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      name: 'OrgChart',
      before: ORG_NODE,
      jsx: `<OgeTreeList
  data={org}
  keyExpr="id"
  parentIdExpr="parentId"
  autoExpandAll
  columns={[
    { field: 'name', caption: 'Name' },
    { field: 'title', caption: 'Title', width: 140 },
    { field: 'office', caption: 'Office', width: 140 },
    { field: 'headcount', caption: 'Reports', dataType: 'number', width: 110 },
  ]}
/>`,
    }),
  },
];
