import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_PAGINATION_API,
  OGE_REACT_PAGINATION_CONFIG_API,
} from './pagination-api-data';

/**
 * The React half of the pagination API reference.
 *
 * Not a route of its own — it renders inside `/components/pagination/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular tables.
 * The block order mirrors the Angular page exactly, so the two views read as
 * one page across the switch and the parity gate can diff them block by block.
 *
 * Two idiom differences are documented in the tables rather than hidden: the
 * jump-to-page input is uncontrolled and commits on blur or Enter (React has no
 * `onChange` bound to the native `change` event), and `pageCount` is a handle
 * method instead of a readonly signal.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach
 * `@oge-ui/react-navigation`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-navigation-pagination-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference
      title="&lt;OgePagination&gt;"
      [sections]="paginationApi"
    />
    <app-api-reference
      title="Pagination configuration"
      [sections]="paginationConfigApi"
    />
  `,
})
export class ReactNavigationPaginationApiSections {
  protected readonly paginationApi = OGE_REACT_PAGINATION_API;
  protected readonly paginationConfigApi = OGE_REACT_PAGINATION_CONFIG_API;
}
