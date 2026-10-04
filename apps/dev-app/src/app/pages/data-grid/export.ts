import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { OgeColumn, OgeColumnGroup, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactGridExportDemos } from '../react-grid/export';
import { EXCEL_SNIPPET, PDF_SNIPPET } from './export-snippets';
import { salaryCellStyle } from './export-style';
import { loadDocsPdfFont } from '../../shared/pdf-font';

const money = (value: unknown): string =>
  typeof value === 'number'
    ? `€${Math.round(value).toLocaleString('en-US')}`
    : String(value ?? '');

@Component({
  selector: 'app-grid-export',
  imports: [
    OgeGrid,
    OgeColumn,
    OgeColumnGroup,
    DemoCard,
    DocHeader,
    ReactGridExportDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Excel & PDF Export"
      category="Data Grid"
      [chips]="[
        'export-excel',
        'export-pdf',
        'group outline',
        'SUBTOTAL formulas',
        'freeze panes',
        'cellStyle',
      ]"
    >
      <p>
        The export entries write the grid as it looks: banded headers become
        merged cells, left-pinned columns and the header rows freeze, groups
        become collapsible Excel outline levels with footer and total rows (as
        values or <code>SUBTOTAL</code> formulas), numbers and dates stay typed
        with Excel formats, and one <code>cellStyle</code> hook carries
        conditional formatting into both files. Both entries are lazy, so
        <code>exceljs</code> and <code>jspdf</code> stay out of the main bundle.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-grid-export-demos />
    } @else {
      <app-demo-card
        [chips]="['grouped', 'band', 'pinned', 'selection', 'formulas']"
        [code]="excelSnippet"
        language="ts"
      >
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Select a few rows (Ctrl/Shift+click) to try the selected-rows
            export; salaries above €8,000 export highlighted.
          </span>
          <span class="flex items-center gap-1.5">
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn oge-btn-accent"
              data-testid="export-excel"
              (click)="excel()"
            >
              Excel
            </button>
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn"
              data-testid="export-excel-selected"
              (click)="excel(true)"
            >
              Selected rows
            </button>
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn"
              data-testid="export-pdf"
              (click)="pdf()"
            >
              PDF
            </button>
          </span>
        </div>
        <oge-grid
          #grid
          [data]="employees"
          keyField="id"
          selectionMode="multiple"
          [groupBy]="['department']"
          style="height: 460px"
        >
          <oge-column
            field="id"
            caption="Id"
            [width]="70"
            dataType="number"
            pinned="left"
          />
          <oge-column-group caption="Employee">
            <oge-column field="firstName" caption="First Name" [width]="140" />
            <oge-column field="lastName" caption="Last Name" [width]="140" />
          </oge-column-group>
          <oge-column field="city" caption="City" />
          <oge-column field="hireDate" caption="Hired" dataType="date" />
          <oge-column
            field="salary"
            caption="Salary"
            dataType="number"
            [format]="money"
            groupSummary="sum"
            groupSummaryPosition="footer"
            totalSummary="sum"
          />
        </oge-grid>
      </app-demo-card>

      <h3>PDF page chrome</h3>
      <p>
        The PDF repeats the header block on every page, fits the grid’s own
        column widths to the printable width and calls
        <code>pageHeader</code> / <code>pageFooter</code> once the page count is
        known — so “Page 2 of 5” is one line.
      </p>
      <app-demo-card
        [chips]="['repeat header', 'page numbers', 'fit to width']"
        [code]="pdfSnippet"
        language="ts"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Uses the grid above — press <strong>PDF</strong>.
        </p>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          <code>getExportData(options)</code> is the shared source: rows,
          columns with width / alignment / pin side / band, and the structured
          <code>items</code> (group rows, group footers, the total row) the
          builders read — use <code>buildExcelWorkbook</code> /
          <code>buildPdfDocument</code> directly for a custom pipeline.
        </li>
        <li>
          <code>visibleColumnsOnly: false</code> adds the hidden columns;
          columns hidden only by the responsive width pass always export.
          <code>groups: false</code> / <code>summaries: false</code> give a flat
          sheet; CSV is always flat.
        </li>
        <li>
          <code>customizeCell</code> still rewrites a data cell’s value and can
          now restyle it through its mutable <code>style</code>;
          <code>cellStyle</code> also reaches header, group and summary lines.
        </li>
      </ul>
    }
  `,
})
export class GridExportPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly employees = makeEmployees(120);
  protected readonly money = money;
  protected readonly excelSnippet = EXCEL_SNIPPET;
  protected readonly pdfSnippet = PDF_SNIPPET;

  // optional: the React view renders no Angular grid
  private readonly grid = viewChild<OgeGrid<Employee>>('grid');

  protected async excel(selectedRowsOnly = false): Promise<void> {
    const grid = this.grid();
    if (!grid) return;
    const { exportGridToExcel } = await import('@oge-ui/grid/export-excel');
    await exportGridToExcel(grid, {
      filename: selectedRowsOnly ? 'employees-selected.xlsx' : 'employees.xlsx',
      selectedRowsOnly,
      summaryFormulas: true,
      columnFormats: { salary: '#,##0 "€"' },
      cellStyle: salaryCellStyle,
    });
  }

  protected async pdf(): Promise<void> {
    const grid = this.grid();
    if (!grid) return;
    const { exportGridToPdf } = await import('@oge-ui/grid/export-pdf');
    await loadDocsPdfFont(); // Unicode font: Turkish ğ ş ı İ
    await exportGridToPdf(grid, {
      filename: 'employees.pdf',
      title: 'Employees by department',
      orientation: 'portrait',
      pageHeader: () => 'OGE UI · HR report',
      pageFooter: ({ pageNumber, pageCount }) =>
        `Page ${pageNumber} of ${pageCount}`,
      cellStyle: salaryCellStyle,
    });
  }
}
