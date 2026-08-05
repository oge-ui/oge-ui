import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeCellTemplate, OgeColumn, OgeGrid, OgeToolbarItem } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';

const QUICK_START_TS = `import { Component } from '@angular/core';
import { OgeGrid, OgeColumn, OgeCellTemplate } from '@oge-ui/grid';

@Component({
  selector: 'app-employees',
  imports: [OgeGrid, OgeColumn, OgeCellTemplate],
  templateUrl: './employees.component.html',
})
export class EmployeesPage {
  employees = [/* ... */];
  money = (v: unknown) => \`₺\${(v as number).toLocaleString('tr-TR')}\`;
}`;

const QUICK_START_HTML = `<oge-grid [data]="employees" keyField="id">
  <oge-column field="id" caption="Id" [width]="70" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="department" caption="Department">
    <!-- cell templates are plain Angular templates — Tailwind classes just work -->
    <span *ogeCellTemplate="let value"
          class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {{ value }}
    </span>
  </oge-column>
  <oge-column field="salary" caption="Salary" dataType="number" [format]="money" />
</oge-grid>`;

const QUICK_START_FILES = [
  { name: 'employees.component.ts', language: 'ts', code: QUICK_START_TS },
  { name: 'employees.component.html', language: 'html', code: QUICK_START_HTML },
];

@Component({
  selector: 'app-data-grid-overview',
  imports: [OgeGrid, OgeColumn, OgeCellTemplate, OgeToolbarItem, DemoCard, DocHeader, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Overview" [chips]="['oge-grid', 'oge-column', 'ogeCellTemplate']">
      <p>
        Declarative columns, typed cell templates, sorting, filtering, paging and virtualization.
        Works with in-memory arrays or a
        <a routerLink="/components/data-grid/remote-data" class="font-medium text-indigo-600 hover:underline">
          remote data source</a>.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['50 rows', 'cell template']" [files]="quickStartFiles">
      <oge-grid [data]="employees" keyField="id">
        <oge-column field="id" caption="Id" [width]="70" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department">
          <span
            *ogeCellTemplate="let value"
            class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          >
            {{ value }}
          </span>
        </oge-column>
        <oge-column field="city" caption="City" />
        <oge-column field="salary" caption="Salary" dataType="number" [format]="money" />
        <oge-column field="hireDate" caption="Hire Date" dataType="date" [width]="120" />
        <!-- custom toolbar items project into the grid's own toolbar -->
        <button ogeToolbar type="button" class="oge-toolbar-btn oge-toolbar-text-btn" (click)="grid()?.exportCsv('employees.csv')">
          Export CSV
        </button>
        <button ogeToolbar type="button" class="oge-toolbar-btn oge-toolbar-text-btn" (click)="exportExcel()">
          Export Excel
        </button>
      </oge-grid>
    </app-demo-card>

    <h3>&lt;oge-grid&gt; inputs</h3>
    <table class="api-table">
      <thead><tr><th>Input</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>data</code></td><td>T[] | DataSource&lt;T&gt;</td><td>[]</td><td>Rows or any DataSource implementation</td></tr>
        <tr><td><code>keyField</code></td><td>keyof T | (row) =&gt; RowKey</td><td>row index</td><td>Stable row identity</td></tr>
        <tr><td><code>columns</code></td><td>(string | OgeColumnDef)[]</td><td>auto</td><td>Programmatic columns (alternative to <code>&lt;oge-column&gt;</code>)</td></tr>
        <tr><td><code>sortable</code></td><td>boolean | 'single' | 'multi'</td><td>'multi'</td><td>Header-click sorting; Shift+click chains</td></tr>
        <tr><td><code>paging</code></td><td>false | {{ '{' }} pageSize {{ '}' }}</td><td>false</td><td>Client- or server-side paging</td></tr>
        <tr><td><code>virtualScroll</code></td><td>boolean</td><td>false</td><td>Windowed rendering for large lists</td></tr>
        <tr><td><code>rowHeight</code></td><td>number</td><td>36</td><td>Fixed row height for the virtualizer</td></tr>
        <tr><td><code>filterRow</code></td><td>boolean</td><td>false</td><td>Per-column filter editors under the header</td></tr>
        <tr><td><code>headerFilter</code></td><td>boolean</td><td>false</td><td>Distinct-value header filter</td></tr>
        <tr><td><code>searchPanel</code></td><td>boolean</td><td>false</td><td>Global search box</td></tr>
        <tr><td><code>filterDebounce</code></td><td>number</td><td>300</td><td>Debounce for filter/search typing (ms)</td></tr>
        <tr><td><code>selectionMode</code></td><td>'none' | 'single' | 'multiple' | 'checkbox'</td><td>'none'</td><td>Row selection; supports Ctrl/Shift and Space</td></tr>
        <tr><td><code>selectedKeys</code></td><td>RowKey[]</td><td>[]</td><td>Two-way selection binding</td></tr>
        <tr><td><code>groupBy</code></td><td>string[]</td><td>—</td><td>Programmatic row grouping</td></tr>
        <tr><td><code>groupPanel</code></td><td>boolean</td><td>false</td><td>Drag-and-drop grouping panel</td></tr>
        <tr><td><code>columnChooser</code></td><td>boolean</td><td>false</td><td>Column visibility popup</td></tr>
        <tr><td><code>columnResize</code> / <code>columnReorder</code></td><td>boolean</td><td>true</td><td>Header drag interactions</td></tr>
        <tr><td><code>detailRowHeight</code></td><td>number</td><td>200</td><td>Master-detail row height in virtual mode</td></tr>
        <tr><td><code>editing</code></td><td>false | {{ '{' }} mode, allow… {{ '}' }}</td><td>false</td><td>cell / row / batch / popup editing</td></tr>
        <tr><td><code>messages</code></td><td>Partial&lt;OgeGridMessages&gt;</td><td>global config</td><td>Per-grid UI-string overrides (i18n)</td></tr>
        <tr><td><code>stateKey</code></td><td>string</td><td>—</td><td>Persists sort/filter/group/column layout (localStorage, pluggable)</td></tr>
      </tbody>
    </table>

    <h3>Export</h3>
    <p>
      CSV ships in the core bundle; Excel lives in the separate
      <code>&#64;oge-ui/grid/export-excel</code> entry point (backed by <code>exceljs</code>), so
      it only loads when you import it — typically via a dynamic <code>import()</code>.
    </p>
    <ul>
      <li><strong>Paging</strong> is ignored by default: the export contains the <em>full</em> filtered + sorted set, not just the visible page. Pass <code>{{ '{' }} scope: 'page' {{ '}' }}</code> for the current page only, or <code>'selection'</code> for the selected rows.</li>
      <li><strong>Master-detail &amp; groups</strong>: exports contain data rows only. Detail rows are arbitrary templates and group headers are view artifacts — re-group in Excel via the auto-filter, or feed <code>getExportData()</code> into a custom exporter if you need more.</li>
      <li>Numbers and dates are written as <em>typed</em> Excel cells; lookup and boolean columns use their display text.</li>
    </ul>
    <p>
      The demo grid above hosts its export buttons via the <code>ogeToolbar</code> attribute —
      any projected element with it lands in the grid's toolbar next to the built-in controls.
    </p>

    <h3>Methods</h3>
    <table class="api-table">
      <thead><tr><th>Method</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>getCsv(options?)</code></td><td>Returns the current view (filter + search + sort applied) as a CSV string</td></tr>
        <tr><td><code>exportCsv(filename?)</code></td><td>Downloads the current view as a CSV file</td></tr>
        <tr><td><code>getExportData()</code></td><td>Rows + column metadata of the current view — feeds custom exporters</td></tr>
        <tr><td><code>exportGridToExcel(grid, opts?)</code></td><td>From <code>&#64;oge-ui/grid/export-excel</code>: downloads the view as .xlsx</td></tr>
        <tr><td><code>refresh()</code> · <code>scrollToRow(key)</code> · <code>clearFilters()</code> · <code>clearSorting()</code> · <code>expandAllGroups()</code> / <code>collapseAllGroups()</code></td><td>Imperative view control</td></tr>
      </tbody>
    </table>

    <h3>&lt;oge-column&gt; inputs</h3>
    <table class="api-table">
      <thead><tr><th>Input</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>field</code></td><td>string</td><td>—</td><td>Data field; dotted paths supported</td></tr>
        <tr><td><code>caption</code></td><td>string</td><td>from field</td><td>Header text</td></tr>
        <tr><td><code>width</code></td><td>number | string</td><td>flexible</td><td>px number or CSS track ('2fr', '150px')</td></tr>
        <tr><td><code>dataType</code></td><td>'string' | 'number' | 'date' | 'boolean'</td><td>'string'</td><td>Drives formatting, alignment, filter editor</td></tr>
        <tr><td><code>format</code></td><td>(value) =&gt; string</td><td>—</td><td>Custom cell text formatter</td></tr>
        <tr><td><code>visible</code></td><td>boolean</td><td>true</td><td>Two-way visibility</td></tr>
        <tr><td><code>sortable</code> / <code>filterable</code></td><td>boolean</td><td>true</td><td>Per-column opt-out</td></tr>
      </tbody>
    </table>

    <h3>Templates</h3>
    <p>
      <code>*ogeCellTemplate="let value; row as r"</code> customizes cells,
      <code>*ogeHeaderTemplate="let column"</code> customizes headers — both fully typed via
      template context guards.
    </p>
  `,
})
export class DataGridOverviewPage {
  protected readonly employees = makeEmployees(50);
  protected readonly quickStartFiles = QUICK_START_FILES;
  protected readonly money = (value: unknown): string =>
    typeof value === 'number' ? `₺${value.toLocaleString('tr-TR')}` : String(value ?? '');

  protected readonly grid = viewChild(OgeGrid<Employee>);

  /** exceljs stays out of the initial bundle — loaded on first click. */
  protected async exportExcel(): Promise<void> {
    const grid = this.grid();
    if (!grid) return;
    const { exportGridToExcel } = await import('@oge-ui/grid/export-excel');
    await exportGridToExcel(grid, { filename: 'employees.xlsx', sheetName: 'Employees' });
  }
}
