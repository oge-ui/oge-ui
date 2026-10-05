import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  OgeKanban,
  type OgeKanbanColumnSort,
  type OgeKanbanFilter,
  type OgeKanbanFilterExpression,
} from '@oge-ui/kanban';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_KANBAN_FILTERING_SECTIONS,
  ReactKanbanFilteringDemos,
} from '../react-kanban/filtering';
import {
  CHIPS_SNIPPET,
  EXPORT_SNIPPET,
  PREDICATE_SNIPPET,
  SORT_SNIPPET,
} from './filtering-snippets';

const SECTIONS = [
  'Filter chips & search',
  'Programmatic filter',
  'Column sort',
  'Export',
] as const;

type Row = Record<string, unknown>;

@Component({
  selector: 'app-kanban-filtering',
  imports: [DemoCard, DocHeader, OgeKanban, PageToc, ReactKanbanFilteringDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Filtering &amp; sorting"
      category="Kanban"
      categoryLink="/components/kanban"
      [chips]="['filter', 'filter chips', 'columnSort', 'CSV / Excel']"
    >
      <p>
        Narrow the board three ways that combine with AND — the toolbar search,
        the filter chip bar (tags, assignees, priorities) and a programmatic
        @if (fw.isReact()) {
          <code>filter</code> prop
        } @else {
          <code>filter</code> input
        }
        (a predicate or a declarative expression) — sort every column on its own
        from the header menu, and export the cards to CSV or Excel. WIP counts
        always count the real data.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-kanban-filtering-demos />
    } @else {
      <app-demo-card
        [chips]="['showFilterBar', '[(filterValue)]', 'aria-pressed']"
        heading="Filter chips &amp; search"
        description="<code>showFilterBar</code> renders one toggle chip per distinct tag, assignee and priority. Chips in a group are alternatives, groups combine with AND, the toolbar search narrows further, and <code>[(filterValue)]</code> holds the chip state — this board starts filtered to <em>high</em>."
        [code]="chipsSnippet"
        language="ts"
      >
        <oge-kanban
          [dataSource]="chipTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          tagsExpr="labels"
          assigneeExpr="owner"
          priorityExpr="priority"
          [columns]="chipColumns"
          [showFilterBar]="true"
          [(filterValue)]="chips"
          style="height: 460px"
        />
        <p class="mt-2 text-sm text-slate-500">
          Active chips: {{ describe(chips()) }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['filter', 'predicate', 'expression']"
        heading="Programmatic filter"
        description="<code>filter</code> takes a predicate over the normalized card or an <code>OgeKanbanFilterExpression</code> — <code>{ tags, assignees, priorities, columns, swimlanes, text, overdue }</code>."
        [code]="predicateSnippet"
        language="ts"
      >
        <div class="mb-2 flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="onlyMine()"
              (change)="onlyMine.set(!onlyMine())"
            />
            Only my cards
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="onlyOverdue()"
              (change)="onlyOverdue.set(!onlyOverdue())"
            />
            Only overdue
          </label>
        </div>
        <oge-kanban
          [dataSource]="predicateTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          assigneeExpr="owner"
          dueDateExpr="due"
          [filter]="filter()"
          style="height: 400px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['[(columnSort)]', 'column menu', 'priorityOrder']"
        heading="Column sort"
        description="Each column sorts on its own: <code>{ field, direction }</code> per column key (<code>'*'</code> = all) or a comparator. The header's sort button — or a right-click on the header — opens the column menu (Manual order, Title, Priority, Due date; ascending / descending) that writes <code>[(columnSort)]</code>. A drop into a sorted column lands where the sort puts it."
        [code]="sortSnippet"
        language="ts"
      >
        <oge-kanban
          [dataSource]="sortTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          priorityExpr="priority"
          dueDateExpr="due"
          [(columnSort)]="sort"
          [priorityOrder]="priorityOrder"
          style="height: 420px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['exportToCsv()', '/export-excel', 'formula guard']"
        heading="Export"
        description="<code>exportToCsv()</code> downloads a formula-guarded CSV in board order (and returns the text); the lazy <code>&#64;oge-ui/kanban/export-excel</code> entry builds an <code>.xlsx</code> through the optional <code>exceljs</code> peer. <code>{ visibleOnly: true }</code> exports only what the filters show."
        [code]="exportSnippet"
        language="ts"
      >
        <div class="mb-2 flex gap-2">
          <button
            type="button"
            class="rounded border px-3 py-1 text-sm"
            (click)="board.exportToCsv('cards.csv')"
          >
            Export CSV
          </button>
          <button
            type="button"
            class="rounded border px-3 py-1 text-sm"
            (click)="exportExcel(board)"
          >
            Export Excel
          </button>
        </div>
        <oge-kanban
          #board
          [dataSource]="exportTasks"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          tagsExpr="labels"
          checklistExpr="todo"
          style="height: 360px"
        />
      </app-demo-card>
    }
  `,
})
export class KanbanFilteringPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_KANBAN_FILTERING_SECTIONS;
  protected readonly chipsSnippet = CHIPS_SNIPPET;
  protected readonly predicateSnippet = PREDICATE_SNIPPET;
  protected readonly sortSnippet = SORT_SNIPPET;
  protected readonly exportSnippet = EXPORT_SNIPPET;

  protected readonly chips = signal<OgeKanbanFilterExpression>({
    priorities: ['high'],
  });

  protected readonly chipColumns = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress', wipLimit: 3 },
    { key: 'done', title: 'Done' },
  ];

  protected readonly chipTasks: Row[] = [
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

  protected describe(value: OgeKanbanFilterExpression): string {
    const parts = [
      ...(value.tags ?? []),
      ...(value.assignees ?? []),
      ...(value.priorities ?? []),
    ];
    return parts.length > 0 ? parts.join(', ') : 'none';
  }

  protected readonly onlyMine = signal(false);
  protected readonly onlyOverdue = signal(false);
  protected readonly filter = computed<OgeKanbanFilter<Row> | undefined>(() => {
    if (this.onlyOverdue()) return { overdue: true };
    if (this.onlyMine()) {
      return (card) => card.assignees.includes('Ada Lovelace');
    }
    return undefined;
  });

  protected readonly predicateTasks: Row[] = [
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

  protected readonly sort = signal<OgeKanbanColumnSort<Row>>({
    todo: { field: 'priority' },
    done: { field: 'dueDate', direction: 'desc' },
  });
  protected readonly priorityOrder = ['blocker', 'high', 'medium', 'low'];
  protected readonly sortTasks: Row[] = [
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

  protected readonly exportTasks: Row[] = [
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

  protected async exportExcel<T extends object>(
    board: OgeKanban<T>,
  ): Promise<void> {
    const { exportKanbanToExcel } = await import('@oge-ui/kanban/export-excel');
    await exportKanbanToExcel(board, { filename: 'cards.xlsx' });
  }
}
