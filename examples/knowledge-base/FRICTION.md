# Friction Log — Knowledge Base (`oge-ui@1.1.6`)

Everything below was encountered while building `knowledge-base` against the published `oge-ui@1.1.6` npm package and its `llms.txt` documentation.

---

## 1. `<oge-drawer>` requires an explicit `[ogeDrawerPanel]` child directive for the sidebar content

### What happened
Unlike components that accept a `panel` input or named slot attribute, `<oge-drawer>` splits its projected children using the `[ogeDrawerPanel]` directive (`OgeDrawerPanel`). If `OgeDrawerPanel` is not imported alongside `OgeDrawer` and applied to the `<aside ogeDrawerPanel>` element, the drawer panel stays empty and everything is rendered into the main content area.

### Resolution
Imported `OgeDrawerPanel` from `oge-ui` and placed `ogeDrawerPanel` on the `<aside class="drawer-sidebar" ogeDrawerPanel>` element inside `<oge-drawer>`.

---

## 2. `<oge-autocomplete>` uses `[data]` (not `[items]`) while `<oge-select-box>` and `<oge-button-group>` use `[items]`

### What happened
In `@oge-ui/inputs` and `@oge-ui/buttons`, `<oge-select-box>` and `<oge-button-group>` bind their option arrays via `[items]="..."`, whereas `<oge-autocomplete>` binds its suggestion list via `[data]="..."` (`data: readonly T[] | DataSource<T>`).

### Resolution
Checked `node_modules/@oge-ui/inputs/llms.txt` and bound `[data]="articleSearchItems()"` with `valueExpr="title"` and `[searchExpr]="['title', 'category', 'tagsText']"` on `<oge-autocomplete>`.

---

## 3. Default Angular CLI bundle budgets (`500kB` initial / `4kB` component style) fail when importing `oge-ui`

### What happened
Because Angular's `oge-ui` root barrel re-exports all MIT component families and ships component styles inside the components, a newly scaffolded `ng new` project with default Angular CLI budgets (`500kB` initial warning / `1MB` error) emits budget warnings/errors on `ng build` until `angular.json` budgets are raised.

### Resolution
Updated `projects.knowledge-base.architect.build.configurations.production.budgets` in `angular.json` to `"maximumWarning": "3.5MB"` / `"maximumError": "5MB"`.
