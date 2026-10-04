import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const EMPLOYEE = `interface Employee {
  id: number;
  firstName: string;
  department: string;
  salary: number;
  hireDate: Date;
}

declare const employees: Employee[];`;

/**
 * Demo source for the React pinned-rows page — mirror of
 * `../data-grid/pinned-rows-snippets.ts`. Pure data.
 */
export const GRID_PINNED_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Pinned rows & pager options',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'PinnedGrid',
      before: `${EMPLOYEE}

const totals = { id: 0, firstName: 'Total', department: '', salary: 36900, hireDate: new Date() };`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={[
    { field: 'firstName', caption: 'Name' },
    { field: 'salary', caption: 'Salary', dataType: 'number' },
  ]}
  // key 3 moves out of the body into the sticky top section;
  // the totals object is a display row in the sticky footer
  pinnedTopRows={[3]}
  pinnedBottomRows={[totals]}
  paging={{ pageSize: 5, showFirstLastButtons: true, showPageInput: true }}
  renderPagerInfo={(info) => \`\${info.firstRow}–\${info.lastRow} of \${info.totalCount}\`}
/>`,
    }),
  },
  {
    title: 'Sticky group rows',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'StickyGroupsGrid',
      before: EMPLOYEE,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  style={{ height: 360 }}
  virtualScroll
  stickyGroupRows
  groupBy={['department', 'hireDate']}
  columns={[
    { field: 'department', caption: 'Department' },
    // quarter buckets read "Q2 2026"; numbers take a width, e.g. groupInterval: 10000
    { field: 'hireDate', caption: 'Hired', dataType: 'date', groupInterval: 'quarter' },
    { field: 'firstName', caption: 'Name' },
  ]}
/>`,
    }),
  },
  {
    title: 'Drag rows between grids',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeRowDropEvent'] },
      name: 'TaskBoards',
      before: `interface Task {
  id: number;
  title: string;
}`,
      body: `const [todo, setTodo] = useState<Task[]>([
  { id: 1, title: 'Write specs' },
  { id: 2, title: 'Ship it' },
]);
const [done, setDone] = useState<Task[]>([{ id: 3, title: 'Plan' }]);

const onDrop = (event: OgeRowDropEvent) => {
  if (event.sameComponent) return; // a reorder: the grid already moved it
  const row = event.sourceRow as Task;
  const [setFrom, setTo] =
    event.targetComponentId === 'todo' ? [setDone, setTodo] : [setTodo, setDone];
  setFrom((rows) => rows.filter((r) => r.id !== row.id));
  setTo((rows) => {
    const next = [...rows];
    next.splice(event.toIndex, 0, row);
    return next;
  });
};`,
      jsx: `<>
  <OgeGrid id="todo" data={todo} keyField="id" rowDragging rowDragGroup="tasks"
           columns={[{ field: 'title', caption: 'To do' }]} onRowDrop={onDrop} />
  <OgeGrid id="done" data={done} keyField="id" rowDragging rowDragGroup="tasks"
           columns={[{ field: 'title', caption: 'Done' }]} onRowDrop={onDrop} />
</>`,
    }),
  },
];
