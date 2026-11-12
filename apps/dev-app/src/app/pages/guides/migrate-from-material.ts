import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  DIALOG,
  FORM_FIELD,
  SNACK,
  TABLE,
} from './migrate-from-material-snippets';

const SECTIONS = [
  'Component map',
  'Defaults that differ',
  'Tables',
  'Dialogs and snack bars',
  'Form fields',
  'Theming',
];

const COMPONENT_ROWS: string[][] = [
  [
    '`mat-table` + `MatSort` + `mat-paginator`',
    '`oge-grid` (or `oge-simple-table` for a static table)',
    '`@oge-ui/grid` · `@oge-ui/layout`',
  ],
  ['`mat-tree`', '`oge-tree-view`', '`@oge-ui/navigation`'],
  [
    '`MatDialog`',
    '`OgeModalService.open()` · `oge-modal`',
    '`@oge-ui/overlay`',
  ],
  ['`MatSnackBar`', '`OgeToastService`', '`@oge-ui/overlay`'],
  [
    '`mat-menu` + `matMenuTriggerFor`',
    '`oge-drop-down-button` · `[ogeContextMenu]` · `oge-menu-list`',
    '`@oge-ui/buttons` · `@oge-ui/overlay`',
  ],
  ['`matTooltip`', '`[ogeTooltip]`', '`@oge-ui/overlay`'],
  [
    '`mat-button` · `mat-flat-button` · `mat-stroked-button` · `mat-icon-button`',
    "`oge-button` (`stylingMode: 'text' | 'contained' | 'outlined'`)",
    '`@oge-ui/buttons`',
  ],
  ['`mat-button-toggle-group`', '`oge-button-group`', '`@oge-ui/buttons`'],
  [
    '`mat-select`',
    '`oge-select-box` (`oge-tag-box` for multiple)',
    '`@oge-ui/inputs`',
  ],
  ['`mat-autocomplete`', '`oge-autocomplete`', '`@oge-ui/inputs`'],
  [
    '`mat-datepicker`',
    '`oge-date-box` · `oge-date-range-box`',
    '`@oge-ui/inputs`',
  ],
  [
    '`matInput` in `mat-form-field`',
    '`oge-text-box` · `oge-number-box` · `oge-text-area`',
    '`@oge-ui/inputs`',
  ],
  [
    '`mat-checkbox` · `mat-radio-group` · `mat-slide-toggle`',
    '`oge-check-box` · `oge-radio-group` · `oge-switch`',
    '`@oge-ui/inputs`',
  ],
  ['`mat-slider`', '`oge-slider` · `oge-range-slider`', '`@oge-ui/inputs`'],
  ['`mat-tab-group`', '`oge-tabs`', '`@oge-ui/tabs`'],
  ['`mat-stepper`', '`oge-stepper`', '`@oge-ui/navigation`'],
  ['`mat-sidenav`', '`oge-drawer`', '`@oge-ui/navigation`'],
  [
    '`mat-expansion-panel` · `mat-accordion`',
    '`oge-expansion-panel` · `oge-accordion`',
    '`@oge-ui/layout`',
  ],
  [
    '`mat-card` · `mat-chip-set` · `mat-progress-bar` · `mat-progress-spinner`',
    '`oge-card` · `oge-chip-list` · `oge-progress-bar` · `oge-load-indicator`',
    '`@oge-ui/layout`',
  ],
  [
    '`mat-badge`',
    '`badge` input on `oge-button`, or `oge-badge`',
    '`@oge-ui/buttons` · `@oge-ui/layout`',
  ],
];

const DEFAULT_ROWS: string[][] = [
  [
    'Snack bar / toast dismisses itself',
    'no — stays until dismissed unless `duration` is set',
    'yes — after `toastDisplayTime` (4000 ms)',
  ],
  [
    'Tooltip side',
    '`matTooltipPosition` = `below`',
    '`tooltipPlacement` = `top`',
  ],
  [
    'Tooltip delay',
    '`matTooltipShowDelay` = 0',
    '`tooltipShowDelayMs` = 400 ms',
  ],
  [
    'Paging',
    'only with a `mat-paginator` you connect',
    '`paging` on the grid; without it the grid scrolls (virtual when `scrolling.mode` is `virtual`)',
  ],
  [
    'Sorting',
    'only with `matSort` + `mat-sort-header`',
    'on for every column with a `field`; `sortable` turns a column off',
  ],
  [
    'Filtering',
    'a `filterPredicate` you write',
    '`filterRow`, `headerFilter`, `searchPanel` — accent- and case-insensitive',
  ],
];

/**
 * `/guides/migrate-from-material` — the component map and the defaults a
 * port from Angular Material gets wrong.
 */
@Component({
  selector: 'app-guide-migrate-from-material',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Migrate from Angular Material"
      category="Guides"
      categoryLink="/guides"
      [chips]="['component map', 'defaults', 'tables', 'dialogs']"
    >
      <p>
        Material gives you primitives to assemble; OGE components carry the
        behaviour themselves. The move is mostly deletion: the
        <code>MatTableDataSource</code>, sort and paginator wiring becomes one
        grid, and <code>mat-form-field</code> wrappers become editors with their
        own label and validation.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="component-map" class="scroll-mt-20">Component map</h2>
    <p>
      Each Angular element has a React twin with the same options
      (<code>&lt;OgeGrid&gt;</code>, <code>&lt;OgeSelectBox&gt;</code>…).
    </p>
    <app-guide-table
      caption="Angular Material components and their OGE counterparts"
      [head]="['Angular Material', 'OGE', 'Package']"
      [rows]="componentRows"
    />

    <h2 id="defaults-that-differ" class="scroll-mt-20">Defaults that differ</h2>
    <app-guide-table
      caption="Defaults that differ"
      [head]="['Behaviour', 'Angular Material', 'OGE']"
      [rows]="defaultRows"
    />

    <h2 id="tables" class="scroll-mt-20">Tables</h2>
    <p>
      A Material table renders what you give it; the grid owns sorting, paging,
      filtering, grouping, selection, editing and export, in memory or through a
      server data source (see the
      <a routerLink="/guides/filter-contract">filter contract</a>). For a plain
      styled table with no behaviour, use <code>oge-simple-table</code>.
    </p>
    <app-code-block [code]="table" language="html" />

    <h2 id="dialogs-and-snack-bars" class="scroll-mt-20">
      Dialogs and snack bars
    </h2>
    <p>
      Both open components the same way. The OGE modal ref resolves a promise
      instead of exposing an observable, and the dialog closes on a backdrop
      click and Escape like Material's (<code>closeOnBackdropClick</code>,
      <code>closeOnEscape</code>).
    </p>
    <app-code-block [code]="dialog" language="ts" />
    <app-code-block [code]="snack" language="ts" />

    <h2 id="form-fields" class="scroll-mt-20">Form fields</h2>
    <p>
      OGE editors bring their own chrome: <code>label</code>,
      <code>labelMode</code>, hint and error text, and they implement
      <code>ControlValueAccessor</code>, so reactive and template-driven forms
      keep working unchanged.
    </p>
    <app-code-block [code]="formField" language="html" />

    <h2 id="theming" class="scroll-mt-20">Theming</h2>
    <p>
      Material's Sass theme maps onto the <code>--oge-*</code> tokens: set
      <code>--oge-accent</code> to your primary colour and
      <code>--oge-radius</code> to your shape scale, or import a bridge. Dark
      mode follows your own switch through <code>dark-class.css</code> or the
      Sass <code>theme()</code> mixin — see
      <a routerLink="/getting-started/styling">Styling</a>.
    </p>
  `,
})
export class GuideMigrateFromMaterialPage {
  protected readonly sections = SECTIONS;
  protected readonly componentRows = COMPONENT_ROWS;
  protected readonly defaultRows = DEFAULT_ROWS;
  protected readonly table = TABLE;
  protected readonly dialog = DIALOG;
  protected readonly snack = SNACK;
  protected readonly formField = FORM_FIELD;
}
