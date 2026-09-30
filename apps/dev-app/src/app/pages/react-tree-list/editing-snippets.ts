import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';
import { ORG_NODE } from './org-node-source';

/** Mirror of `../tree-list/editing-snippets.ts`. Pure data. */
export const TREE_EDITING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Form mode, prefill, insert under a parent',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      types: { '@oge-ui/react-tree-list': ['OgeTreeListHandle'] },
      name: 'EditableOrg',
      before: ORG_NODE,
      body: `const tree = useRef<OgeTreeListHandle<OrgNode>>(null);
// tree.current?.addRow(parentKey) inserts under a chosen node
const addUnderFirstVp = () => {
  const firstVp = org.find((row) => row.title === 'VP');
  if (firstVp) tree.current?.addRow(firstVp.id);
};`,
      jsx: `<>
  <button type="button" onClick={addUnderFirstVp}>
    Add under the first VP
  </button>
  <OgeTreeList
    ref={tree}
    data={org}
    keyExpr="id"
    parentIdExpr="parentId"
    autoExpandAll
    editing={{
      mode: 'form',
      allowUpdating: true,
      allowAdding: true,
      allowDeleting: true,
      confirmDelete: false,
      formColCount: 2,
      formItems: ['name', 'title', { field: 'office', colSpan: 2 }],
    }}
    onInitNewRow={(event) => {
      event.values['title'] = 'Engineer';
    }}
    columns={[
      { field: 'name', caption: 'Name', required: true },
      { field: 'title', caption: 'Title', width: 140 },
      { field: 'office', caption: 'Office', width: 140 },
    ]}
  />
</>`,
    }),
  },
];
