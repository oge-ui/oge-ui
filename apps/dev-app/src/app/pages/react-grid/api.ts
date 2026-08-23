import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_GRID_API,
  OGE_REACT_GRID_COLUMN_API,
  OGE_REACT_GRID_TYPES_API,
} from './react-grid-api-data';

/**
 * The React half of the data-grid API reference.
 *
 * Not a route of its own — it renders inside `/components/data-grid/api`
 * when the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * table. The three blocks mirror the Angular page's, so the two views read
 * as one page across the switch.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the component to reach
 * `@oge-ui/react-grid`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-grid-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeGrid&gt;" [sections]="gridApi" />
    <app-api-reference title="OgeGridColumnProps" [sections]="columnApi" />
    <app-api-reference
      title="Grid types &amp; configuration"
      [sections]="typesApi"
    />
  `,
})
export class ReactGridApiSections {
  protected readonly gridApi = OGE_REACT_GRID_API;
  protected readonly columnApi = OGE_REACT_GRID_COLUMN_API;
  protected readonly typesApi = OGE_REACT_GRID_TYPES_API;
}
