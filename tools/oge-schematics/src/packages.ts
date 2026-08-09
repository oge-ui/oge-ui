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
      need: 'date picker, toggle, radio',
      use: '`<oge-date-box>`, `<oge-date-range-box>`, `<oge-check-box>`, `<oge-switch>`, `<oge-radio-group>`',
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
  ],
};

/** Every package whose usage rows are worth listing, in a stable order. */
export const OGE_USAGE_ORDER: readonly string[] = [
  '@oge-ui/grid',
  '@oge-ui/tree-list',
  '@oge-ui/pivot',
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
