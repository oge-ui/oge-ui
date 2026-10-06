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
import { GRID_VIRTUAL_SCROLL_DEMOS } from './virtual-scroll-snippets';

interface Note {
  id: number;
  title: string;
  body: string;
}

const EMPLOYEE_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 90, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const NOTE_COLUMNS: OgeGridColumnProps<Note>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'title', caption: 'Title', width: 180 },
  { field: 'body', caption: 'Body' },
];

/**
 * The React half of the virtual-scroll page — the same three demos as the
 * Angular page (100k rows, 200 virtualized columns, measured variable row
 * heights), rendered as real React trees inside
 * `/components/data-grid/virtual-scroll` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-grid-virtual-scroll-demos',
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
      [chips]="['100.000 rows']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="rows" />
    </app-demo-card>

    <h3>How it works</h3>
    <ul>
      <li>
        Row offsets live in a <strong>Fenwick (binary-indexed) tree</strong>:
        finding the row at any scroll position and the total height are both
        O(log n) — scrolling cost does not grow with list size.
      </li>
      <li>
        Only the visible rows plus an <code>overscan</code> buffer (default 6)
        exist in the DOM; a spacer element keeps the scrollbar honest.
      </li>
      <li>
        Group and master-detail rows participate with their own heights
        (<code>detailRowHeight</code>).
      </li>
      <li>
        Keyboard navigation scrolls the focused row into view automatically,
        even across 100k rows.
      </li>
    </ul>

    <h3>Column virtualization</h3>
    <p>
      Wide grids get the same treatment horizontally:
      <code>columnRenderingMode: 'virtual'</code> renders only the columns near
      the horizontal viewport and stands spacer tracks in for the rest. Scroll
      sideways below — the DOM holds a couple dozen of the 200 columns at any
      time.
    </p>

    <app-demo-card
      [chips]="['200 columns', '1.000 rows']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="columns" />
    </app-demo-card>

    <h3>Variable row heights</h3>
    <p>
      With <code>autoRowHeight</code> the virtualizer stops assuming a fixed row
      height: rendered rows are measured, measurements feed the offset tree, and
      corrections above the viewport are compensated on
      <code>scrollTop</code> in the same frame — no visible jump while scrolling
      through wrapped content.
    </p>

    <app-demo-card
      [chips]="['5.000 rows', 'autoRowHeight', 'wordWrap']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="autoHeight" />
    </app-demo-card>
  `,
})
export class ReactGridVirtualScrollDemos {
  protected readonly demos = GRID_VIRTUAL_SCROLL_DEMOS;

  private readonly employees = makeEmployees(100_000);

  private readonly wideColumns = Array.from({ length: 200 }, (_, i) => `c${i}`);
  private readonly wideRows = Array.from({ length: 1_000 }, (_, r) =>
    Object.fromEntries(
      this.wideColumns.map((field, i) => [field, `R${r + 1} · C${i}`]),
    ),
  ) as Record<string, string>[];

  private readonly notes: Note[] = Array.from({ length: 5_000 }, (_, i) => ({
    id: i + 1,
    title: `Note ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
      1 + ((i * 7) % 5),
    ),
  }));

  protected readonly rows = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: this.employees,
      keyField: 'id',
      columns: EMPLOYEE_COLUMNS,
      virtualScroll: true,
      style: { height: 560 },
    });

  protected readonly columns = (): ReactNode =>
    createElement(OgeGrid<Record<string, string>>, {
      data: this.wideRows,
      keyField: 'c0',
      columns: this.wideColumns,
      scrolling: { mode: 'virtual', columnRenderingMode: 'virtual' },
      style: { height: 420 },
    });

  protected readonly autoHeight = (): ReactNode =>
    createElement(OgeGrid<Note>, {
      data: this.notes,
      keyField: 'id',
      columns: NOTE_COLUMNS,
      virtualScroll: true,
      autoRowHeight: true,
      wordWrap: true,
      style: { height: 420 },
    });
}
