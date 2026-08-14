import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_BREADCRUMB_API,
  OGE_REACT_BREADCRUMB_CONFIG_API,
  OGE_REACT_BREADCRUMB_ITEM_API,
} from './breadcrumb-api-data';

/**
 * The React half of the breadcrumb API reference.
 *
 * Not a route of its own — it renders inside the navigation API page when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 *
 * The second block is the React face of `<oge-breadcrumb-item>`: React
 * reserves the `key` prop, so a crumb is an `OgeBreadcrumbItemData` object in
 * the `items` array — the same fields.
 */
@Component({
  selector: 'app-react-navigation-breadcrumb-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference
      title="&lt;OgeBreadcrumb&gt;"
      [sections]="breadcrumbApi"
    />
    <app-api-reference
      title="OgeBreadcrumbItem (OgeBreadcrumbItemData)"
      [sections]="breadcrumbItemApi"
    />
    <app-api-reference
      title="Breadcrumb configuration"
      [sections]="breadcrumbConfigApi"
    />
  `,
})
export class ReactNavigationBreadcrumbApiSections {
  protected readonly breadcrumbApi = OGE_REACT_BREADCRUMB_API;
  protected readonly breadcrumbItemApi = OGE_REACT_BREADCRUMB_ITEM_API;
  protected readonly breadcrumbConfigApi = OGE_REACT_BREADCRUMB_CONFIG_API;
}
