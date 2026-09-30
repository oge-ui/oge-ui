import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';
import { ORG_NODE } from './org-node-source';

/** Mirror of `../tree-list/selection-snippets.ts`. Pure data. */
export const TREE_SELECTION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Recursive tri-state selection',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      types: { '@oge-ui/core': ['RowKey'] },
      name: 'SelectableOrg',
      before: ORG_NODE,
      body: `const [selectedKeys, setSelectedKeys] = useState<RowKey[]>([]);`,
      jsx: `<OgeTreeList
  data={org}
  keyExpr="id"
  parentIdExpr="parentId"
  autoExpandAll
  selectionMode="checkbox"
  selectionRecursive
  selectedKeys={selectedKeys}
  onSelectedKeysChange={setSelectedKeys}
  columns={[
    { field: 'name', caption: 'Name' },
    { field: 'title', caption: 'Title', width: 140 },
    { field: 'office', caption: 'Office', width: 140 },
  ]}
/>`,
    }),
  },
];
