import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';
import { ORG_NODE } from './org-node-source';

/** Mirror of `../tree-list/drag-drop-snippets.ts`. Pure data. */
export const TREE_DRAG_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Reparenting',
    source: reactDemoSource({
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      types: { '@oge-ui/react-tree-list': ['OgeTreeRowReparentEvent'] },
      name: 'DraggableOrg',
      before: ORG_NODE,
      body: `const onReparent = (event: OgeTreeRowReparentEvent<OrgNode>) => {
  console.log(event.key, 'moved under', event.toParentKey);
};`,
      jsx: `<OgeTreeList
  data={org}
  keyExpr="id"
  parentIdExpr="parentId"
  autoExpandAll
  rowDragging
  onRowReparented={onReparent}
  columns={[
    { field: 'name', caption: 'Name' },
    { field: 'title', caption: 'Title', width: 140 },
    { field: 'office', caption: 'Office', width: 140 },
  ]}
/>`,
    }),
  },
];
