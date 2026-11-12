import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  API,
  COLUMNS,
  RENDERER,
  SERVER,
} from './migrate-from-ag-grid-snippets';

const SECTIONS = [
  'Grid options',
  'Column definitions',
  'Server data',
  'Cell renderers',
  'State and the grid API',
];

const GRID_ROWS: string[][] = [
  ['`rowData`', '`data` (an array or a `DataSource`)'],
  ['`getRowId`', '`keyField`'],
  ['`columnDefs`', '`<oge-column>` children or `columns`'],
  [
    '`defaultColDef`',
    'column defaults are sensible: sortable, filterable, resizable with `columnResize`',
  ],
  ['`pagination` · `paginationPageSize`', '`paging: { pageSize }`'],
  [
    '`rowSelection`',
    "`selectionMode: 'single' | 'multiple'` (+ `selectedKeys`)",
  ],
  [
    '`cellSelection` (range selection)',
    "`rangeSelection` with `selectionMode: 'cell'`",
  ],
  [
    "`rowModelType: 'serverSide'` / `'infinite'`",
    "a `CustomDataSource`; `scrolling: { mode: 'infinite' }` for block loading",
  ],
  ['`rowGroupPanelShow`', '`groupPanel`'],
  ['`rowGroup` on a column', '`groupIndex` on the column (or `groupBy`)'],
  ['`aggFunc`', '`groupSummary` / `totalSummary` on the column'],
  ['`floatingFilter`', '`filterRow`'],
  [
    'set filter (`agSetColumnFilter`)',
    '`headerFilter` (value list, conditions, or both)',
  ],
  ['quick filter (`quickFilterText`)', '`searchPanel`'],
  [
    '`rowDragManaged` · `rowDragEntireRow`',
    '`rowDragging` (`rowDragGroup` across grids, `rowDragExternal` to other apps)',
  ],
  [
    '`masterDetail` · `detailCellRenderer`',
    'a detail template (`*ogeDetailTemplate`)',
  ],
  [
    '`pinnedTopRowData` · `pinnedBottomRowData`',
    '`pinnedTopRows` · `pinnedBottomRows`',
  ],
  ['`enableRtl`', '`rtlEnabled`'],
  [
    '`exportDataAsExcel` / `exportDataAsCsv`',
    '`exportGridToExcel()` (`@oge-ui/grid/export-excel`) · `getCsv()`',
  ],
];

const COLUMN_ROWS: string[][] = [
  ['`field`', '`field`'],
  ['`headerName`', '`caption`'],
  ['`width` · `minWidth` · `maxWidth`', '`width` · `minWidth` · `maxWidth`'],
  ['`hide`', '`visible: false`'],
  ['`pinned`', "`pinned: 'left' | 'right'`"],
  [
    '`sortable: false` · `filter: false`',
    '`sortable: false` · `filterable: false`',
  ],
  ['`sort` · `sortIndex`', '`sortOrder` · `sortIndex`'],
  ['`valueGetter`', '`calculateCellValue`'],
  [
    '`valueFormatter`',
    '`format` (a function or a declarative `OgeValueFormat`)',
  ],
  [
    '`comparator`',
    '`calculateSortValue`, or `sorting.compare` for the whole grid',
  ],
  ['`cellRenderer`', '`*ogeCellTemplate`'],
  ['`headerComponent`', '`*ogeHeaderTemplate`'],
  [
    '`editable` · `cellEditor`',
    '`editable` · `*ogeEditTemplate` (`editing` on the grid)',
  ],
  ['`cellClassRules`', "`conditionalFormats` or the grid's `cellClass`"],
  ['`children` (column groups)', '`<oge-column-group>`'],
];

/**
 * `/guides/migrate-from-ag-grid` — grid options, column definitions, server
 * data, renderers and state, AG Grid to the OGE grid.
 */
@Component({
  selector: 'app-guide-migrate-from-ag-grid',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Migrate from AG Grid"
      category="Guides"
      categoryLink="/guides"
      [chips]="['grid options', 'columnDefs', 'server-side rows']"
    >
      <p>
        The OGE grid covers what an AG Grid screen usually uses — sorting,
        filtering, grouping with summaries, selection, editing, pinned rows and
        columns, master-detail, export — with one difference in shape: server
        data goes through a data source that receives a single
        <code>LoadOptions</code> object instead of a row-model callback.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="grid-options" class="scroll-mt-20">Grid options</h2>
    <app-guide-table
      caption="AG Grid grid options on oge-grid"
      [head]="['AG Grid', 'OGE grid']"
      [rows]="gridRows"
    />

    <h2 id="column-definitions" class="scroll-mt-20">Column definitions</h2>
    <app-guide-table
      caption="AG Grid column definitions on oge-column"
      [head]="['AG Grid ColDef', 'OGE column']"
      [rows]="columnRows"
    />
    <app-code-block [code]="columns" language="ts" />

    <h2 id="server-data" class="scroll-mt-20">Server data</h2>
    <p>
      One request carries paging, sorting, the filter tree, grouping and the
      summaries; value lists ask <code>distinct()</code>. The
      <a routerLink="/guides/filter-contract">filter contract</a> says what each
      operator means, with test vectors your server can run.
    </p>
    <app-code-block [code]="server" language="ts" />

    <h2 id="cell-renderers" class="scroll-mt-20">Cell renderers</h2>
    <app-code-block [code]="renderer" language="html" />

    <h2 id="state-and-the-grid-api" class="scroll-mt-20">
      State and the grid API
    </h2>
    <p>
      Column state, filter model and sort model are one
      <code>GridStateSnapshot</code>; <code>stateKey</code> persists it and
      <code>stateMigrations</code> upgrades older saved formats.
    </p>
    <app-code-block [code]="api" language="ts" />
  `,
})
export class GuideMigrateFromAgGridPage {
  protected readonly sections = SECTIONS;
  protected readonly gridRows = GRID_ROWS;
  protected readonly columnRows = COLUMN_ROWS;
  protected readonly columns = COLUMNS;
  protected readonly server = SERVER;
  protected readonly renderer = RENDERER;
  protected readonly api = API;
}
