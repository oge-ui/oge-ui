/**
 * Hand-written, LLM-facing prose. Everything here answers a question a coding
 * assistant asks before it can emit working OGE code — what to install, which
 * conventions the API follows, and which plausible guesses are wrong.
 *
 * Keep it short. This text is read by a model with a budget, not by a browser.
 */

export const SUMMARY =
  'Signal-based Angular UI component suite for data-heavy applications: a virtualized Data Grid, Tree List, Pivot Grid, BPMN editor, form editors, buttons, overlay surfaces (modal and toast), tabs and layout containers. Angular 22+, standalone components only, zoneless, zero runtime dependencies. MIT licensed, except @oge-ui/pivot and @oge-ui/bpmn which are commercial.';

export const INSTALL = `## Install

\`\`\`sh
npm i oge-ui                 # every MIT family behind one import path
npm i @oge-ui/grid           # …or one family at a time
\`\`\`

Requires Angular >= 22 and Node >= 22.22. Standalone and zoneless applications
are fully supported; nothing depends on \`zone.js\` or NgModules.

Component styles ship inside the components, so **no global stylesheet is
required** and the light theme is built in. Shared engines
(\`@oge-ui/core\`, \`@oge-ui/overlay\`) install automatically as dependencies.

Export features live in secondary entry points so their libraries stay out of
the bundle until used: \`@oge-ui/grid/export-excel\` and
\`@oge-ui/tree-list/export-excel\` need \`exceljs\`, \`@oge-ui/grid/export-pdf\`
needs \`jspdf\`. CSV export is built in.`;

export const CONVENTIONS = `## Writing OGE code

Follow these rules and generated code compiles on the first try.

1. **Standalone only.** There are no NgModules and no \`Oge*Module\` symbols.
   Import the component class and list it in the host component's \`imports\`
   array: \`imports: [OgeGrid, OgeColumn]\`.
2. **Signal APIs, never decorators.** Public members are \`input()\`,
   \`input.required()\`, \`model()\` and \`output()\` — not \`@Input()\`/\`@Output()\`.
   Read them as signals in TypeScript (\`grid.selectedKeys()\`).
3. **Two-way state is \`model()\`.** Bind with the banana box against a signal:
   \`[(selectedKeys)]="keys"\`. \`ngModel\` is supported by the editors in
   \`@oge-ui/inputs\` for reactive/template forms, but signal binding is the
   idiomatic form.
4. **Modes are string unions, never enums.** Write the literal:
   \`selectionMode="multiple"\`, \`editMode="batch"\`, \`stylingMode="outlined"\`,
   \`severity="danger"\`. There is no \`OgeSelectionMode.Multiple\`.
5. **Outputs are past tense with no \`on\` prefix** — \`(rowClick)\`,
   \`(selectionChanged)\`, \`(savedChanges)\`, \`(clicked)\`. Never \`(onRowClick)\`.
6. **\`-ing\` outputs are cancelable.** Events like \`rowInserting\`,
   \`rowUpdating\`, \`rowRemoving\`, \`savingChanges\`, \`exporting\`, the modal's
   \`opening\`/\`closing\` and the tab strip's \`selectionChanging\` carry a mutable
   \`cancel: boolean\` — set \`event.cancel = true\` to veto, and the matching
   past-tense event never fires.
7. **App-wide defaults and every user-facing string** come from a provider:
   \`provideOgeGridConfig()\`, \`provideOgeInputsConfig()\`,
   \`provideOgeButtonsConfig()\`, \`provideOgeOverlayConfig()\`,
   \`provideOgeTabsConfig()\`, \`provideOgeAccordionConfig()\`. Each takes a
   \`messages\` block — that is how localization works; there is no i18n
   dependency.
8. **Styling is CSS custom properties**, all prefixed \`--oge-\`. Never target
   internal class names to change colors or sizing; override the token.
9. **Templates and slots are structural directives on the markup you want**,
   not \`<ng-template>\` wrappers:
   \`<oge-column field="price"><span *ogeCellTemplate="let value">…</span></oge-column>\`,
   \`<div *ogeModalFooter>…</div>\`.

### Theming

\`\`\`css
:root {
  --oge-accent: #4f46e5;   /* selection, focus, primary actions */
  --oge-radius-lg: 10px;
  --oge-row-height: 32px;  /* grid & tree-list density */
}
\`\`\`

Optional stylesheets, imported once: \`@oge-ui/grid/themes/dark.css\` (then put
\`class="oge-theme-dark"\` on \`<html>\` or any subtree),
\`@oge-ui/grid/themes/tailwind.css\` and \`@oge-ui/grid/themes/bootstrap.css\`
(bridge \`--oge-*\` onto an existing design system).`;

export const MISTAKES = `## Common mistakes

Predictable wrong guesses, and what to write instead.

| Wrong | Right |
| --- | --- |
| \`<oge-data-grid>\` | \`<oge-grid>\` |
| \`[dataSource]="rows"\` | \`[data]="rows"\` |
| \`import { OgeGridModule }\` | no modules — \`imports: [OgeGrid, OgeColumn]\` |
| \`@Input() foo\` on an OGE component | \`readonly foo = input<T>()\` |
| \`(onRowClick)\` / \`(onSelectionChanged)\` | \`(rowClick)\` / \`(selectionChanged)\` |
| \`selectionMode="[SelectionMode.Multiple]"\` | \`selectionMode="multiple"\` |
| \`<oge-grid-column>\` | \`<oge-column>\` |
| \`MatDialog\` / \`DialogService\` | \`<oge-modal>\` or \`OgeModalService.open()\` |
| \`MessageService\` / \`ToastrService\` / \`MatSnackBar\` | \`OgeToastService.show()\` (plus \`success/info/warning/error\`) |
| \`<oge-dropdown>\` / \`<oge-combobox>\` | \`<oge-select-box>\` (\`<oge-tag-box>\` when multiple) |
| \`::ng-deep .oge-grid-row { … }\` | override a \`--oge-*\` token |
| importing a theme to get default styles | not needed — styles ship with the components |`;

/** Reads the single source of truth for the site/docs version. */
export function readSiteVersion(packageJsonFile, readFileSync) {
  const { version } = JSON.parse(readFileSync(packageJsonFile, 'utf8'));
  if (!version) {
    throw new Error(`Could not read "version" from ${packageJsonFile}`);
  }
  return version;
}

/**
 * The docs site's version constant, generated rather than hand-maintained.
 *
 * It used to be typed in by hand next to a comment saying "bump together with
 * `nx release version`" — and it drifted at the first release that forgot,
 * shipping a v0.7.0 line inside the v0.8.0 tarballs. The version now has one
 * source, `packages/ui/package.json`, which is the file `nx release` itself
 * bumps; everything downstream derives from it and `docs-tools:llms-check`
 * fails the build when this file no longer matches.
 */
export function buildSiteVersionFile(version) {
  return `/**
 * The published @oge-ui package version shown across the docs site.
 *
 * GENERATED — do not edit. Derived from packages/ui/package.json (the version
 * \`nx release\` bumps) by \`npx nx run docs-tools:llms\`, and checked by
 * \`docs-tools:llms-check\`.
 */
export const SITE_VERSION = '${version}';
`;
}

export const COMMERCIAL_NOTE =
  'This package is commercially licensed — unlike the rest of the suite, it is not MIT. See https://ogeui.com/license before shipping it.';
