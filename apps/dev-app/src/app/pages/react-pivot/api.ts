import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_PIVOT_FIELD_API,
  OGE_REACT_PIVOT_GRID_API,
} from './react-pivot-api-data';

/**
 * The React half of the pivot-grid API reference.
 *
 * Not a route of its own — it renders inside `/components/pivot-grid/api`
 * when the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * tables. The two blocks mirror the Angular page's, so the two views read as
 * one page across the switch.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the component to reach
 * `@oge-ui/react-pivot`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-pivot-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgePivotGrid&gt;" [sections]="pivotApi" />
    <app-api-reference title="OgePivotFieldDef" [sections]="fieldApi" />
  `,
})
export class ReactPivotApiSections {
  protected readonly pivotApi = OGE_REACT_PIVOT_GRID_API;
  protected readonly fieldApi = OGE_REACT_PIVOT_FIELD_API;
}
