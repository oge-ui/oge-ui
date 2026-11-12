import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import { DATA_SOURCE, GRID } from './migrate-from-devextreme-snippets';

const SECTIONS = [
  'Component map',
  'Data grid',
  'Data sources',
  'Defaults that differ',
];

const COMPONENT_ROWS: string[][] = [
  ['`dx-data-grid`', '`oge-grid` · `<OgeGrid>`'],
  ['`dx-tree-list`', '`oge-tree-list` · `<OgeTreeList>`'],
  ['`dx-pivot-grid`', '`oge-pivot-grid` · `<OgePivotGrid>`'],
  ['`dx-scheduler`', '`oge-scheduler` · `<OgeScheduler>`'],
  ['`dx-gantt`', '`oge-gantt` · `<OgeGantt>`'],
  ['`dx-chart` · `dx-pie-chart`', '`oge-chart` · `oge-pie-chart`'],
  ['`dx-tree-view`', '`oge-tree-view`'],
  ['`dx-popup`', '`oge-modal` (modal) · `oge-window` (non-modal)'],
  ['`dx-popover` · `dx-tooltip`', '`oge-popover` · `[ogeTooltip]`'],
  ['`dx-toast` · `notify()`', '`OgeToastService`'],
  ['`dx-context-menu` · `dx-menu`', '`[ogeContextMenu]` · `oge-menubar`'],
  [
    '`dx-button` · `dx-button-group` · `dx-drop-down-button`',
    '`oge-button` · `oge-button-group` · `oge-drop-down-button`',
  ],
  [
    '`dx-select-box` · `dx-tag-box` · `dx-autocomplete`',
    '`oge-select-box` · `oge-tag-box` · `oge-autocomplete`',
  ],
  [
    '`dx-date-box` · `dx-date-range-box` · `dx-number-box` · `dx-text-box`',
    '`oge-date-box` · `oge-date-range-box` · `oge-number-box` · `oge-text-box`',
  ],
  ['`dx-form`', '`oge-form`'],
  ['`dx-file-uploader`', '`oge-file-uploader`'],
  ['`dx-html-editor`', '`oge-editor`'],
  ['`dx-tabs` · `dx-tab-panel`', '`oge-tab-strip` · `oge-tabs`'],
  [
    '`dx-accordion` · `dx-drawer` · `dx-splitter`',
    '`oge-accordion` · `oge-drawer` · `oge-splitter`',
  ],
];

const GRID_ROWS: string[][] = [
  ['`dataSource`', '`data` (an array or a `DataSource`)'],
  ['`keyExpr`', '`keyField`'],
  [
    '`<dxi-column dataField caption dataType>`',
    '`<oge-column field caption dataType>`',
  ],
  [
    '`calculateCellValue` · `calculateSortValue` · `calculateFilterExpression`',
    'the same names',
  ],
  [
    '`lookup: { dataSource, valueExpr, displayExpr }`',
    '`lookup` — the same shape',
  ],
  ['`cellTemplate` (`*dxTemplate`)', '`*ogeCellTemplate`'],
  [
    '`filterRow` · `headerFilter` · `searchPanel` · `filterPanel`',
    'the same names (`{ visible: true }` becomes `true`)',
  ],
  [
    '`groupPanel` · `grouping` · `summary.groupItems` / `totalItems`',
    '`groupPanel` · `grouping` · `groupSummary` / `totalSummary` on the column',
  ],
  ['`paging` · `pager`', '`paging: { pageSize, pageSizes }`'],
  ['`selection: { mode }`', '`selectionMode`'],
  ['`editing: { mode, allowUpdating, … }`', '`editing`'],
  ["`scrolling: { mode: 'virtual' }`", "`scrolling: { mode: 'virtual' }`"],
  ['`stateStoring`', '`stateKey` (+ `OGE_STATE_STORAGE` for a custom store)'],
  [
    '`columnChooser` · `allowColumnResizing` · `allowColumnReordering`',
    '`columnChooser` · `columnResize` · `columnReorder`',
  ],
  [
    '`onRowClick` · `onSelectionChanged`',
    '`(rowClick)` · `(selectionChanged)`',
  ],
];

const DEFAULT_ROWS: string[][] = [
  [
    'Grid paging',
    'on — 20 rows per page',
    'off — set `paging: { pageSize: 20 }` to keep pages',
  ],
  [
    'Column resizing',
    '`allowColumnResizing` = `false`',
    '`columnResize` = `true`',
  ],
  [
    'Text filter operator',
    '`contains`',
    '`contains` — accent- and case-insensitive, Turkish İ / ı included',
  ],
];

/**
 * `/guides/migrate-from-devextreme` — the OGE API borrows DevExtreme's
 * vocabulary, so most of the move is renaming.
 */
@Component({
  selector: 'app-guide-migrate-from-devextreme',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Migrate from DevExtreme"
      category="Guides"
      categoryLink="/guides"
      [chips]="['component map', 'data grid', 'data sources']"
    >
      <p>
        OGE speaks much of DevExtreme's vocabulary —
        <code>calculateCellValue</code>, <code>lookup</code>,
        <code>filterRow</code>, <code>headerFilter</code>, load options with
        <code>skip</code>, <code>take</code>, <code>sort</code> and
        <code>filter</code> — so a move is mostly renaming nested option objects
        into flat inputs and <code>dxi-column</code> into
        <code>oge-column</code>.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="component-map" class="scroll-mt-20">Component map</h2>
    <app-guide-table
      caption="DevExtreme components and their OGE counterparts"
      [head]="['DevExtreme', 'OGE']"
      [rows]="componentRows"
    />

    <h2 id="data-grid" class="scroll-mt-20">Data grid</h2>
    <app-guide-table
      caption="dx-data-grid options on oge-grid"
      [head]="['DevExtreme', 'OGE grid']"
      [rows]="gridRows"
    />
    <app-code-block [code]="grid" language="html" />

    <h2 id="data-sources" class="scroll-mt-20">Data sources</h2>
    <p>
      A <code>CustomStore</code> with <code>load</code> becomes a
      <code>CustomDataSource</code>; the load options keep their meaning, and
      the filter is a typed tree rather than nested arrays (see the
      <a routerLink="/guides/filter-contract">filter contract</a>).
    </p>
    <app-code-block [code]="dataSource" language="ts" />

    <h2 id="defaults-that-differ" class="scroll-mt-20">Defaults that differ</h2>
    <app-guide-table
      caption="Defaults that differ"
      [head]="['Behaviour', 'DevExtreme', 'OGE']"
      [rows]="defaultRows"
    />
  `,
})
export class GuideMigrateFromDevextremePage {
  protected readonly sections = SECTIONS;
  protected readonly componentRows = COMPONENT_ROWS;
  protected readonly gridRows = GRID_ROWS;
  protected readonly defaultRows = DEFAULT_ROWS;
  protected readonly grid = GRID;
  protected readonly dataSource = DATA_SOURCE;
}
