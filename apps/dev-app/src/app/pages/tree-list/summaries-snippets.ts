import { demoSource } from '../../shared/demo-source';

const TASKS = `protected readonly tasks = [
  { id: 1, parentId: null, task: 'Build', owner: 'Ada', hours: 4, cost: 400 },
  { id: 2, parentId: 1, task: 'Design', owner: 'Grace', hours: 6, cost: 570 },
  { id: 3, parentId: 2, task: 'Sketch', owner: 'Alan', hours: 3, cost: 285 },
  { id: 4, parentId: 1, task: 'Code', owner: 'Ada', hours: 12, cost: 1140 },
  { id: 5, parentId: null, task: 'Ship', owner: 'Barbara', hours: 2, cost: 190 },
];`;

export const SUMMARIES_SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeColumn', 'OgeTreeList'] },
  types: { '@oge-ui/tree-list': ['OgeTreeListSummary'] },
  template: `<oge-tree-list #tree [data]="tasks" keyExpr="id" parentIdExpr="parentId"
               [autoExpandAll]="true" [summary]="summary">
  <oge-column field="task" caption="Task" />
  <oge-column field="owner" caption="Owner" />
  <oge-column field="hours" caption="Hours" dataType="number" />
  <oge-column field="cost" caption="Cost" dataType="number" />
</oge-tree-list>

<button type="button" (click)="excel()">Excel</button>
<button type="button" (click)="pdf()">PDF</button>`,
  body: `${TASKS}

// totalItems → the footer row; recursiveItems → each parent's subtree aggregate
protected readonly summary: OgeTreeListSummary = {
  totalItems: [
    { field: 'task', type: 'count' },
    { field: 'hours', type: 'sum' },
    { field: 'cost', type: 'avg' },
  ],
  recursiveItems: [
    { field: 'hours', type: 'sum' },
    { field: 'cost', type: 'max' },
  ],
};

private readonly tree = viewChild.required(OgeTreeList);

// both lazy entries carry the summaries: a total row + one footer per parent
protected async excel(): Promise<void> {
  const { exportOgeTreeListToExcel } = await import('@oge-ui/tree-list/export-excel');
  await exportOgeTreeListToExcel(this.tree(), { filename: 'plan.xlsx', summaryFormulas: true });
}

protected async pdf(): Promise<void> {
  const { exportOgeTreeListToPdf } = await import('@oge-ui/tree-list/export-pdf');
  await exportOgeTreeListToPdf(this.tree(), { filename: 'plan.pdf', title: 'Plan', pageNumbers: true });
}`,
});

export const REMOTE_SNIPPET = demoSource({
  use: { '@oge-ui/tree-list': ['OgeColumn', 'OgeTreeList'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  before: `interface PlanTask {
  id: number;
  parentId: number | null;
  task: string;
  owner: string;
  hours: number;
}`,
  template: `<!-- filter row, header filter and search go to the server -->
<oge-tree-list [data]="source" keyExpr="id" parentIdExpr="parentId"
               [remoteOperations]="{ filtering: true }"
               [filterRow]="true" [headerFilter]="true" [searchPanel]="true">
  <oge-column field="task" caption="Task" />
  <oge-column field="owner" caption="Owner" />
  <oge-column field="hours" caption="Hours" dataType="number" />
</oge-tree-list>`,
  body: `// Contract: answer with every match PLUS all of its ancestors, flat —
// the tree renders the answer as-is and opens the branches to the matches.
protected readonly source = new CustomDataSource<PlanTask>({
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
});
