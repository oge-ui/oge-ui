import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactNavigationBreadcrumbApiSections } from './breadcrumb-api';
import { ReactNavigationDrawerApiSections } from './drawer-api';
import { ReactNavigationMenubarApiSections } from './menubar-api';
import { ReactNavigationPaginationApiSections } from './pagination-api';
import { ReactNavigationStepperApiSections } from './stepper-api';
import { ReactNavigationTreeViewApiSections } from './tree-view-api';

/**
 * The React half of the navigation family's API reference — the index page.
 *
 * Not a route of its own — it renders inside `/components/tree-view/api` when
 * the reader has chosen React (ADR 0002). The Angular family keeps all fourteen
 * blocks on one page, so this page keeps them on one page too, in the same
 * order; each block lives in the component's own `*-api.ts` section component
 * (the files `tools/docs-tools/lib/manifest.mjs` lists as this package's
 * `apiPage` entries), and this index composes them.
 *
 * Composing rather than re-declaring is deliberate: the `llms.txt` generator
 * reads every `apiPage`'s `<app-api-reference>` bindings and concatenates them,
 * so a block declared both here and in its component page would reach
 * `@oge-ui/react-navigation`'s machine-readable docs twice. The reading order
 * of the composed blocks is `REACT_NAVIGATION_API_SECTIONS` in
 * `./react-navigation-api-data`, which the Angular page binds to its TOC.
 */
@Component({
  selector: 'app-react-navigation-api',
  imports: [
    ReactNavigationTreeViewApiSections,
    ReactNavigationDrawerApiSections,
    ReactNavigationStepperApiSections,
    ReactNavigationMenubarApiSections,
    ReactNavigationBreadcrumbApiSections,
    ReactNavigationPaginationApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-react-navigation-tree-view-api />
    <app-react-navigation-drawer-api />
    <app-react-navigation-stepper-api />
    <app-react-navigation-menubar-api />
    <app-react-navigation-breadcrumb-api />
    <app-react-navigation-pagination-api />
  `,
})
export class ReactNavigationApiSections {}
