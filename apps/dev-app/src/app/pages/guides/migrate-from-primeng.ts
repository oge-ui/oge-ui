import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  BUTTON,
  CODEMOD,
  CONFIRM,
  DARK,
  DIALOG,
  MENU_ADAPTER,
  MENU_ADAPTER_REACT,
  TOAST,
  TREE,
} from './migrate-from-primeng-snippets';

const SECTIONS = [
  'Codemod',
  'Component map',
  'Defaults that differ',
  'Menus',
  'Buttons',
  'Dialogs, confirm and toasts',
  'Trees',
  'Dark mode',
  'Moving one screen at a time',
];

/** PrimeNG → OGE, Angular element / React component. */
const COMPONENT_ROWS: string[][] = [
  [
    '`p-table`',
    '`oge-grid` · `<OgeGrid>`',
    '`@oge-ui/grid` · `@oge-ui/react-grid`',
  ],
  ['`p-treeTable`', '`oge-tree-list` · `<OgeTreeList>`', '`@oge-ui/tree-list`'],
  ['`p-tree`', '`oge-tree-view` · `<OgeTreeView>`', '`@oge-ui/navigation`'],
  ['`p-dialog`', '`oge-modal` · `<OgeModal>`', '`@oge-ui/overlay`'],
  [
    '`p-confirmDialog` + `ConfirmationService`',
    '`OgeModalService.confirm()` · `useOgeModals().confirm()`',
    '`@oge-ui/overlay`',
  ],
  [
    '`p-toast` + `MessageService`',
    '`OgeToastService` · `useOgeToasts()`',
    '`@oge-ui/overlay`',
  ],
  [
    '`p-contextMenu`',
    '`[ogeContextMenu]` · `<OgeContextMenu>`',
    '`@oge-ui/overlay`',
  ],
  [
    '`p-menu`, `p-tieredMenu`',
    '`oge-menu-list` · `<OgeMenuList>`',
    '`@oge-ui/overlay`',
  ],
  ['`p-menubar`', '`oge-menubar` · `<OgeMenubar>`', '`@oge-ui/navigation`'],
  [
    '`p-popover` (`p-overlayPanel`)',
    '`oge-popover` · `<OgePopover>`',
    '`@oge-ui/overlay`',
  ],
  ['`pTooltip`', '`[ogeTooltip]` · `<OgeTooltip>`', '`@oge-ui/overlay`'],
  ['`p-button`', '`oge-button` · `<OgeButton>`', '`@oge-ui/buttons`'],
  [
    '`p-selectButton`',
    '`oge-button-group` · `<OgeButtonGroup>`',
    '`@oge-ui/buttons`',
  ],
  [
    '`p-splitButton`',
    '`oge-drop-down-button` · `<OgeDropDownButton>`',
    '`@oge-ui/buttons`',
  ],
  [
    '`p-select` (`p-dropdown`)',
    '`oge-select-box` · `<OgeSelectBox>`',
    '`@oge-ui/inputs`',
  ],
  ['`p-multiSelect`', '`oge-tag-box` · `<OgeTagBox>`', '`@oge-ui/inputs`'],
  [
    '`p-datepicker` (`p-calendar`)',
    '`oge-date-box` · `<OgeDateBox>`',
    '`@oge-ui/inputs`',
  ],
  [
    '`p-inputNumber`',
    '`oge-number-box` · `<OgeNumberBox>`',
    '`@oge-ui/inputs`',
  ],
  ['`p-tabs` (`p-tabView`)', '`oge-tabs` · `<OgeTabs>`', '`@oge-ui/tabs`'],
  [
    '`p-breadcrumb`',
    '`oge-breadcrumb` · `<OgeBreadcrumb>`',
    '`@oge-ui/navigation`',
  ],
  [
    '`p-paginator`',
    '`oge-pagination` · `<OgePagination>`',
    '`@oge-ui/navigation`',
  ],
  ['`p-stepper`', '`oge-stepper` · `<OgeStepper>`', '`@oge-ui/navigation`'],
  [
    '`p-drawer` (`p-sidebar`)',
    '`oge-drawer` · `<OgeDrawer>`',
    '`@oge-ui/navigation`',
  ],
  [
    '`p-fileUpload`',
    '`oge-file-uploader` · `<OgeFileUploader>`',
    '`@oge-ui/upload`',
  ],
  ['`p-editor`', '`oge-editor` · `<OgeEditor>`', '`@oge-ui/editor`'],
  ['`p-chart`', '`oge-chart` · `<OgeChart>`', '`@oge-ui/charts`'],
];

/** Defaults a straight port gets wrong. */
const DEFAULT_ROWS: string[][] = [
  [
    'Dialog is modal',
    '`modal` = `false`',
    'always modal (`oge-window` is the non-modal one)',
  ],
  [
    'Backdrop click closes',
    '`dismissableMask` = `false`',
    '`closeOnBackdropClick` = `true`',
  ],
  ['Dialog can be dragged', '`draggable` = `true`', '`dragEnabled` = `false`'],
  [
    'Dialog can be resized',
    '`resizable` = `true`',
    '`resizeEnabled` = `false`',
  ],
  [
    'Page scroll locked while open',
    '`blockScroll` = `false`',
    '`scrollLock` = `true`',
  ],
  [
    'Escape closes',
    '`closeOnEscape` = `true`',
    '`closeOnEscape` = `true` — hiding ✕ does not turn it off',
  ],
  ['Toast lifetime', '`life` = 3000 ms', '`toastDisplayTime` = 4000 ms'],
  ['Toast position', '`top-right`', '`bottom-end` (logical: mirrors in RTL)'],
  ['Tooltip side', '`tooltipPosition` = `right`', '`tooltipPlacement` = `top`'],
  ['Tooltip delay', 'none', '`tooltipShowDelayMs` = 400 ms'],
  [
    'Text column filter',
    '`startsWith`',
    '`contains` — accent- and case-insensitive, Turkish İ / ı included',
  ],
];

/** PrimeNG `p-button` inputs → `oge-button`. */
const BUTTON_ROWS: string[][] = [
  ['`label`', '`text`'],
  [
    '`icon` (a CSS class)',
    '`iconClass` — or project an SVG with `[ogeButtonIcon]`',
  ],
  [
    '`severity`: `secondary` · `success` · `info` · `warn` · `danger` · `help` · `contrast`',
    '`severity`: `normal` · `success` · `accent` · `warning` · `danger` (`color` for anything else)',
  ],
  [
    '`outlined` · `text` · `link`',
    "`stylingMode: 'outlined' | 'text' | 'link'`",
  ],
  ['`rounded`', "`shape: 'pill'`"],
  ['`fluid`', '`fluid`'],
  ['`loading` · `loadingIcon`', '`loading` · `loadingText`'],
  ['`badge`', '`badge`'],
  [
    '`(onClick)`',
    '`(clicked)` — passes the click guard, hold-to-confirm and single-flight `action`',
  ],
];

/**
 * `/guides/migrate-from-primeng` — the component map, the defaults that
 * differ, and the adapters for moving a PrimeNG app to OGE screen by screen.
 */
@Component({
  selector: 'app-guide-migrate-from-primeng',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Migrate from PrimeNG"
      category="Guides"
      categoryLink="/guides"
      [chips]="['component map', 'defaults', 'MenuItem adapter']"
    >
      <p>
        PrimeNG and OGE cover the same ground, so most screens move by renaming
        elements and inputs. What needs care is smaller: a handful of defaults
        point the other way, menus use another item model, and confirm and toast
        calls return promises instead of taking callbacks. This page lists all
        three and the adapters that keep your existing models.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="codemod" class="scroll-mt-20">Codemod</h2>
    <p>
      Every OGE package ships a <code>migrate-primeng</code> schematic. It
      rewrites <code>p-button</code>, <code>p-dialog</code>,
      <code>p-tree</code> and <code>pTooltip</code> in templates (files and
      inline <code>template:</code> strings), swaps the PrimeNG modules for the
      OGE standalone imports, and turns <code>MenuItem</code> into
      <code>OgePrimeMenuItem</code>. What it cannot translate one-to-one — a
      table's columns, a defaults difference, a bound style flag — it keeps and
      marks with <code>TODO(oge-migrate)</code>, and the run ends with a list of
      those spots. Commit first and review the diff.
    </p>
    <app-code-block [code]="codemod" language="bash" />

    <h2 id="component-map" class="scroll-mt-20">Component map</h2>
    <p>
      Every Angular element has a React twin with the same options, so a mixed
      codebase moves with one vocabulary.
    </p>
    <app-guide-table
      caption="PrimeNG components and their OGE counterparts"
      [head]="['PrimeNG', 'OGE (Angular · React)', 'Package']"
      [rows]="componentRows"
    />

    <h2 id="defaults-that-differ" class="scroll-mt-20">Defaults that differ</h2>
    <p>
      These are the defaults a one-to-one port gets wrong without an error —
      check them on every screen you move.
    </p>
    <app-guide-table
      caption="Defaults that differ"
      [head]="['Behaviour', 'PrimeNG default', 'OGE default']"
      [rows]="defaultRows"
    />

    <h2 id="menus" class="scroll-mt-20">Menus</h2>
    <p>
      OGE menus take <code>OgeMenuItem</code>.
      <code>ogeFromPrimeMenuItems()</code> converts your PrimeNG
      <code>MenuItem</code> arrays as they are, submenus included:
      <code>label</code> → <code>text</code>, <code>command</code> →
      <code>action</code>, an icon class → <code>iconClass</code>,
      <code>routerLink</code> (with <code>queryParams</code> and
      <code>fragment</code>) → <code>url</code>, <code>styleClass</code> →
      <code>cssClass</code>, <code>title</code> / <code>tooltip</code> →
      <code>hint</code>; <code>separator</code>, <code>disabled</code>,
      <code>visible</code>, <code>badge</code>, <code>shortcut</code> and
      <code>items</code> keep their names. A router link becomes a real
      <code>href</code> (middle-click opens a tab); hand it to the router in the
      item-click handler.
    </p>
    <app-code-block [code]="menuAdapter" language="ts" />
    <app-code-block [code]="menuAdapterReact" language="tsx" />

    <h2 id="buttons" class="scroll-mt-20">Buttons</h2>
    <app-guide-table
      caption="p-button inputs on oge-button"
      [head]="['PrimeNG', 'OGE']"
      [rows]="buttonRows"
    />
    <app-code-block [code]="button" language="html" />

    <h2 id="dialogs-confirm-and-toasts" class="scroll-mt-20">
      Dialogs, confirm and toasts
    </h2>
    <p>
      A dialog that relied on PrimeNG's defaults needs its options spelled out —
      or dropped, since OGE's are the usual modal ones:
    </p>
    <app-code-block [code]="dialog" language="html" />
    <p>
      Confirm and toast services need no host element in the template.
      <code>confirm()</code> resolves to a boolean, and it adds gates for
      irreversible actions that PrimeNG leaves to you (<code>details</code>,
      <code>typeToConfirm</code>, <code>acknowledgeLabel</code>). Toast
      severities are <code>info</code>, <code>success</code>,
      <code>warning</code> and <code>error</code>:
    </p>
    <app-code-block [code]="confirm" language="ts" />
    <app-code-block [code]="toast" language="ts" />

    <h2 id="trees" class="scroll-mt-20">Trees</h2>
    <p>
      OGE trees read your own objects instead of a
      <code>TreeNode</code> wrapper: name the key, label and children fields (or
      pass flat rows with a parent id). Drops report through
      <code>itemReordered</code> and never mutate your data;
      <code>itemDragStarting</code>, <code>itemDragOver</code> and
      <code>allowDropBetween</code> replace PrimeNG's
      <code>draggableNodes</code> / <code>droppableNodes</code>
      checks.
    </p>
    <app-code-block [code]="tree" language="ts" />

    <h2 id="dark-mode" class="scroll-mt-20">Dark mode</h2>
    <p>
      PrimeNG's <code>darkModeSelector</code> has two OGE forms: the prebuilt
      <code>dark-class.css</code> for <code>.dark</code> and
      <code>[data-theme="dark"]</code>, and the Sass <code>theme()</code> mixin
      for any other selector. See
      <a routerLink="/getting-started/styling">Styling</a> for the tokens and
      the bridge themes.
    </p>
    <app-code-block [code]="dark" language="scss" />

    <h2 id="moving-one-screen-at-a-time" class="scroll-mt-20">
      Moving one screen at a time
    </h2>
    <ul>
      <li>
        Both libraries can live in one app while you move: OGE styles target
        only <code>.oge-*</code> classes and declare only
        <code>--oge-*</code> tokens, so they never restyle a PrimeNG element.
      </li>
      <li>
        Start with the screens whose grids carry the most logic — server
        filtering, grouping, export — since that is where the APIs differ most;
        the
        <a routerLink="/guides/filter-contract">filter contract</a> describes
        what the grid sends to your server.
      </li>
      <li>
        Keep your <code>MenuItem</code> models and convert them at the edge with
        <code>ogeFromPrimeMenuItems()</code> until the last PrimeNG menu is
        gone.
      </li>
    </ul>
  `,
})
export class GuideMigrateFromPrimengPage {
  protected readonly sections = SECTIONS;
  protected readonly componentRows = COMPONENT_ROWS;
  protected readonly defaultRows = DEFAULT_ROWS;
  protected readonly buttonRows = BUTTON_ROWS;
  protected readonly menuAdapter = MENU_ADAPTER;
  protected readonly codemod = CODEMOD;
  protected readonly menuAdapterReact = MENU_ADAPTER_REACT;
  protected readonly button = BUTTON;
  protected readonly dialog = DIALOG;
  protected readonly confirm = CONFIRM;
  protected readonly toast = TOAST;
  protected readonly tree = TREE;
  protected readonly dark = DARK;
}
