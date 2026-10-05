import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeKanban,
  type OgeKanbanColumnSort,
  type OgeKanbanFilter,
  type OgeKanbanFilterExpression,
  type OgeKanbanHandle,
} from '@oge-ui/react-kanban';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { KANBAN_FILTERING_DEMOS } from './filtering-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_KANBAN_FILTERING_SECTIONS = [
  'Filter chips & search',
  'Programmatic filter',
  'Column sort',
  'Export',
] as const;

type Row = Record<string, unknown>;

const CHIP_COLUMNS = [
  { key: 'todo', title: 'To do' },
  { key: 'doing', title: 'In progress', wipLimit: 3 },
  { key: 'done', title: 'Done' },
];

const CHIP_TASKS: Row[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Checkout revamp',
    labels: ['feature'],
    owner: 'Ada Lovelace',
    priority: 'high',
  },
  {
    id: 2,
    status: 'todo',
    title: 'Wallet UI polish',
    labels: ['design'],
    owner: 'Grace Hopper',
    priority: 'medium',
  },
  {
    id: 3,
    status: 'doing',
    title: 'Fix login crash',
    labels: ['bug'],
    owner: 'Ada Lovelace',
    priority: 'high',
  },
  {
    id: 4,
    status: 'doing',
    title: 'Upgrade CI runners',
    labels: ['infra'],
    owner: 'Alan Turing',
    priority: 'low',
  },
  {
    id: 5,
    status: 'done',
    title: 'Search relevance',
    labels: ['feature'],
    owner: 'Grace Hopper',
    priority: 'medium',
  },
];

const PREDICATE_TASKS: Row[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Quarterly report',
    owner: 'Ada Lovelace',
    due: new Date(2020, 0, 10),
  },
  {
    id: 2,
    status: 'todo',
    title: 'Vendor review',
    owner: 'Grace Hopper',
    due: new Date(2099, 5, 1),
  },
  { id: 3, status: 'doing', title: 'Hiring plan', owner: 'Ada Lovelace' },
  {
    id: 4,
    status: 'done',
    title: 'Offsite booking',
    owner: 'Alan Turing',
    due: new Date(2020, 3, 2),
  },
];

const SORT_TASKS: Row[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Polish onboarding',
    priority: 'low',
    due: new Date(2026, 9, 20),
  },
  {
    id: 2,
    status: 'todo',
    title: 'Payment outage',
    priority: 'blocker',
    due: new Date(2026, 9, 6),
  },
  {
    id: 3,
    status: 'todo',
    title: 'Audit log export',
    priority: 'medium',
    due: new Date(2026, 9, 12),
  },
  {
    id: 4,
    status: 'done',
    title: 'Sprint 41 review',
    priority: 'medium',
    due: new Date(2026, 8, 18),
  },
  {
    id: 5,
    status: 'done',
    title: 'Sprint 42 review',
    priority: 'medium',
    due: new Date(2026, 9, 2),
  },
];

const EXPORT_TASKS: Row[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Release notes',
    labels: ['docs'],
    todo: [
      { text: 'Draft', done: true },
      { text: 'Review', done: false },
    ],
  },
  {
    id: 2,
    status: 'doing',
    title: '=SUM(A1) is exported as text',
    labels: ['security'],
  },
  { id: 3, status: 'done', title: 'Changelog', labels: ['docs'] },
];

const note = (text: string) =>
  createElement('p', { className: 'mt-2 text-sm text-slate-500' }, text);

function ChipsDemo(): ReactNode {
  const [chips, setChips] = useState<OgeKanbanFilterExpression>({
    priorities: ['high'],
  });
  const active = [
    ...(chips.tags ?? []),
    ...(chips.assignees ?? []),
    ...(chips.priorities ?? []),
  ];
  return createElement(
    'div',
    null,
    createElement(OgeKanban<Row>, {
      dataSource: CHIP_TASKS,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      tagsExpr: 'labels',
      assigneeExpr: 'owner',
      priorityExpr: 'priority',
      columns: CHIP_COLUMNS,
      showFilterBar: true,
      filterValue: chips,
      onFilterValueChange: setChips,
      style: { height: 460 },
    }),
    note(`Active chips: ${active.length > 0 ? active.join(', ') : 'none'}`),
  );
}

function PredicateDemo(): ReactNode {
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const filter: OgeKanbanFilter<Row> | undefined = onlyOverdue
    ? { overdue: true }
    : onlyMine
      ? (card) => card.assignees.includes('Ada Lovelace')
      : undefined;
  const toggle = (label: string, checked: boolean, flip: () => void) =>
    createElement(
      'label',
      { className: 'flex items-center gap-2' },
      createElement('input', { type: 'checkbox', checked, onChange: flip }),
      label,
    );
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap gap-4 text-sm' },
      toggle('Only my cards', onlyMine, () => setOnlyMine(!onlyMine)),
      toggle('Only overdue', onlyOverdue, () => setOnlyOverdue(!onlyOverdue)),
    ),
    createElement(OgeKanban<Row>, {
      dataSource: PREDICATE_TASKS,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      assigneeExpr: 'owner',
      dueDateExpr: 'due',
      filter,
      style: { height: 400 },
    }),
  );
}

function SortDemo(): ReactNode {
  const [sort, setSort] = useState<OgeKanbanColumnSort<Row>>({
    todo: { field: 'priority' },
    done: { field: 'dueDate', direction: 'desc' },
  });
  return createElement(OgeKanban<Row>, {
    dataSource: SORT_TASKS,
    keyExpr: 'id',
    columnExpr: 'status',
    titleExpr: 'title',
    priorityExpr: 'priority',
    dueDateExpr: 'due',
    columnSort: sort,
    onColumnSortChange: setSort,
    priorityOrder: ['blocker', 'high', 'medium', 'low'],
    style: { height: 420 },
  });
}

function ExportDemo(): ReactNode {
  const board = useRef<OgeKanbanHandle<Row>>(null);
  const button = (label: string, onClick: () => void) =>
    createElement(
      'button',
      {
        type: 'button',
        className: 'rounded border px-3 py-1 text-sm',
        onClick,
      },
      label,
    );
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex gap-2' },
      button('Export CSV', () => board.current?.exportToCsv('cards.csv')),
      button('Export Excel', () => {
        void import('@oge-ui/react-kanban/export-excel').then(
          ({ exportKanbanToExcel }) =>
            board.current
              ? exportKanbanToExcel(board.current, { filename: 'cards.xlsx' })
              : undefined,
        );
      }),
    ),
    createElement(OgeKanban<Row>, {
      ref: board,
      dataSource: EXPORT_TASKS,
      keyExpr: 'id',
      columnExpr: 'status',
      titleExpr: 'title',
      tagsExpr: 'labels',
      checklistExpr: 'todo',
      style: { height: 360 },
    }),
  );
}

@Component({
  selector: 'app-react-kanban-filtering-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/kanban/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['showFilterBar', 'filterValue', 'aria-pressed']"
      heading="Filter chips &amp; search"
      description="<code>showFilterBar</code> renders one toggle chip per distinct tag, assignee and priority. Chips in a group are alternatives, groups combine with AND, the toolbar search narrows further, and <code>filterValue</code> + <code>onFilterValueChange</code> is the controlled chip state — this board starts filtered to <em>high</em>."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="chips" />
    </app-demo-card>

    <app-demo-card
      [chips]="['filter', 'predicate', 'expression']"
      heading="Programmatic filter"
      description="<code>filter</code> takes a predicate over the normalized card or an <code>OgeKanbanFilterExpression</code> — <code>{ tags, assignees, priorities, columns, swimlanes, text, overdue }</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="predicate" />
    </app-demo-card>

    <app-demo-card
      [chips]="['columnSort', 'column menu', 'priorityOrder']"
      heading="Column sort"
      description="Each column sorts on its own: <code>{ field, direction }</code> per column key (<code>'*'</code> = all) or a comparator. The header's sort button — or a right-click on the header — opens the column menu that calls <code>onColumnSortChange</code>. A drop into a sorted column lands where the sort puts it."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="sort" />
    </app-demo-card>

    <app-demo-card
      [chips]="['exportToCsv()', '/export-excel', 'formula guard']"
      heading="Export"
      description="<code>exportToCsv()</code> on the ref handle downloads a formula-guarded CSV in board order (and returns the text); the lazy <code>&#64;oge-ui/react-kanban/export-excel</code> entry builds an <code>.xlsx</code> through the optional <code>exceljs</code> peer."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="exporting" />
    </app-demo-card>
  `,
})
export class ReactKanbanFilteringDemos {
  protected readonly demos = KANBAN_FILTERING_DEMOS;
  protected readonly chips = () => createElement(ChipsDemo);
  protected readonly predicate = () => createElement(PredicateDemo);
  protected readonly sort = () => createElement(SortDemo);
  protected readonly exporting = () => createElement(ExportDemo);
}
