import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { CustomDataSource } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployeeAt, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_INFINITE_SCROLL_DEMOS } from './infinite-scroll-snippets';

const TOTAL = 1_000_000;

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 110, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

/**
 * The React half of the infinite-scroll page — the same one-million-row
 * remote virtual scrolling demo over sparse 100-row blocks, rendered as a real
 * React tree inside `/components/data-grid/infinite-scroll` when the reader
 * has chosen React.
 */
@Component({
  selector: 'app-react-grid-infinite-scroll-demos',
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
      [chips]="['1.000.000 rows', '150ms latency']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="remote" />
    </app-demo-card>

    <h3>Scrolling modes</h3>
    <ul>
      <li>
        <code>mode: 'virtual'</code> with <code>remote: true</code> — the
        scrollbar reflects the full <code>totalCount</code>; blocks load on
        demand with block-level caching and de-duplication.
      </li>
      <li>
        <code>mode: 'infinite'</code> — same block fetching, but the scroll
        space grows as the user reaches the end; a <code>totalCount</code> is
        not required.
      </li>
      <li>
        Sorting or filtering invalidates the block cache and reloads around the
        current position — the request carries the usual
        <code>LoadOptions</code>, so the server stays in charge.
      </li>
    </ul>
  `,
})
export class ReactGridInfiniteScrollDemos {
  protected readonly demos = GRID_INFINITE_SCROLL_DEMOS;

  private readonly employees = new CustomDataSource<Employee>({
    key: 'id',
    load: async ({ skip = 0, take = 100 }) => {
      // fake server: ~150ms latency, rows generated on demand from the index
      await new Promise((resolve) => setTimeout(resolve, 150));
      const count = Math.max(0, Math.min(take, TOTAL - skip));
      const data = Array.from({ length: count }, (_, i) =>
        makeEmployeeAt(skip + i),
      );
      return { data, totalCount: TOTAL };
    },
  });

  protected readonly remote = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: this.employees,
      keyField: 'id',
      columns: COLUMNS,
      scrolling: { mode: 'virtual', remote: true },
      sortable: false,
      style: { height: 560 },
    });
}
