import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React tree select page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/tree-select-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same four demos, in the same
 * order, over the same trees, in React idiom — `value` + `onValueChange`
 * instead of `[(value)]`, `defaultExpandedKeys` instead of the two-way
 * `[(expandedKeys)]` model, callback props instead of outputs.
 */
export const INPUTS_TREE_SELECT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basic usage',
    description:
      "The committed value is the selected node's key. A single click picks a node and closes the popup; the chevron expands, so choosing never fights with browsing. Double-click also expands — expandEvent changes that.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTreeSelect'] },
      before: `const folders = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
];`,
      name: 'TreeSelectBasicDemo',
      body: `const [folderId, setFolderId] = useState<unknown>(null);`,
      jsx: `<OgeTreeSelect
  label="Folder"
  items={folders}
  keyExpr="id"
  parentIdExpr="parentId"
  displayExpr="name"
  rootValue={null}
  value={folderId}
  onValueChange={setFolderId}
/>`,
    }),
  },
  {
    title: 'Nested data & search',
    description:
      "Point itemsExpr at the children field for hierarchical payloads. searchEnabled puts the tree's own search box inside the popup — accent-insensitive, auto-expanding to matches and highlighting them.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTreeSelect'] },
      before: `// nested payloads need only itemsExpr
const tree = [
  { id: 1, name: 'src', children: [{ id: 2, name: 'main.ts' }] },
];`,
      name: 'TreeSelectNestedDemo',
      body: `const [fileId, setFileId] = useState<unknown>(null);`,
      jsx: `<OgeTreeSelect
  label="Source file"
  items={tree}
  itemsExpr="children"
  displayExpr="name"
  searchEnabled
  value={fileId}
  onValueChange={setFileId}
/>`,
    }),
  },
  {
    title: 'Multiple selection',
    description:
      'With selectionMode="multiple" the value becomes an array of keys and the popup stays open while you pick. Checking a node cascades to its descendants and normalizes up, so selectedKeysMode="leavesOnly" is often what you actually want to store.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTreeSelect'] },
      before: `const folders = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
];`,
      name: 'TreeSelectMultipleDemo',
      body: `// checking a node cascades to its descendants; 'leavesOnly' reports
// just the childless keys, so the value stays the concrete grants
const [permissions, setPermissions] = useState<unknown>([]);`,
      jsx: `<OgeTreeSelect
  label="Permissions"
  items={folders}
  displayExpr="name"
  rootValue={null}
  selectionMode="multiple"
  showCheckBoxes="selectAll"
  selectedKeysMode="leavesOnly"
  value={permissions}
  onValueChange={setPermissions}
  onSelectionChanged={(event) => console.log(event.keys, event.previousKeys)}
/>`,
    }),
  },
  {
    title: 'Lazy load on demand',
    description:
      'Bind only the roots and let loadChildren fetch the rest on first expand; a placeholder row shows while the promise is pending. Fetched nodes join the index, so a cascading selection reaches them too.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTreeSelect'] },
      before: `interface Folder {
  id: number;
  parentId: number | null;
  name: string;
  hasItems?: boolean;
}

const roots: Folder[] = [
  { id: 1, parentId: null, name: 'Server root', hasItems: true },
  { id: 2, parentId: null, name: 'readme.txt', hasItems: false },
];

// called once per node, on first expand — a placeholder row shows meanwhile
const loadChildren = (parent: Folder): Promise<Folder[]> =>
  new Promise((resolve) =>
    setTimeout(
      () => resolve([{ id: parent.id * 100, parentId: parent.id, name: 'logs' }]),
      700,
    ),
  );`,
      name: 'TreeSelectLazyDemo',
      body: `const [remoteId, setRemoteId] = useState<unknown>(null);`,
      jsx: `<OgeTreeSelect
  label="Remote folder"
  items={roots}
  displayExpr="name"
  rootValue={null}
  hasItemsExpr="hasItems"
  loadChildren={loadChildren}
  value={remoteId}
  onValueChange={setRemoteId}
/>`,
    }),
  },
];
