import { Directive, input } from '@angular/core';
import type {
  CustomSummaryFn,
  PivotArea,
  PivotGroupInterval,
  PivotPath,
  PivotRunningTotal,
  PivotSummaryDisplayMode,
  SortDirection,
  SummaryType,
} from '@oge-ui/core';

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
  readonly format = input<(value: unknown) => string>();
  readonly customizeText = input<(info: { value: unknown; valueText: string }) => string>();
}
