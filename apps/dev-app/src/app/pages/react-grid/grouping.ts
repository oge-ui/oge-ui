import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { CustomDataSource } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_GROUPING_DEMOS } from './grouping-snippets';

const employees = makeEmployees(500);
const summaryRows = makeEmployees(40, 3);
const deferredRows = makeEmployees(400, 7);

const money = (value: unknown): string =>
  typeof value === 'number'
    ? `₺${Math.round(value).toLocaleString('tr-TR')}`
    : String(value ?? '');

/** Custom summary: distinct city count per group. */
const distinctCities = (rows: readonly Employee[]): string =>
  `${new Set(rows.map((row) => row.city)).size} cities`;

const PANEL_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number', pinned: 'left' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    format: money,
    groupSummary: 'avg',
    totalSummary: 'sum',
  },
];

const SUMMARY_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  {
    field: 'city',
    caption: 'City',
    groupSummary: 'custom',
    calculateCustomSummary: distinctCities,
  },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    format: money,
    groupSummary: ['min', 'max'],
    groupSummaryPosition: 'footer',
    totalSummary: ['sum', 'avg'],
  },
];

const DEFERRED_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number', format: money },
];

/** Fake deferred server: group headers only; children fetched per expansion. */
const deferredSource = new CustomDataSource<Employee>({
  key: 'id',
  load: async (options) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (options.group?.length) {
      const counts = new Map<string, number>();
      for (const row of deferredRows) {
        counts.set(row.department, (counts.get(row.department) ?? 0) + 1);
      }
      return {
        data: [...counts.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, count]) => ({ key, items: null, count })),
        totalCount: deferredRows.length,
      };
    }
    const filter = options.filter;
    const value = filter?.type === 'binary' ? filter.value : undefined;
    return { data: deferredRows.filter((row) => row.department === value) };
  },
});

function PanelDemo(): ReactNode {
  return createElement(OgeGrid<Employee>, {
    data: employees,
    keyField: 'id',
    columns: PANEL_COLUMNS,
    groupPanel: true,
    groupBy: ['department'],
    style: { height: 540 },
  });
}

function SummaryDemo(): ReactNode {
  return createElement(OgeGrid<Employee>, {
    data: summaryRows,
    keyField: 'id',
    columns: SUMMARY_COLUMNS,
    groupBy: ['department'],
  });
}

function DeferredDemo(): ReactNode {
  return createElement(OgeGrid<Employee>, {
    data: deferredSource,
    columns: DEFERRED_COLUMNS,
    groupBy: ['department'],
    grouping: { autoExpandAll: false },
  });
}

/**
 * The React half of the grouping page — the same three demos as the Angular
 * page (group panel, summaries, deferred loading), rendered as real React
 * trees inside `/components/data-grid/grouping` when the reader has chosen
 * React (ADR 0002). The column chooser of the first Angular demo lands with
 * slice D (a recorded exception).
 */
@Component({
  selector: 'app-react-grid-grouping-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['500 rows', '2-level grouping']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="panel" />
    </app-demo-card>

    <h3>Multiple, custom and group-footer summaries</h3>
    <p>
      A column may declare a <em>list</em> of aggregates, place them on a
      dedicated footer row after each group (<code
        >groupSummaryPosition: 'footer'</code
      >), or compute its own value with <code>calculateCustomSummary</code> —
      here the City column counts distinct cities per department.
    </p>

    <app-demo-card
      [chips]="['multiple aggregates', 'group footer', 'custom summary']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="summary" />
    </app-demo-card>

    <h3>Deferred group loading</h3>
    <p>
      With <code>grouping.autoExpandAll: false</code> groups start collapsed,
      and a remote source may answer grouped requests with headers only (<code
        >items: null</code
      >
      plus a <code>count</code>). A group's rows are fetched the moment it is
      expanded — filtered server-side by the group value — and cached for later
      toggles. Expand a department below and watch the skeleton row while its
      request is in flight.
    </p>

    <app-demo-card
      [chips]="['deferred', 'autoExpandAll: false', '300ms latency']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="deferred" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Group aggregates (<code>sum · avg · min · max · count</code>) come from
        the column's <code>groupSummary</code> prop;
        <code>totalSummary</code> feeds the sticky totals row at the bottom.
      </li>
      <li>
        Expanding/collapsing a group is pure client-side state — it never
        triggers a data reload. <code>expandAllGroups()</code> /
        <code>collapseAllGroups()</code> and <code>expandRow(key)</code> /
        <code>collapseRow(key)</code> live on the handle.
      </li>
      <li>
        With a remote DataSource the grid sends <code>group</code> descriptors
        and expects the standard nested <code>GroupedItem</code> payload — local
        and server grouping render identically.
      </li>
      <li>
        Column headers can also be dragged onto each other to reorder, and
        resized from their edges.
      </li>
    </ul>
  `,
})
export class ReactGridGroupingDemos {
  protected readonly demos = GRID_GROUPING_DEMOS;
  protected readonly panel = () => createElement(PanelDemo);
  protected readonly summary = () => createElement(SummaryDemo);
  protected readonly deferred = () => createElement(DeferredDemo);
}
