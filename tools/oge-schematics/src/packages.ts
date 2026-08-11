/**
 * What each installed OGE package is *for*, in the words an AI assistant needs
 * when it decides which component to reach for. This table is the payload of
 * the `AGENTS.md` block that `ng add` writes.
 *
 * Deliberately separate from `tools/docs-tools/lib/manifest.mjs`: that table
 * describes packages for the docs site (npm name, docs route, marketing pitch),
 * this one maps *tasks* to *selectors*.
 */
export interface OgeUsage {
  /** What a developer is trying to build. */
  readonly need: string;
  /** What to use, as it appears in a template or TypeScript file. */
  readonly use: string;
}

export const OGE_USAGE: Readonly<Record<string, readonly OgeUsage[]>> = {
  '@oge-ui/grid': [
    {
      need: 'data table (sort, filter, group, edit, export)',
      use: '`<oge-grid [data]="rows" keyField="id">` with `<oge-column field="…">` children',
    },
  ],
  '@oge-ui/tree-list': [
    {
      need: 'hierarchical table / tree grid',
      use: '`<oge-tree-list [data]="rows" keyField="id" parentIdField="parentId">` with `<oge-column>` children',
    },
  ],
  '@oge-ui/pivot': [
    {
      need: 'cross-tab / pivot analytics',
      use: '`<oge-pivot-grid [data]="rows">` with `<oge-pivot-field>` children',
    },
  ],
  '@oge-ui/bpmn': [
    {
      need: 'BPMN 2.0 process modeler / workflow diagram editor',
      use: '`<oge-bpmn-editor />` — `importXml(xml)` / `exportXml()` round-trip BPMN 2.0 + DI; palette, orthogonal connections, undo/redo, keyboard-accessible canvas',
    },
  ],
  '@oge-ui/scheduler': [
    {
      need: 'scheduler / event calendar with day, week and month views, appointments, drag & resize',
      use: '`<oge-scheduler [dataSource]="appointments" [(currentDate)]="date" [(currentView)]="view" />` — field mapping via `startDateExpr`/`endDateExpr`/`textExpr`, appointment popup + form editing, cancelable `appointmentAdding/Updating/Deleting`',
    },
  ],
  '@oge-ui/charts': [
    {
      need: 'Charts / data visualization: line, area, bar, stacked, scatter, range, candlestick, pie',
      use: '`<oge-chart [dataSource]="data" [series]="series" />` and `<oge-pie-chart>` — field mapping via `argumentField`/`valueField`, `[(visualRange)]` zoom, interactive legend, shared tooltips, `provideOgeChartsConfig()`',
    },
  ],
  '@oge-ui/gantt': [
    {
      need: 'Gantt chart / project plan with task tree, dependencies, critical path',
      use: '`<oge-gantt [tasks]="tasks" [dependencies]="links" />` — field mapping via `keyExpr`/`parentKeyExpr`/`startExpr`/`endExpr`, drag move/resize/progress, dependency drawing, undo/redo, cancelable `taskUpdating`-style events',
    },
  ],
  '@oge-ui/kanban': [
    {
      need: 'Kanban / task board with columns, swimlanes, WIP limits, drag & drop',
      use: '`<oge-kanban [dataSource]="cards" columnExpr="status" titleExpr="title" [columns]="cols" />` — field mapping via `keyExpr`/`columnExpr`/`orderExpr`/`swimlaneExpr`, drag with Escape-cancel, Ctrl+Arrow keyboard moving, cancelable `cardMoving`-style events, built-in dialog/menu/toolbar',
    },
  ],
  '@oge-ui/buttons': [
    {
      need: 'button, async action button',
      use: '`<oge-button text="Save" severity="accent" [action]="save" />`',
    },
    {
      need: 'button group, split / drop-down button',
      use: '`<oge-button-group>`, `<oge-drop-down-button>`',
    },
  ],
  '@oge-ui/inputs': [
    {
      need: 'text / number input',
      use: '`<oge-text-box>`, `<oge-text-area>`, `<oge-number-box>`',
    },
    {
      need: 'select, multi-select, autocomplete',
      use: '`<oge-select-box>`, `<oge-tag-box>`, `<oge-autocomplete>`',
    },
    {
      need: 'slider / range selection',
      use: '`<oge-slider [(value)]="v" [min]="0" [max]="100">`, `<oge-range-slider [(value)]="pair">` — APG keyboard set, live drag commits, Escape cancels the gesture',
    },
    {
      need: 'date picker, toggle, radio',
      use: '`<oge-date-box>`, `<oge-date-range-box>`, `<oge-check-box>`, `<oge-switch>`, `<oge-radio-group>`',
    },
    {
      need: 'color picker dropdown',
      use: '`<oge-color-box [(value)]="color">` — CSS color string value (`format`: hex/rgb/rgba/hsl), gradient + palette views, `editAlphaChannel`, `applyValueMode: instantly | useButtons`',
    },
  ],
  '@oge-ui/overlay': [
    {
      need: 'modal dialog',
      use: '`<oge-modal [(opened)]="open">`, or `OgeModalService.open(Component)` for one-off dialogs',
    },
    {
      need: 'toast / notification / snackbar',
      use: '`inject(OgeToastService).success("Saved")` (also `info`/`warning`/`error`/`show`/`promise`)',
    },
    {
      need: 'tooltip, context menu, anchored popup',
      use: '`ogeTooltip="…"`, `[ogeContextMenu]="items"`, `<oge-menu-list>` inside `<oge-popup>`',
    },
  ],
  '@oge-ui/tabs': [
    {
      need: 'tabs',
      use: '`<oge-tab-panel>` with `<oge-tab text="…">` children (`<oge-tabs>` for a strip with no panels)',
    },
  ],
  '@oge-ui/layout': [
    {
      need: 'accordion / expansion panels',
      use: '`<oge-accordion>` with `<oge-accordion-item title="…">` children',
    },
    {
      need: 'resizable split panes / sidebar layout',
      use: '`<oge-splitter [(sizes)]>` with `<oge-splitter-pane>` children; sizes are ratios, `"240px"` pins a pane',
    },
    {
      need: 'command bar / toolbar with overflow',
      use: '`<oge-toolbar [items]="commands">` with `<oge-toolbar-item>` children; project editors into the `[ogeToolbarBefore|Center|After]` slots',
    },
    {
      need: 'card / content surface (header, media, actions, footer)',
      use: '`<oge-card header="…" stylingMode="outlined|raised|filled|flat">` — sections are the `[ogeCardMedia]`, `[ogeCardActions]`, `[ogeCardFooter]` attribute slots, everything else projected is the content',
    },
    {
      need: 'progress bar / spinner / skeleton placeholder',
      use: '`<oge-progress-bar [value]="v">` (`value: null` = indeterminate; `bufferValue`, `chunkCount`, `severity`), `<oge-load-indicator size="sm|md|lg">`, `<oge-skeleton shape="text|circle|rectangle">` — put `aria-busy` on the loading region, the skeleton itself is decoration',
    },
  ],
  '@oge-ui/forms': [
    {
      need: 'form layout / field groups',
      use: '`<oge-form [(formData)]="model">` with `<oge-form-item field="…">` children, or a data-driven `[items]` array',
    },
    {
      need: 'form validation',
      use: '`[validationRules]` on an item (rules compile to Signal Forms), or bind `[fieldTree]` to an Angular Signal Forms `form()`',
    },
    {
      need: 'validation summary',
      use: '`<oge-validation-summary [errors]="form.errors()" />`, or `[showValidationSummary]` on the form',
    },
  ],
  '@oge-ui/navigation': [
    {
      need: 'tree view / navigation tree',
      use: '`<oge-tree-view [items]="nodes">`',
    },
    {
      need: 'wizard / multi-step flow',
      use: '`<oge-stepper [(activeIndex)]="i" [linear]="true">` with `<oge-step label="…">` children; inside a form use `<oge-form-steps>`',
    },
    {
      need: 'side panel / sidenav / off-canvas menu',
      use: '`<oge-drawer [(opened)]="open" mode="overlay|push|side">` — the panel goes in the `[ogeDrawerPanel]` slot, everything else projected is the content; modality follows `mode`',
    },
    {
      need: 'application menu bar / menubar with nested submenus',
      use: '`<oge-menubar [items]="menu" (itemClick)="run($event)">` — children at any depth open as submenus; `compactBelow` collapses the bar into a hamburger. For plain site navigation prefer a `<nav>` of links (the APG\'s own advice)',
    },
    {
      need: 'breadcrumb / navigation trail',
      use: '`<oge-breadcrumb [items]="trail" (itemClick)="go($event)">` — `url` crumbs are real links, the last crumb carries `aria-current="page"`, and `collapseMode: \'auto\'` folds the oldest middle crumbs into an ellipsis menu against the container width',
    },
    {
      need: 'pagination / pager / page navigation',
      use: '`<oge-pagination [(pageIndex)]="page" [itemCount]="total" [pageSize]="20">` — 0-based `pageIndex`, `pageSize: 0` = all items, `[pageSizes]="[10, 20, \'all\']"` shows the selector, `displayMode: \'adaptive\'` collapses to `N / M` against the container width',
    },
  ],
};

/** Every package whose usage rows are worth listing, in a stable order. */
export const OGE_USAGE_ORDER: readonly string[] = [
  '@oge-ui/grid',
  '@oge-ui/tree-list',
  '@oge-ui/pivot',
  '@oge-ui/bpmn',
  '@oge-ui/scheduler',
  '@oge-ui/gantt',
  '@oge-ui/kanban',
  '@oge-ui/charts',
  '@oge-ui/inputs',
  '@oge-ui/buttons',
  '@oge-ui/overlay',
  '@oge-ui/tabs',
  '@oge-ui/layout',
  '@oge-ui/navigation',
  '@oge-ui/forms',
];

/** The umbrella package re-exports every MIT family from one import path. */
export const UMBRELLA = 'oge-ui';

/** Families the umbrella package pulls in, so its block lists them all. */
export const UMBRELLA_FAMILIES: readonly string[] = [
  '@oge-ui/grid',
  '@oge-ui/tree-list',
  '@oge-ui/inputs',
  '@oge-ui/buttons',
  '@oge-ui/overlay',
  '@oge-ui/tabs',
  '@oge-ui/layout',
  '@oge-ui/navigation',
  '@oge-ui/forms',
];
