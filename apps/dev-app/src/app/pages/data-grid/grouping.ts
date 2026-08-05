import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees } from '../../shared/demo-data';

const SNIPPET = `<oge-grid [data]="employees" keyField="id"
          [groupPanel]="true" [groupBy]="['department']" [columnChooser]="true">
  <oge-column field="id" caption="Id" [width]="80" dataType="number" pinned="left" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number"
              groupSummary="avg" totalSummary="sum" [format]="money" />
</oge-grid>`;

@Component({
  selector: 'app-grouping',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Grouping & Summaries"
      [chips]="['groupPanel', 'groupSummary', 'totalSummary', 'pinned', 'columnChooser']"
    >
      <p>
        Drag a column header into the panel to group; click a group row to collapse it. Group and
        total aggregates come from the <code>groupSummary</code> / <code>totalSummary</code>
        column inputs. The Id column is pinned left; the column chooser hides columns.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['500 rows', '2-level grouping']" [code]="snippet">
      <oge-grid
        [data]="employees"
        keyField="id"
        [groupPanel]="true"
        [groupBy]="['department']"
        [columnChooser]="true"
        style="height: 540px"
      >
        <oge-column field="id" caption="Id" [width]="80" dataType="number" pinned="left" />
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

    <h3>Notes</h3>
    <ul>
      <li>Group aggregates (<code>sum · avg · min · max · count</code>) come from the column's <code>groupSummary</code> input; <code>totalSummary</code> feeds the sticky totals row at the bottom.</li>
      <li>Expanding/collapsing a group is pure client-side state — it never triggers a data reload.</li>
      <li>With a remote DataSource the grid sends <code>group</code> descriptors and expects the standard nested <code>GroupedItem</code> payload — local and server grouping render identically.</li>
      <li>Column headers can also be dragged onto each other to reorder, and resized from their edges.</li>
    </ul>
  `,
})
export class GroupingPage {
  protected readonly employees = makeEmployees(500);
  protected readonly snippet = SNIPPET;
  protected readonly money = (value: unknown): string =>
    typeof value === 'number' ? `₺${Math.round(value).toLocaleString('tr-TR')}` : String(value ?? '');
}
