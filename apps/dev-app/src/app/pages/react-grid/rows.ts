import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { CustomDataSource, type RowKey } from '@oge-ui/core';
import {
  OgeGrid,
  type OgeGridColumnProps,
  type OgeGridHandle,
} from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_ROWS_DEMOS } from './rows-snippets';

const cards = makeEmployees(18, 21);
const dragRows = makeEmployees(6, 13);

const money = (value: unknown): string =>
  typeof value === 'number'
    ? `₺${value.toLocaleString('tr-TR')}`
    : String(value ?? '');

const initials = (employee: Employee): string =>
  `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`;

const CARD_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'Employee' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const DRAG_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
];

const EMPTY_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
];

/** Always-empty remote source with latency, to show loadPanel + the empty state. */
const emptySource = new CustomDataSource<Employee>({
  key: 'id',
  load: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { data: [], totalCount: 0 };
  },
});

function RowTemplateDemo(): ReactNode {
  return createElement(OgeGrid<Employee>, {
    data: cards,
    keyField: 'id',
    columns: CARD_COLUMNS,
    rowAlternation: true,
    paging: { pageSize: 6 },
    renderRow: ({ row }) =>
      createElement(
        'div',
        { className: 'flex w-full items-center gap-3 px-3 py-1.5' },
        createElement(
          'span',
          {
            className:
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
          },
          initials(row),
        ),
        createElement(
          'div',
          { className: 'min-w-0' },
          createElement(
            'div',
            { className: 'truncate text-sm font-medium' },
            `${row.firstName} ${row.lastName}`,
          ),
          createElement(
            'div',
            { className: 'truncate text-xs text-gray-500 dark:text-gray-400' },
            `${row.department} · ${row.city}`,
          ),
        ),
        createElement(
          'span',
          { className: 'ms-auto font-mono text-sm tabular-nums' },
          money(row.salary),
        ),
      ),
  });
}

function DragDemo(): ReactNode {
  const [focusedKey, setFocusedKey] = useState<RowKey | null>(null);
  const [lastReorder, setLastReorder] = useState('');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 text-sm text-gray-500 dark:text-gray-400' },
      'Focused row key: ',
      createElement(
        'span',
        {
          className: 'font-mono font-semibold text-gray-900 dark:text-gray-100',
        },
        focusedKey ?? '—',
      ),
      lastReorder
        ? createElement(
            'span',
            {
              className:
                'ml-3 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800',
            },
            lastReorder,
          )
        : null,
    ),
    createElement(OgeGrid<Employee>, {
      data: dragRows,
      keyField: 'id',
      columns: DRAG_COLUMNS,
      rowDragging: true,
      onRowReordered: (event) =>
        setLastReorder(`#${String(event.key)} → index ${event.toIndex}`),
      focusedRowEnabled: true,
      focusedRowKey: focusedKey,
      onFocusedRowKeyChange: setFocusedKey,
    }),
  );
}

function EmptyDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<Employee>>(null);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2' },
      createElement(
        'button',
        {
          type: 'button',
          className:
            'rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800',
          onClick: () => grid.current?.refresh(),
        },
        'Reload (watch the panel)',
      ),
    ),
    createElement(OgeGrid<Employee>, {
      ref: grid,
      data: emptySource,
      columns: EMPTY_COLUMNS,
      loadPanel: true,
      style: { minHeight: 180 },
      renderNoData: () =>
        createElement(
          'div',
          {
            className:
              'flex flex-col items-center gap-2 py-6 text-gray-500 dark:text-gray-400',
          },
          createElement(
            'svg',
            {
              viewBox: '0 0 24 24',
              width: 28,
              height: 28,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
            },
            createElement('circle', { cx: 11, cy: 11, r: 7 }),
            createElement('path', { d: 'm20 20-3.5-3.5M8 11h6' }),
          ),
          createElement(
            'span',
            null,
            'No employees match — adjust the filter or add a new record.',
          ),
        ),
    }),
  );
}

/**
 * The React half of the rows page — the same three demos as the Angular page
 * (row render prop, row drag + focused row, empty state + load panel),
 * rendered as real React trees inside `/components/data-grid/rows` when the
 * reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-grid-rows-demos',
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
      [chips]="['renderRow', 'rowAlternation']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="rowTemplate" />
    </app-demo-card>

    <h3>Row drag &amp; drop + focused row</h3>
    <app-demo-card
      [chips]="['rowDragging', 'focusedRowEnabled']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="drag" />
    </app-demo-card>

    <h3>Empty state &amp; loading panel</h3>
    <app-demo-card
      [chips]="['renderNoData', 'loadPanel', '800ms latency']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="empty" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>renderRow</code> replaces only <em>data</em> rows — group rows,
        detail rows and summaries keep their built-in rendering;
        sorting/filtering/selection still work through the declared columns.
      </li>
      <li>
        <code>rowAlternation</code> stripes odd rows via the
        <code>--oge-row-alt-bg</code> token.
      </li>
      <li>
        <code>onRowReordered</code> reports the moved key plus from/to view
        positions; with a plain array the order is persisted in place.
      </li>
      <li>
        <code>focusedRowKey</code> is a controlled prop — set it and the row
        highlights; <code>onFocusedRowKeyChange</code> reports the user's moves.
      </li>
      <li>
        <code>loadPanel</code> shows a spinner overlay for any in-flight load of
        a remote source.
      </li>
    </ul>
  `,
})
export class ReactGridRowsDemos {
  protected readonly demos = GRID_ROWS_DEMOS;
  protected readonly rowTemplate = () => createElement(RowTemplateDemo);
  protected readonly drag = () => createElement(DragDemo);
  protected readonly empty = () => createElement(EmptyDemo);
}
