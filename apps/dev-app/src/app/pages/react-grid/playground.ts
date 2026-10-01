import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import {
  OgeGrid,
  type OgeEditingOptions,
  type OgeGridColumnProps,
  type OgePagingOptions,
} from '@oge-ui/react-grid';
import { CodeBlock } from '../../shared/code-block';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import {
  gridPlaygroundSource,
  type GridPlaygroundOptions,
} from './playground-snippets';

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

// Stable prop references: a toggle re-renders the whole tree, and an option
// object that did not change should not look like a new one to the grid.
const GROUP_BY: readonly string[] = ['department'];
const NO_GROUPS: readonly string[] = [];
const BATCH_EDITING: OgeEditingOptions = {
  mode: 'batch',
  allowUpdating: true,
  allowAdding: true,
  allowDeleting: true,
};
const PAGING = new Map<number, OgePagingOptions>();
const pagingFor = (pageSize: number): OgePagingOptions => {
  let paging = PAGING.get(pageSize);
  if (!paging) {
    paging = { pageSize };
    PAGING.set(pageSize, paging);
  }
  return paging;
};
const VIRTUAL_HEIGHT = { height: 520 };

/**
 * The React half of the playground — the page keeps its switches, stats and
 * layout, and this renders the grid they drive as a real React tree (plus the
 * matching JSX) when the reader has chosen React. Every toggle re-renders the
 * React tree through the host's signal effect.
 */
@Component({
  selector: 'app-react-grid-playground',
  imports: [ReactHost, CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-react-host [render]="grid" />
    <app-code-block [code]="snippet()" language="tsx" />
  `,
})
export class ReactGridPlayground {
  readonly options = input.required<GridPlaygroundOptions>();

  private readonly employees = computed(() =>
    makeEmployees(this.options().rowCount),
  );

  protected readonly snippet = computed(() =>
    gridPlaygroundSource(this.options()),
  );

  protected readonly grid = (): ReactNode => {
    const o = this.options();
    return createElement(OgeGrid<Employee>, {
      data: this.employees(),
      keyField: 'id',
      columns: COLUMNS,
      virtualScroll: o.virtualScroll,
      paging: o.paging ? pagingFor(o.pageSize) : false,
      filterRow: o.filterRow,
      headerFilter: o.headerFilter,
      searchPanel: o.searchPanel,
      sortable: o.sortable ? 'multi' : false,
      selectionMode: o.selection ? 'checkbox' : 'none',
      groupPanel: o.grouping,
      groupBy: o.grouping ? GROUP_BY : NO_GROUPS,
      columnChooser: o.columnChooser,
      rowAlternation: o.rowAlternation,
      focusedRowEnabled: o.focusedRow,
      rowDragging: o.rowDragging,
      rtlEnabled: o.rtl ? true : undefined,
      editing: o.editing ? BATCH_EDITING : false,
      style: o.virtualScroll ? VIRTUAL_HEIGHT : undefined,
    });
  };
}
