import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React tree view page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../navigation/overview-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same eight sections, the same
 * order and the same example data, in React idiom. The Angular two-way models
 * (`[(expandedKeys)]`, `[(selectedKeys)]`) arrive here as the controlled pairs
 * `expandedKeys` / `onExpandedKeysChange` and `selectedKeys` /
 * `onSelectedKeysChange`, and `ogeTreeItemTemplate` as the `renderItem` prop.
 */

const FOLDER = `interface Folder {
  id: number;
  parentId: number | null;
  name: string;
  hasItems?: boolean;
}`;

const FOLDERS = `const folders: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
];`;

export const NAVIGATION_TREE_VIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Flat data',
    description:
      'The canonical shape: rows carrying a parent reference. expandedKeys and selectedKeys are controlled pairs keyed by identity, so they survive reordering. The disabled node is skipped by both clicks and arrow keys.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      types: { '@oge-ui/react-navigation': ['RowKey'] },
      name: 'TreeViewFlatDemo',
      before: `${FOLDER}

${FOLDERS}`,
      body: `const [open, setOpen] = useState<readonly RowKey[]>([1]);
const [picked, setPicked] = useState<readonly RowKey[]>([]);`,
      jsx: `<OgeTreeView
  items={folders}
  keyExpr="id"
  parentIdExpr="parentId"
  displayExpr="name"
  selectionMode="single"
  expandedKeys={open}
  onExpandedKeysChange={setOpen}
  selectedKeys={picked}
  onSelectedKeysChange={setPicked}
/>`,
    }),
  },
  {
    title: 'Nested data',
    description:
      "Point itemsExpr at the children field and the parent links are derived for you — behavior's flattenNestedTree normalizes the payload into the same single pipeline the flat shape uses.",
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      name: 'TreeViewNestedDemo',
      before: `interface NestedFolder {
  id: number;
  name: string;
  children?: NestedFolder[];
}

const tree: NestedFolder[] = [
  {
    id: 1,
    name: 'src',
    children: [{ id: 2, name: 'app', children: [{ id: 3, name: 'main.ts' }] }],
  },
];`,
      jsx: `<>
  {/* nested payloads need only itemsExpr; the parent links are derived */}
  <OgeTreeView items={tree} itemsExpr="children" displayExpr="name" />
</>`,
    }),
  },
  {
    title: 'Checkboxes & cascade',
    description:
      'Checking a node cascades down to its descendants and normalizes up: a parent is checked only when every child is, and indeterminate whenever some are. The checkbox is an aria-hidden glyph and the state lives on the row as aria-checked — a real checkbox inside role="treeitem" would be a nested-interactive violation.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      types: { '@oge-ui/react-navigation': ['RowKey'] },
      name: 'TreeViewCheckBoxesDemo',
      before: `${FOLDER}

${FOLDERS}`,
      body: `const [picked, setPicked] = useState<readonly RowKey[]>([]);`,
      jsx: `<>
  <OgeTreeView
    items={folders}
    displayExpr="name"
    selectionMode="multiple"
    showCheckBoxes="selectAll"
    selectedKeys={picked}
    onSelectedKeysChange={setPicked}
  />
  {/* selectedKeysMode projects the stored set on the way out:
      'all' (default) · 'leavesOnly' · 'excludeRecursive' */}
</>`,
    }),
  },
  {
    title: 'Search',
    description:
      "Matching is accent- and locale-insensitive (behavior's foldText), the ancestors of a hit are auto-expanded so it is reachable, and the matched substring is wrapped in <mark>. filterMode: 'fullBranch' also keeps a match's descendants.",
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      name: 'TreeViewSearchDemo',
      before: `${FOLDER}

${FOLDERS}`,
      jsx: `<OgeTreeView
  items={folders}
  displayExpr="name"
  searchEnabled
  searchMode="contains"
  filterMode="withAncestors"
/>`,
    }),
  },
  {
    title: 'Lazy load on demand',
    description:
      'Only the roots are bound; hasItemsExpr tells the tree which of them can expand. The first expand calls loadChildren and the engine renders a placeholder row until it resolves. Fetched children are folded into the index, so cascading selection reaches them.',
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      name: 'TreeViewLazyDemo',
      before: `${FOLDER}

const roots: Folder[] = [
  { id: 1, parentId: null, name: 'Documents', hasItems: true },
];

// a skeleton row shows while the promise is pending
const loadChildren = (parent: Folder): Promise<Folder[]> =>
  fetch(\`/api/folders?parent=\${parent.id}\`).then((r) => r.json());`,
      jsx: `<OgeTreeView
  items={roots}
  displayExpr="name"
  hasItemsExpr="hasItems"
  loadChildren={loadChildren}
/>`,
    }),
  },
  {
    title: 'Virtual scrolling',
    description:
      "Because the tree renders a flat list with aria-level rather than nested groups, it can window the DOM. Built on behavior's OffsetTree + computeWindow; keyboard focus moves scroll the target into view first, since the row may not exist yet.",
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      name: 'TreeViewVirtualDemo',
      before: `${FOLDER}

const tenThousand: Folder[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1,
  parentId: null,
  name: \`Item \${i + 1}\`,
}));`,
      jsx: `<>
  {/* every row must actually be itemHeight tall */}
  <OgeTreeView
    items={tenThousand}
    displayExpr="name"
    virtualScroll={{ itemHeight: 30 }}
    height="320px"
  />
</>`,
    }),
  },
  {
    title: 'Drag & drop reparenting',
    description:
      'Drag a node onto the middle of another to make it a child, or onto an edge to place it as a sibling. Hovering a collapsed parent opens it, Escape cancels, and a node can never be dropped into its own subtree. The tree calls onItemReordered and leaves the data change to you.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      types: { '@oge-ui/react-navigation': ['OgeTreeReorderedEvent'] },
      name: 'TreeViewDragDemo',
      before: `${FOLDER}`,
      body: `const [folders, setFolders] = useState<Folder[]>([
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
]);

// the tree never mutates your data; apply the move yourself
const reparent = (e: OgeTreeReorderedEvent<Folder>): void => {
  setFolders((rows) =>
    rows.map((row) =>
      row.id === e.dragKey
        ? {
            ...row,
            parentId:
              e.position === 'inside'
                ? (e.dropKey as number)
                : e.dropItem.parentId,
          }
        : row,
    ),
  );
};`,
      jsx: `<OgeTreeView
  items={folders}
  displayExpr="name"
  allowDragging
  allowDropInside
  onItemReordered={reparent}
/>`,
    }),
  },
  {
    title: 'Drag between trees',
    description:
      "Trees that share a dragGroup accept each other's nodes. The target fires the cancelable onItemReordering and onItemReordered with sourceTreeId / targetTreeId, the source fires onItemTransferred; neither tree moves data. Ctrl+X on a node and Ctrl+V on the target is the keyboard twin, and cutItem() / pasteItem() on the handle wire it to buttons.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      types: {
        '@oge-ui/react-navigation': [
          'OgeTreeReorderedEvent',
          'OgeTreeTransferredEvent',
        ],
      },
      name: 'TreeViewBetweenDemo',
      before: `${FOLDER}`,
      body: `const [projects, setProjects] = useState<Folder[]>([
  { id: 1, parentId: null, name: 'Website' },
  { id: 2, parentId: 1, name: 'Landing page' },
  { id: 3, parentId: null, name: 'Mobile app' },
]);
const [archive, setArchive] = useState<Folder[]>([
  { id: 11, parentId: null, name: '2024' },
]);

// the trees never move data: the target adds, the source removes
const received =
  (set: typeof setProjects) => (e: OgeTreeReorderedEvent<Folder>) => {
    const parentId =
      e.position === 'inside' ? (e.dropKey as number) : e.dropItem.parentId;
    set((rows) => [
      ...rows.filter((row) => row.id !== e.dragKey),
      { ...e.dragItem, parentId },
    ]);
  };
const removed =
  (set: typeof setProjects) => (e: OgeTreeTransferredEvent<Folder>) =>
    set((rows) => rows.filter((row) => row.id !== e.dragKey));`,
      jsx: `<>
  <OgeTreeView
    treeId="projects"
    items={projects}
    displayExpr="name"
    allowDragging
    dragGroup="files"
    ariaLabel="Projects"
    onItemReordered={received(setProjects)}
    onItemTransferred={removed(setProjects)}
  />
  <OgeTreeView
    treeId="archive"
    items={archive}
    displayExpr="name"
    allowDragging
    dragGroup="files"
    ariaLabel="Archive"
    onItemReordered={received(setArchive)}
    onItemTransferred={removed(setArchive)}
  />
</>`,
    }),
  },
  {
    title: 'Label editing (F2)',
    description:
      'F2 — or a double-click with editOnDblClick — turns the label into a text field. Enter or blur commits, Escape cancels, and the focus returns to the node. onItemEditStarting and onItemEditing are cancelable, validateEdit keeps the field open with its message, and onItemEdited carries previousValue / value — the tree leaves the data change to you.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      types: { '@oge-ui/react-navigation': ['OgeTreeEditedEvent'] },
      name: 'TreeViewEditingDemo',
      before: `${FOLDER}`,
      body: `const [folders, setFolders] = useState<Folder[]>([
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
]);

// the tree does not write the label: apply it to your data
const rename = (e: OgeTreeEditedEvent<Folder>): void =>
  setFolders((rows) =>
    rows.map((row) => (row.id === e.key ? { ...row, name: e.value } : row)),
  );`,
      jsx: `<OgeTreeView
  items={folders}
  displayExpr="name"
  allowEditing
  editOnDblClick
  validateEdit={(value) =>
    value.length > 40 ? 'Keep names under 40 characters.' : null
  }
  onItemEdited={rename}
/>`,
    }),
  },
  {
    title: 'Load more paging',
    description:
      'With childPageSize a parent renders its first page of children and a “Show N more items” row, which Enter, Space or a click expands by one more page — the focus lands on the first new child. The row is in the arrow-key order, aria-setsize keeps reporting the real total, and paging pauses while searching. Works with virtualScroll too.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      name: 'TreeViewPagingDemo',
      before: `${FOLDER}

const mail: Folder[] = [
  { id: 1, parentId: null, name: 'Inbox' },
  ...Array.from({ length: 23 }, (_, i) => ({
    id: 100 + i,
    parentId: 1,
    name: \`Message \${i + 1}\`,
  })),
];`,
      body: `const [progress, setProgress] = useState('');`,
      jsx: `<>
  {/* five children per parent, then a "Show N more items" row */}
  <OgeTreeView
    items={mail}
    displayExpr="name"
    childPageSize={5}
    defaultExpandedKeys={[1]}
    onChildPageShown={(e) => setProgress(\`\${e.shown} of \${e.total} shown\`)}
  />
  <p>{progress}</p>
</>`,
    }),
  },
  {
    title: 'Custom node template',
    description:
      'The renderItem prop replaces the built-in label. It renders inside the role="treeitem" row, so it must stay free of focusable controls.',
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeTreeView'] },
      name: 'TreeViewRenderItemDemo',
      before: `${FOLDER}

${FOLDERS}`,
      jsx: `<>
  <OgeTreeView
    items={folders}
    displayExpr="name"
    renderItem={({ item, level }) => (
      <>
        <strong>{item.name}</strong>
        <small>level {level}</small>
      </>
    )}
  />
  {/* the render prop renders inside role="treeitem", so it must not contain
      focusable controls — that would be a nested-interactive violation */}
</>`,
    }),
  },
];
