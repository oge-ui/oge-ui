import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CustomDataSource } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import {
  DEFERRED_SNIPPET,
  SNIPPET,
  SUMMARY_SNIPPET,
} from './grouping-snippets';

@Component({
  selector: 'app-grouping',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Grouping & Summaries"
      [chips]="[
        'groupPanel',
        'groupSummary',
        'totalSummary',
        'pinned',
        'columnChooser',
      ]"
    >
      <p>
        Drag a column header into the panel to group; click a group row to
        collapse it. Group and total aggregates come from the
        <code>groupSummary</code> / <code>totalSummary</code>
        column inputs. The Id column is pinned left; the column chooser hides
        columns.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['500 rows', '2-level grouping']"
      [code]="snippet"
      language="ts"
    >
      <oge-grid
        [data]="employees"
        keyField="id"
        [groupPanel]="true"
        [groupBy]="['department']"
        [columnChooser]="true"
        style="height: 540px"
      >
        <oge-column
          field="id"
          caption="Id"
          [width]="80"
          dataType="number"
          pinned="left"
        />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
        <oge-column
          field="salary"
          caption="Salary"
          dataType="number"
          [format]="money"
          groupSummary="avg"
          totalSummary="sum"
        />
      </oge-grid>
    </app-demo-card>

    <h3>Multiple, custom and group-footer summaries</h3>
    <p>
      A column may declare a <em>list</em> of aggregates, place them on a
      dedicated footer row after each group
      (<code>groupSummaryPosition="footer"</code>), or compute its own value
      with <code>calculateCustomSummary</code> — here the City column counts
      distinct cities per department.
    </p>

    <app-demo-card
      [chips]="['multiple aggregates', 'group footer', 'custom summary']"
      [code]="summarySnippet"
      language="ts"
    >
      <oge-grid [data]="summaryRows" keyField="id" [groupBy]="['department']">
        <oge-column field="firstName" caption="First Name" />
        <oge-column
          field="city"
          caption="City"
          groupSummary="custom"
          [calculateCustomSummary]="distinctCities"
        />
        <oge-column
          field="salary"
          caption="Salary"
          dataType="number"
          [format]="money"
          [groupSummary]="['min', 'max']"
          groupSummaryPosition="footer"
          [totalSummary]="['sum', 'avg']"
        />
      </oge-grid>
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
      [code]="deferredSnippet"
      language="ts"
    >
      <oge-grid
        [data]="deferredSource"
        keyField="id"
        [groupBy]="['department']"
        [grouping]="{ autoExpandAll: false }"
      >
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="city" caption="City" />
        <oge-column
          field="salary"
          caption="Salary"
          dataType="number"
          [format]="money"
        />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Group aggregates (<code>sum · avg · min · max · count</code>) come from
        the column's <code>groupSummary</code> input;
        <code>totalSummary</code> feeds the sticky totals row at the bottom.
      </li>
      <li>
        Expanding/collapsing a group is pure client-side state — it never
        triggers a data reload.
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
export class GroupingPage {
  protected readonly employees = makeEmployees(500);
  protected readonly snippet = SNIPPET;
  protected readonly summarySnippet = SUMMARY_SNIPPET;
  protected readonly deferredSnippet = DEFERRED_SNIPPET;
  protected readonly summaryRows = makeEmployees(40, 3);

  /** Custom summary: distinct city count per group. */
  protected readonly distinctCities = (rows: readonly Employee[]): string =>
    `${new Set(rows.map((row) => row.city)).size} cities`;
  protected readonly money = (value: unknown): string =>
    typeof value === 'number'
      ? `₺${Math.round(value).toLocaleString('tr-TR')}`
      : String(value ?? '');

  private readonly deferredRows = makeEmployees(400, 7);

  /** Fake deferred server: group headers only; children fetched per expansion. */
  protected readonly deferredSource = new CustomDataSource<Employee>({
    key: 'id',
    load: async (options) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (options.group?.length) {
        const counts = new Map<string, number>();
        for (const row of this.deferredRows) {
          counts.set(row.department, (counts.get(row.department) ?? 0) + 1);
        }
        return {
          data: [...counts.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, count]) => ({ key, items: null, count })),
          totalCount: this.deferredRows.length,
        };
      }
      const filter = options.filter;
      const value = filter?.type === 'binary' ? filter.value : undefined;
      return {
        data: this.deferredRows.filter((row) => row.department === value),
      };
    },
  });
}
