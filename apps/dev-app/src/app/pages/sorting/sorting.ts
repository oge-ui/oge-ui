import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees } from '../../shared/demo-data';

const SNIPPET = `<oge-grid [data]="employees" keyField="id"
          [paging]="{ pageSize: 15, pageSizes: [15, 25, 50] }"
          [sorting]="{ mode: 'multi', allowUnsorting: true }">
  <oge-column field="id" caption="Id" [width]="80" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`;

@Component({
  selector: 'app-sorting',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Sorting & Paging" [chips]="['sorting', 'paging', 'pageSizes']">
      <p>
        Click a header to sort; <kbd>Shift</kbd>+click chains a multi-sort; a third click clears
        it. All {{ employees.length.toLocaleString() }} rows are processed client-side — the same
        interactions drive <code>LoadOptions</code> against a remote source.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['10.000 rows', 'multi-sort', 'stateKey']" [code]="snippet">
      <oge-grid
        [data]="employees"
        keyField="id"
        stateKey="docs-sorting"
        [paging]="{ pageSize: 15, pageSizes: [15, 25, 50] }"
      >
        <oge-column field="id" caption="Id" [width]="80" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
        <oge-column field="salary" caption="Salary" dataType="number" />
        <oge-column field="hireDate" caption="Hire Date" [width]="120" />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>Sorting is <strong>stable</strong>: rows with equal keys keep their relative order, so multi-sort chains behave predictably.</li>
      <li><code>null</code>/<code>undefined</code> values always sort last in ascending order; string comparison is case-insensitive and numeric-aware ("item2" &lt; "item10").</li>
      <li>The sort indicator shows the chain position (¹, ²) when more than one column is sorted.</li>
      <li>Disable clearing with <code>[sorting]="&#123; allowUnsorting: false &#125;"</code>, or globally via <code>provideOgeGridConfig</code>.</li>
      <li>This demo has <code>stateKey="docs-sorting"</code> — sort a column, <strong>reload the page</strong>, and the state comes back (localStorage by default, pluggable via <code>OGE_STATE_STORAGE</code>).</li>
      <li>Right-click any header for the built-in menu: sort, pin, hide.</li>
    </ul>
  `,
})
export class SortingPage {
  protected readonly employees = makeEmployees(10_000);
  protected readonly snippet = SNIPPET;
}
