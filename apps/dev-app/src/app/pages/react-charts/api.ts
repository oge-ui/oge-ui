import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_CHART_API,
  OGE_REACT_CHARTS_CONFIG_API,
  OGE_REACT_PIE_CHART_API,
  OGE_REACT_POLAR_CHART_API,
  OGE_REACT_RANGE_SELECTOR_API,
} from './react-charts-api-data';

/**
 * The React half of the charts API reference.
 *
 * Not a route of its own — it renders inside `/components/charts/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * table. The five blocks mirror the Angular page's, so the two views read as
 * one page across the switch and the parity gate can diff them member by
 * member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the components to reach
 * `@oge-ui/react-charts`' machine-readable docs.
 */
@Component({
  selector: 'app-react-charts-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeChart&gt;" [sections]="chartApi" />
    <app-api-reference title="&lt;OgePieChart&gt;" [sections]="pieApi" />
    <app-api-reference title="&lt;OgePolarChart&gt;" [sections]="polarApi" />
    <app-api-reference title="&lt;OgeRangeSelector&gt;" [sections]="rangeApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactChartsApiSections {
  protected readonly chartApi = OGE_REACT_CHART_API;
  protected readonly pieApi = OGE_REACT_PIE_CHART_API;
  protected readonly polarApi = OGE_REACT_POLAR_CHART_API;
  protected readonly rangeApi = OGE_REACT_RANGE_SELECTOR_API;
  protected readonly configApi = OGE_REACT_CHARTS_CONFIG_API;
}
