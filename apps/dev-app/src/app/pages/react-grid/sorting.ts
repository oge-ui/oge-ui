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
import { GRID_SORTING_DEMOS } from './sorting-snippets';

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
  { field: 'hireDate', caption: 'Hire Date', width: 120 },
];

/**
 * The React half of the sorting page — the same 10k-row multi-sort demo with
 * paging and a persisted `stateKey`, rendered as a real React tree inside
 * `/components/data-grid/sorting` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-grid-sorting-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['10.000 rows', 'multi-sort', 'stateKey']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="sorted" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Sorting is <strong>stable</strong>: rows with equal keys keep their
        relative order, so multi-sort chains behave predictably.
      </li>
      <li>
        <code>null</code>/<code>undefined</code> values always sort last in
        ascending order; string comparison is case-insensitive and numeric-aware
        ("item2" &lt; "item10").
      </li>
      <li>
        The sort indicator shows the chain position (¹, ²) when more than one
        column is sorted.
      </li>
      <li>
        Disable clearing with
        <code>sorting={{ sortingLiteral }}</code
        >, or for every grid below an <code>OgeGridConfigProvider</code>.
      </li>
      <li>
        This demo has <code>stateKey="docs-sorting-react"</code> — sort a
        column, <strong>reload the page</strong>, and the state comes back
        (localStorage by default, pluggable via <code>stateStorage</code> or
        <code>OgeGridStateStorageProvider</code>).
      </li>
      <li>Right-click any header for the built-in menu: sort, pin, hide.</li>
    </ul>
  `,
})
export class ReactGridSortingDemos {
  protected readonly demos = GRID_SORTING_DEMOS;
  /** `{{ … }}` cannot be written literally in an Angular template. */
  protected readonly sortingLiteral = '{{ allowUnsorting: false }}';
  private readonly employees = makeEmployees(10_000);
  protected readonly sorted = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: this.employees,
      keyField: 'id',
      columns: COLUMNS,
      stateKey: 'docs-sorting-react',
      paging: { pageSize: 15, pageSizes: [15, 25, 50] },
    });
}
