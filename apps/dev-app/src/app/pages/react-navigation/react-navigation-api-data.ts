/**
 * The React navigation family's API index metadata.
 *
 * The per-component tables live beside their component (`tree-view-api-data.ts`,
 * `drawer-api-data.ts`, … `pagination-api-data.ts`) and are rendered by the
 * matching `*-api.ts` section components — one file per component, which is
 * what `tools/docs-tools/lib/manifest.mjs` lists as this package's `apiPage`
 * entries. What is left over for the index itself is the reading order, and it
 * lives here so the Angular `pages/navigation/api.ts` page can bind it to
 * `<app-page-toc>` when the reader has chosen React.
 *
 * Block for block the same fourteen entries as the Angular navigation API page,
 * in the same order (`docs/REACT-PARITY.md`: the API page mirrors too) — under
 * the names each layer actually uses: React components are documented as
 * `<OgeX>`, and the declarative Angular children (`<oge-menubar-item>`,
 * `<oge-breadcrumb-item>`) are plain data objects in React.
 */
export const REACT_NAVIGATION_API_SECTIONS = [
  '<OgeTreeView>',
  'Tree view configuration',
  '<OgeDrawer>',
  'Drawer configuration',
  '<OgeStepper>',
  'Stepper configuration',
  '<OgeMenubar>',
  'OgeMenubarItem (OgeMenubarItemData)',
  'Menubar configuration',
  '<OgeBreadcrumb>',
  'OgeBreadcrumbItem (OgeBreadcrumbItemData)',
  'Breadcrumb configuration',
  '<OgePagination>',
  'Pagination configuration',
] as const;
