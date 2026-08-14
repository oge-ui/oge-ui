import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeCellTemplate,
  OgeColumn,
  OgeGrid,
  OgeGridToolbarItem,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { QUICK_START_SNIPPET } from './overview-snippets';

@Component({
  selector: 'app-data-grid-overview',
  imports: [
    OgeGrid,
    OgeColumn,
    OgeCellTemplate,
    OgeGridToolbarItem,
    DemoCard,
    DocHeader,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Overview"
      [chips]="['oge-grid', 'oge-column', 'ogeCellTemplate']"
    >
      <p>
        Declarative columns, typed cell templates, sorting, filtering, paging
        and virtualization. Works with in-memory arrays or a
        <a
          routerLink="/components/data-grid/remote-data"
          class="font-medium text-indigo-600 underline"
        >
          remote data source</a
        >.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['50 rows', 'paging', 'cell template']"
      [code]="quickStartSnippet"
      language="ts"
    >
      <oge-grid [data]="employees" keyField="id" [paging]="{ pageSize: 10 }">
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
        <oge-column
          field="salary"
          caption="Salary"
          dataType="number"
          [format]="money"
        />
        <oge-column
          field="hireDate"
          caption="Hire Date"
          dataType="date"
          [width]="120"
        />
        <!-- custom toolbar items project into the grid's own toolbar -->
        <button
          ogeToolbar
          type="button"
          class="oge-tool-btn oge-tool-text-btn"
          (click)="grid()?.exportCsv('employees.csv')"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
          </svg>
          Export CSV
        </button>
        <button
          ogeToolbar
          type="button"
          class="oge-tool-btn oge-tool-text-btn"
          (click)="exportExcel()"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          Export Excel
        </button>
        <button
          ogeToolbar
          type="button"
          class="oge-tool-btn oge-tool-text-btn"
          (click)="exportPdf()"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14 2 14 8 20 8" />
            <polyline points="9 14 12 17 15 14" />
            <line x1="12" y1="11" x2="12" y2="17" />
          </svg>
          Export PDF
        </button>
      </oge-grid>
    </app-demo-card>

    <h3>API</h3>
    <p>
      The complete reference — every input, two-way model, imperative method,
      event and supporting type of <code>&lt;oge-grid&gt;</code> and
      <code>&lt;oge-column&gt;</code> — lives on the
      <a
        routerLink="/components/data-grid/api"
        class="text-indigo-600 underline dark:text-indigo-400"
        >API Reference</a
      >
      page.
    </p>

    <h3>Export</h3>
    <p>
      CSV ships in the core bundle; Excel lives in the separate
      <code>&#64;oge-ui/grid/export-excel</code> entry point (backed by
      <code>exceljs</code>) and PDF in
      <code>&#64;oge-ui/grid/export-pdf</code> (backed by <code>jspdf</code> +
      <code>jspdf-autotable</code>), so they only load when you import them —
      typically via a dynamic <code>import()</code>.
    </p>
    <ul>
      <li>
        <strong>Paging</strong> is ignored by default: the export contains the
        <em>full</em> filtered + sorted set, not just the visible page. Pass
        <code>{{ '{' }} scope: 'page' {{ '}' }}</code> for the current page
        only, or <code>'selection'</code> for the selected rows.
      </li>
      <li>
        <strong>Master-detail &amp; groups</strong>: exports contain data rows
        only. Detail rows are arbitrary templates and group headers are view
        artifacts — re-group in Excel via the auto-filter, or feed
        <code>getExportData()</code> into a custom exporter if you need more.
      </li>
      <li>
        Numbers and dates are written as <em>typed</em> Excel cells; lookup and
        boolean columns use their display text.
      </li>
      <li>
        <code>customizeCell</code> rewrites individual cells in every exporter —
        return a replacement (typed values stay typed in Excel) or
        <code>undefined</code> to keep the default.
      </li>
    </ul>
    <p>
      The demo grid above hosts its export buttons via the
      <code>ogeToolbar</code> attribute — any projected element with it lands in
      the grid's toolbar next to the built-in controls.
    </p>

    <h3>Templates</h3>
    <p>
      <code>*ogeCellTemplate="let value; row as r"</code> customizes cells,
      <code>*ogeHeaderTemplate="let column"</code> customizes headers,
      <code>*ogeEditTemplate</code> swaps in your own editor,
      <code>*ogeDetailTemplate</code> renders master-detail content,
      <code>*ogeRowTemplate</code> replaces the whole row and
      <code>*ogeNoDataTemplate</code> the empty state — all fully typed via
      template context guards. Elements marked with the
      <code>ogeToolbar</code> attribute project into the grid toolbar.
    </p>
  `,
})
export class DataGridOverviewPage {
  protected readonly employees = makeEmployees(50);
  protected readonly quickStartSnippet = QUICK_START_SNIPPET;
  protected readonly money = (value: unknown): string =>
    typeof value === 'number'
      ? `₺${value.toLocaleString('tr-TR')}`
      : String(value ?? '');

  protected readonly grid = viewChild(OgeGrid<Employee>);

  /** exceljs stays out of the initial bundle — loaded on first click. */
  protected async exportExcel(): Promise<void> {
    const grid = this.grid();
    if (!grid) return;
    const { exportGridToExcel } = await import('@oge-ui/grid/export-excel');
    await exportGridToExcel(grid, {
      filename: 'employees.xlsx',
      sheetName: 'Employees',
    });
  }

  /** jspdf loads lazily the same way. */
  protected async exportPdf(): Promise<void> {
    const grid = this.grid();
    if (!grid) return;
    const { exportGridToPdf } = await import('@oge-ui/grid/export-pdf');
    await exportGridToPdf(grid, {
      filename: 'employees.pdf',
      title: 'Employees',
    });
  }
}
