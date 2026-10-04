import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, type ReactNode } from 'react';
import {
  OgeGrid,
  type OgeGridColumnProps,
  type OgeGridHandle,
} from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { salaryCellStyle } from '../data-grid/export-style';
import { GRID_EXPORT_DEMOS } from './export-snippets';
import { loadDocsPdfFont } from '../../shared/pdf-font';

const employees = makeEmployees(120);

const money = (value: unknown): string =>
  typeof value === 'number'
    ? `€${Math.round(value).toLocaleString('en-US')}`
    : String(value ?? '');

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number', pinned: 'left' },
  {
    field: 'firstName',
    caption: 'First Name',
    width: 140,
    bandCaption: 'Employee',
  },
  {
    field: 'lastName',
    caption: 'Last Name',
    width: 140,
    bandCaption: 'Employee',
  },
  { field: 'city', caption: 'City' },
  { field: 'hireDate', caption: 'Hired', dataType: 'date' },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    format: money,
    groupSummary: 'sum',
    groupSummaryPosition: 'footer',
    totalSummary: 'sum',
  },
];

const BUTTON = 'oge-tool-btn oge-tool-text-btn';

/** The same grid and the same three buttons as the Angular page. */
function ExportDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<Employee>>(null);
  const excel = async (selectedRowsOnly: boolean): Promise<void> => {
    if (!grid.current) return;
    const { exportGridToExcel } =
      await import('@oge-ui/react-grid/export-excel');
    await exportGridToExcel(grid.current, {
      filename: selectedRowsOnly ? 'employees-selected.xlsx' : 'employees.xlsx',
      selectedRowsOnly,
      summaryFormulas: true,
      columnFormats: { salary: '#,##0 "€"' },
      cellStyle: salaryCellStyle,
    });
  };
  const pdf = async (): Promise<void> => {
    if (!grid.current) return;
    const { exportGridToPdf } = await import('@oge-ui/react-grid/export-pdf');
    await loadDocsPdfFont(); // Unicode font: Turkish ğ ş ı İ
    await exportGridToPdf(grid.current, {
      filename: 'employees.pdf',
      title: 'Employees by department',
      orientation: 'portrait',
      pageHeader: () => 'OGE UI · HR report',
      pageFooter: ({ pageNumber, pageCount }) =>
        `Page ${String(pageNumber)} of ${String(pageCount)}`,
      cellStyle: salaryCellStyle,
    });
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap items-center justify-between gap-3' },
      createElement(
        'span',
        { className: 'text-sm text-gray-500 dark:text-gray-400' },
        'Select a few rows (Ctrl/Shift+click) to try the selected-rows export; salaries above €8,000 export highlighted.',
      ),
      createElement(
        'span',
        { className: 'flex items-center gap-1.5' },
        createElement(
          'button',
          {
            type: 'button',
            className: `${BUTTON} oge-btn-accent`,
            'data-testid': 'export-excel',
            onClick: () => void excel(false),
          },
          'Excel',
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: BUTTON,
            'data-testid': 'export-excel-selected',
            onClick: () => void excel(true),
          },
          'Selected rows',
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: BUTTON,
            'data-testid': 'export-pdf',
            onClick: () => void pdf(),
          },
          'PDF',
        ),
      ),
    ),
    createElement(OgeGrid<Employee>, {
      ref: grid,
      data: employees,
      keyField: 'id',
      columns: COLUMNS,
      selectionMode: 'multiple',
      groupBy: ['department'],
      style: { height: '460px' },
    }),
  );
}

/**
 * The React half of the export page — the same grid, buttons and options as
 * the Angular page, rendered inside `/components/data-grid/export` when the
 * reader has chosen React.
 */
@Component({
  selector: 'app-react-grid-export-demos',
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
      [chips]="['grouped', 'band', 'pinned', 'selection', 'formulas']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="exportDemo" />
    </app-demo-card>

    <h3>PDF page chrome</h3>
    <p>
      The PDF repeats the header block on every page, fits the grid’s own column
      widths to the printable width and calls
      <code>pageHeader</code> / <code>pageFooter</code> once the page count is
      known — so “Page 2 of 5” is one line.
    </p>
    <app-demo-card
      [chips]="['repeat header', 'page numbers', 'fit to width']"
      [code]="demos[1].source"
      language="tsx"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Uses the grid above — press <strong>PDF</strong>.
      </p>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>getExportData(options)</code> on the handle is the shared source:
        rows, columns with width / alignment / pin side / band, and the
        structured <code>items</code> (group rows, group footers, the total row)
        the builders read — <code>buildExcelWorkbook</code> /
        <code>buildPdfDocument</code> for a custom pipeline.
      </li>
      <li>
        <code>visibleColumnsOnly: false</code> adds the hidden columns;
        <code>groups: false</code> / <code>summaries: false</code> give a flat
        sheet; CSV is always flat.
      </li>
      <li>
        <code>customizeCell</code> rewrites a data cell’s value and can restyle
        it through its mutable <code>style</code>; <code>cellStyle</code> also
        reaches header, group and summary lines.
      </li>
    </ul>
  `,
})
export class ReactGridExportDemos {
  protected readonly demos = GRID_EXPORT_DEMOS;
  protected readonly exportDemo = () => createElement(ExportDemo);
}
