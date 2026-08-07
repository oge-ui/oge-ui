import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { FilterExpr } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees } from '../../shared/demo-data';

const SNIPPET = `<oge-grid [data]="employees" keyField="id"
          [filterRow]="true"            <!-- per-column editors + operator menu -->
          [headerFilter]="true"         <!-- distinct values with search box -->
          [searchPanel]="true"          <!-- global search + highlighting -->
          [filterPanel]="true"          <!-- filter builder entry point -->
          [(filterValue)]="filter">     <!-- programmatic and/or tree -->
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>

// filterValue is a serializable and/or expression tree:
filter: FilterExpr = {
  type: 'and',
  operands: [
    { type: 'binary', field: 'department', op: 'eq', value: 'Engineering' },
    { type: 'binary', field: 'salary', op: 'ge', value: 60000 },
  ],
};`;

@Component({
  selector: 'app-filtering',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Filtering"
      [chips]="[
        'filterRow',
        'headerFilter',
        'searchPanel',
        'filterPanel',
        'filterValue',
      ]"
    >
      <p>
        All four filtering surfaces on one grid: type in the filter row (click
        the operator button to switch <em>Contains → Starts with → …</em>), open
        a header filter and search inside its values, use the global search
        (matches are <mark>highlighted</mark>), or click the filter panel at the
        top to open the <strong>Filter Builder</strong> for arbitrary and/or
        trees.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['2.000 rows', 'all filter surfaces']"
      [code]="snippet"
      language="html"
    >
      @if (filter()) {
        <div
          class="mb-3 rounded-md bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          filterValue = {{ filterJson() }}
        </div>
      }
      <oge-grid
        [data]="employees"
        keyField="id"
        [filterRow]="true"
        [headerFilter]="true"
        [searchPanel]="true"
        [filterPanel]="true"
        [filterValue]="filter()"
        (filterValueChange)="filter.set($event)"
        [paging]="{ pageSize: 12 }"
      >
        <oge-column
          field="id"
          caption="Id"
          [width]="70"
          dataType="number"
          [filterable]="false"
        />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
        <oge-column field="salary" caption="Salary" dataType="number" />
        <oge-column
          field="hireDate"
          caption="Hire Date"
          dataType="date"
          [width]="120"
        />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Open the <strong>Hire Date</strong> header filter: date values are
        grouped into a year tree — the year checkbox toggles all its dates at
        once and the search box matches years or single dates.
      </li>
      <li>
        Every surface produces the same serializable
        <code>FilterExpr</code> tree — combined with AND and sent to your
        backend unchanged in remote mode.
      </li>
      <li>
        The operator button in each filter cell offers dataType-appropriate
        operators; <em>Reset</em> returns to the column default.
      </li>
      <li>
        <code>[(filterValue)]</code> is two-way: set it programmatically, read
        what the builder produced, persist it — it also participates in
        <code>stateKey</code>.
      </li>
      <li>
        Search highlighting only touches default cells; custom
        <code>*ogeCellTemplate</code> content is never rewritten.
      </li>
    </ul>
  `,
})
export class FilteringPage {
  protected readonly employees = makeEmployees(2000, 5);
  protected readonly snippet = SNIPPET;
  protected readonly filter = signal<FilterExpr | null>(null);

  protected filterJson(): string {
    return JSON.stringify(this.filter());
  }
}
