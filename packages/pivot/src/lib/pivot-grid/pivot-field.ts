import { Directive, input } from '@angular/core';
import type {
  CustomSummaryFn,
  PivotArea,
  PivotGroupInterval,
  PivotPath,
  PivotRunningTotal,
  PivotSummaryDisplayMode,
  OgeValueFormat,
  SortDirection,
  SummaryType,
} from '@oge-ui/core';
import type {
  OgePivotLabelFilter,
  OgePivotTopNFilter,
  OgePivotValueFilter,
} from '@oge-ui/pivot-engine';

/**
 * Declarative pivot field. Renders nothing itself — the pivot grid collects
 * these via content projection:
 *
 * ```html
 * <oge-pivot-grid [data]="sales">
 *   <oge-pivot-field dataField="region" area="row" />
 *   <oge-pivot-field dataField="date" area="column" groupInterval="year" />
 *   <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
 * </oge-pivot-grid>
 * ```
 */
// Renderless configuration directives intentionally use element selectors.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'oge-pivot-field' })
export class OgePivotField<T = unknown> {
  /** Dotted paths supported. */
  readonly dataField = input.required<string>();
  /** Unique id; defaults to `dataField`. */
  readonly id = input<string>();
  readonly caption = input<string>();
  readonly area = input<PivotArea | null>(null);
  readonly areaIndex = input<number>();
  readonly dataType = input<'string' | 'number' | 'date' | 'boolean'>();
  readonly groupInterval = input<PivotGroupInterval>();
  // measures
  readonly summaryType = input<SummaryType>('sum');
  readonly summaryName = input<string>();
  readonly summaryDisplayMode = input<PivotSummaryDisplayMode>('none');
  readonly runningTotal = input<PivotRunningTotal>();
  readonly calculateCustomSummary = input<CustomSummaryFn<T>>();
  // row/column fields
  readonly sortOrder = input<SortDirection>();
  readonly sortBySummaryField = input<string>();
  readonly sortBySummaryPath = input<PivotPath>();
  readonly filterValues = input<readonly unknown[]>();
  readonly filterType = input<'include' | 'exclude'>('include');
  readonly showTotals = input(true);
  // out-of-band functions
  readonly selector = input<(row: T) => unknown>();
  /**
   * Cell / member text: a function, or a declarative `OgeValueFormat`
   * (`{ type: 'currency', currency: 'EUR' }`) rendered in the grid's `locale`.
   */
  readonly format = input<((value: unknown) => string) | OgeValueFormat>();
  readonly customizeText =
    input<(info: { value: unknown; valueText: string }) => string>();
  // member filters (row / column fields), applied before aggregation
  /** Keeps the members whose label matches (`contains`, `beginsWith`, …). */
  readonly labelFilter = input<OgePivotLabelFilter>();
  /** Keeps the members whose total of a measure passes the comparison. */
  readonly valueFilter = input<OgePivotValueFilter>();
  /** Keeps the top (or bottom) N members by a measure's total. */
  readonly topN = input<OgePivotTopNFilter>();
}
