import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const TASK = `interface PlanTask {
  id: number;
  parentId: number | null;
  task: string;
  owner: string;
  hours: number;
  cost: number;
}`;

/**
 * Demo sources for the React tree-list summaries page — mirror of
 * `../tree-list/summaries-snippets.ts`. Pure data, no React imports.
 */
export const TREE_SUMMARIES_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Total and per-parent summaries',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-tree-list': ['OgeTreeList'] },
      types: {
        '@oge-ui/react-tree-list': [
          'OgeGridColumnProps',
          'OgeTreeListHandle',
          'OgeTreeListSummary',
        ],
      },
      name: 'PlanSummaries',
      before: `${TASK}

declare const tasks: PlanTask[];

const columns: OgeGridColumnProps<PlanTask>[] = [
  { field: 'task', caption: 'Task' },
  { field: 'owner', caption: 'Owner' },
  { field: 'hours', caption: 'Hours', dataType: 'number' },
  { field: 'cost', caption: 'Cost', dataType: 'number' },
];

// totalItems → the footer row; recursiveItems → each parent's subtree aggregate
const summary: OgeTreeListSummary<PlanTask> = {
  totalItems: [
    { field: 'task', type: 'count' },
    { field: 'hours', type: 'sum' },
    { field: 'cost', type: 'avg' },
  ],
  recursiveItems: [
    { field: 'hours', type: 'sum' },
    { field: 'cost', type: 'max' },
  ],
};`,
      body: `const tree = useRef<OgeTreeListHandle<PlanTask>>(null);

// both lazy entries carry the summaries: a total row + one footer per parent
const excel = async () => {
  const { exportOgeTreeListToExcel } = await import('@oge-ui/react-tree-list/export-excel');
  if (tree.current) await exportOgeTreeListToExcel(tree.current, { filename: 'plan.xlsx', summaryFormulas: true });
};
const pdf = async () => {
  const { exportOgeTreeListToPdf } = await import('@oge-ui/react-tree-list/export-pdf');
  if (tree.current) await exportOgeTreeListToPdf(tree.current, { filename: 'plan.pdf', pageNumbers: true });
};`,
      jsx: `<>
  <button type="button" onClick={() => void excel()}>Excel</button>
  <button type="button" onClick={() => void pdf()}>PDF</button>
  <OgeTreeList
    ref={tree}
    data={tasks}
    keyExpr="id"
    parentIdExpr="parentId"
    columns={columns}
    autoExpandAll
    filterRow
    summary={summary}
  />
</>`,
    }),
  },
  {
    title: 'Remote filtering',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-tree-list': ['OgeTreeList'],
        '@oge-ui/core': ['CustomDataSource'],
      },
      types: { '@oge-ui/react-tree-list': ['OgeGridColumnProps'] },
      name: 'RemotePlan',
      before: `${TASK}

const columns: OgeGridColumnProps<PlanTask>[] = [
  { field: 'task', caption: 'Task' },
  { field: 'owner', caption: 'Owner' },
  { field: 'hours', caption: 'Hours', dataType: 'number' },
];

// Contract: answer with every match PLUS all of its ancestors, flat —
// the tree renders the answer as-is and opens the branches to the matches.
const source = new CustomDataSource<PlanTask>({
  key: 'id',
  load: async (options) => {
    const response = await fetch('/api/plan/tree', {
      method: 'POST',
      body: JSON.stringify({ filter: options.filter, search: options.searchText }),
    });
    return { data: (await response.json()) as PlanTask[] };
  },
  // header-filter values come from the server too
  distinct: async (field, options) => {
    const response = await fetch(\`/api/plan/distinct/\${field}\`, {
      method: 'POST',
      body: JSON.stringify({ filter: options?.filter ?? null }),
    });
    return (await response.json()) as unknown[];
  },
});`,
      jsx: `<OgeTreeList
  data={source}
  keyExpr="id"
  parentIdExpr="parentId"
  columns={columns}
  remoteOperations={{ filtering: true }}
  filterRow
  headerFilter
  searchPanel
/>`,
    }),
  },
];
