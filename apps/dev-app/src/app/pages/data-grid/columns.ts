import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { FilterExpr } from '@oge-ui/core';
import { OgeColumn, OgeColumnGroup, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';

const DEPARTMENTS = [
  { code: 'Engineering', label: 'Mühendislik' },
  { code: 'Sales', label: 'Satış' },
  { code: 'HR', label: 'İnsan Kaynakları' },
  { code: 'Finance', label: 'Finans' },
  { code: 'Support', label: 'Destek' },
];

const SNIPPET = `<oge-grid [data]="employees" keyField="id" [wordWrap]="true"
          [editing]="{ mode: 'cell' }" [filterRow]="true">
  <oge-column field="id" [width]="70" dataType="number" sortOrder="desc" />

  <!-- banded columns: one shared header over several columns -->
  <oge-column-group caption="Person">
    <oge-column field="firstName" />
    <oge-column field="lastName" [hidingPriority]="1" />
  </oge-column-group>

  <!-- lookup: store a code, display (and edit/filter with) a label -->
  <oge-column field="department" caption="Department"
              [lookup]="{ dataSource: departments, valueExpr: 'code', displayExpr: 'label' }" />

  <!-- calculated column: display-only derived value -->
  <oge-column caption="Yearly" dataType="number" [calculateCellValue]="yearly" />

  <!-- responsive: lowest hidingPriority disappears first on narrow screens -->
  <oge-column field="city" [hidingPriority]="0" />
</oge-grid>`;

@Component({
  selector: 'app-columns',
  imports: [OgeGrid, OgeColumn, OgeColumnGroup, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Columns"
      [chips]="['oge-column-group', 'lookup', 'calculateCellValue', 'hidingPriority', 'sortOrder', 'wordWrap']"
    >
      <p>
        Banded headers, lookup columns (a stored code rendered — and edited/filtered — as its
        label), calculated display columns, initial sorting via <code>sortOrder</code>, and
        responsive hiding: shrink the window and watch City, then Last Name disappear.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['banded', 'lookup edit', 'adaptive']" [code]="snippet" language="html">
      <oge-grid
        [data]="employees"
        keyField="id"
        [wordWrap]="true"
        [editing]="{ mode: 'cell' }"
        [filterRow]="true"
        [filterDebounce]="200"
        [paging]="{ pageSize: 10 }"
      >
        <oge-column field="id" caption="Id" [width]="70" dataType="number" sortOrder="desc" [editable]="false" />
        <oge-column-group caption="Person">
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="lastName" caption="Last Name" [hidingPriority]="1" />
        </oge-column-group>
        <oge-column
          field="department"
          caption="Department"
          [lookup]="{ dataSource: departments, valueExpr: 'code', displayExpr: 'label' }"
        />
        <oge-column caption="Yearly" dataType="number" [calculateCellValue]="yearly" [width]="110" />
        <oge-column field="city" caption="City" [hidingPriority]="0" />
      </oge-grid>
    </app-demo-card>

    <h3>Custom sort keys & filter expressions</h3>
    <p>
      <code>calculateSortValue</code> replaces the value a column sorts by — here the department
      lookup sorts by its Turkish <em>label</em> instead of the stored code.
      <code>calculateFilterExpression</code> rewrites what the filter row produces: typing a
      number into Salary Band filters the underlying salary by <em>thousands</em>.
    </p>

    <app-demo-card [chips]="['calculateSortValue', 'calculateFilterExpression']" [code]="calcSnippet">
      <oge-grid [data]="employees" keyField="id" [filterRow]="true" [paging]="{ pageSize: 8 }">
        <oge-column field="firstName" caption="First Name" />
        <oge-column
          field="department"
          caption="Department"
          [lookup]="{ dataSource: departments, valueExpr: 'code', displayExpr: 'label' }"
          [calculateSortValue]="departmentLabel"
        />
        <oge-column
          field="salary"
          caption="Salary Band (k)"
          dataType="number"
          [format]="thousandsBand"
          [calculateFilterExpression]="salaryBandFilter"
        />
      </oge-grid>
    </app-demo-card>

    <h3>Right-to-left</h3>
    <p>
      Set <code>rtlEnabled</code> (or wrap the grid in a <code>dir="rtl"</code> container — it
      auto-detects the inherited direction). Layout, pinned columns, chevrons and keyboard
      arrows all mirror; the library uses CSS logical properties throughout.
    </p>

    <app-demo-card [chips]="['rtlEnabled', 'pinned']" [code]="rtlSnippet">
      <oge-grid
        [data]="employees"
        keyField="id"
        [rtlEnabled]="true"
        [paging]="{ pageSize: 6, displayMode: 'compact' }"
      >
        <oge-column field="id" caption="No" [width]="70" dataType="number" pinned="left" />
        <oge-column field="firstName" caption="Ad" />
        <oge-column field="lastName" caption="Soyad" />
        <oge-column field="city" caption="Şehir" />
        <oge-column field="salary" caption="Maaş" dataType="number" />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li><strong>Lookup</strong> columns keep the raw value in your data; display, the filter select, the header filter and the default editor all speak the label. CSV export writes the label too.</li>
      <li><strong>Calculated</strong> columns (<code>calculateCellValue</code>) are display-only: without a <code>field</code> they can't sort or filter (server contracts stay serializable).</li>
      <li><strong>Bands</strong> are purely visual — resize, pinning and the column chooser keep working on the leaf columns.</li>
      <li><code>sortOrder</code>/<code>sortIndex</code>/<code>groupIndex</code> only seed the initial state; user interaction and <code>stateKey</code> restores always win.</li>
    </ul>
  `,
})
export class ColumnsPage {
  protected readonly employees = makeEmployees(200, 3);
  protected readonly departments = DEPARTMENTS;
  protected readonly snippet = SNIPPET;
  protected readonly yearly = (row: Employee) => row.salary * 12;
  protected readonly rtlSnippet = `<oge-grid [data]="employees" keyField="id" [rtlEnabled]="true">
  <oge-column field="id" caption="No" [width]="70" dataType="number" pinned="left" />
  <oge-column field="firstName" caption="Ad" />
  <oge-column field="salary" caption="Maaş" dataType="number" />
</oge-grid>`;

  // --- custom sort keys & filter expressions -------------------------------

  protected readonly calcSnippet = `<oge-column field="department"
            [lookup]="{ dataSource: departments, valueExpr: 'code', displayExpr: 'label' }"
            [calculateSortValue]="departmentLabel" />
<oge-column field="salary" caption="Salary Band (k)"
            [calculateFilterExpression]="salaryBandFilter" />

// sort the lookup column by its display label, not the stored code
departmentLabel = (row) => departments.find(d => d.code === row.department)?.label;

// '60' in the filter row means the 60k band: 60000 <= salary < 61000
salaryBandFilter = (value, operator) => value == null ? null : {
  type: 'and', operands: [
    { type: 'binary', field: 'salary', op: 'ge', value: +value * 1000 },
    { type: 'binary', field: 'salary', op: 'lt', value: (+value + 1) * 1000 },
  ],
};`;

  protected readonly departmentLabel = (row: Employee): string =>
    DEPARTMENTS.find((department) => department.code === row.department)?.label ?? row.department;

  protected readonly thousandsBand = (value: unknown): string =>
    typeof value === 'number' ? `${Math.floor(value / 1000)}k` : String(value ?? '');

  protected readonly salaryBandFilter = (value: unknown): FilterExpr | null => {
    const band = Number(value);
    if (value == null || value === '' || Number.isNaN(band)) return null;
    return {
      type: 'and',
      operands: [
        { type: 'binary', field: 'salary', op: 'ge', value: band * 1000 },
        { type: 'binary', field: 'salary', op: 'lt', value: (band + 1) * 1000 },
      ],
    };
  };
}
