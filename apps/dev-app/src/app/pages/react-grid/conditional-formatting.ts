import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_FORMAT_DEMOS } from './conditional-formatting-snippets';

const employees = makeEmployees(40, 11);
const sortedEmployees = makeEmployees(14, 5).sort((a, b) =>
  a.department.localeCompare(b.department),
);

const FORMAT_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'Name' },
  { field: 'department', caption: 'Department' },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    conditionalFormats: [
      {
        when: { operator: 'ge', value: 100000 },
        style: { tone: 'success', bold: true },
      },
      {
        when: (value) => (value as number) < 45000,
        style: { background: 'danger' },
      },
      { type: 'dataBar' },
    ],
  },
  {
    field: 'id',
    caption: 'Score',
    dataType: 'number',
    width: 120,
    conditionalFormats: [{ type: 'colorScale' }, { type: 'iconSet' }],
  },
];

const SPAN_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'department', caption: 'Department', mergeCells: true },
  { field: 'city', caption: 'City', width: 64 },
  { field: 'firstName', caption: 'First name', width: 90 },
  { field: 'lastName', caption: 'Last name' },
];

/** The React half of the conditional-formatting page. */
@Component({
  selector: 'app-react-grid-conditional-formatting-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  styles: `
    .demo-formats .is-engineering .oge-cell:first-of-type {
      box-shadow: inset 3px 0 0 var(--oge-accent);
    }
    .demo-formats .is-top-earner {
      font-style: italic;
    }
  `,
  template: `
    <h3>Class hooks & formatting rules</h3>
    <p>
      <code>rowClass</code> / <code>cellClass</code> return a string, an array
      or a record; a column's <code>conditionalFormats</code> mixes rules with
      data bars, colour scales and icon sets — token classes and CSS custom
      properties only. <code>onCellPrepared</code> hands over the element.
    </p>
    <app-demo-card
      [chips]="['tokens only', 'forced colors']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host class="demo-formats" [render]="formats" />
    </app-demo-card>

    <h3>Merged cells, spans, auto-fit & hints</h3>
    <p>
      <code>mergeCells</code> merges equal adjacent values
      (<code>aria-rowspan</code>), <code>cellSpan</code> spans per cell, and the
      arrows step over the merged area. <code>columnAutoWidth</code> fits the
      columns to their content; <code>cellHintEnabled</code> shows truncated
      text in a tooltip.
    </p>
    <app-demo-card
      [chips]="['aria-rowspan', 'cellHintEnabled', 'auto-fit']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host class="demo-spans" [render]="spans" />
    </app-demo-card>
  `,
})
export class ReactGridConditionalFormattingDemos {
  protected readonly demos = GRID_FORMAT_DEMOS;

  protected readonly formats = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: FORMAT_COLUMNS,
      rowClass: (row) => ({
        'is-engineering': row.department === 'Engineering',
      }),
      cellClass: (row, column) =>
        column.field === 'firstName' && row.salary > 100000
          ? 'is-top-earner'
          : null,
      onCellPrepared: (event) => {
        if (event.field === 'salary') event.element.title = String(event.value);
      },
      style: { height: 360 },
    });

  protected readonly spans = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: sortedEmployees,
      keyField: 'id',
      columns: SPAN_COLUMNS,
      cellSpan: (row, column) =>
        column.field === 'firstName' && row.id === sortedEmployees[0].id
          ? { colSpan: 2 }
          : null,
      cellHintEnabled: true,
    });
}
