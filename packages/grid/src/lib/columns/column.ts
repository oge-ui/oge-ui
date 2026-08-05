import { Directive, contentChild, input, model } from '@angular/core';
import type { ValidatorFn } from '@angular/forms';
import type { FilterOperator, SummaryType } from '@oge-ui/core';
import { OgeCellTemplate } from '../templates/cell-template';
import { OgeEditTemplate } from '../templates/edit-template';
import { OgeHeaderTemplate } from '../templates/header-template';

export type OgeDataType = 'string' | 'number' | 'date' | 'boolean';

/**
 * Declarative column definition. Renders nothing itself — the grid collects
 * these via content projection and derives its layout from them:
 *
 * ```html
 * <oge-grid [data]="orders">
 *   <oge-column field="id" caption="#" [width]="60" />
 *   <oge-column field="total" dataType="number" />
 * </oge-grid>
 * ```
 */
// Renderless configuration directives intentionally use element selectors.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'oge-column' })
export class OgeColumn<T = unknown> {
  /** Dotted paths are supported, e.g. `"customer.name"`. */
  readonly field = input<string>();
  /** Header text; derived from `field` when omitted. */
  readonly caption = input<string>();
  /** Number → px; string is used verbatim (e.g. `'2fr'`, `'150px'`). */
  readonly width = input<number | string>();
  readonly dataType = input<OgeDataType>('string');
  /** Custom value formatter applied to the default (non-templated) cell text. */
  readonly format = input<(value: unknown) => string>();
  readonly visible = model(true);
  readonly sortable = input(true);
  readonly filterable = input(true);
  /** Filter-row operator override (default: contains for text, eq for number/date). */
  readonly filterOperator = input<FilterOperator>();
  /** Track minimum in px for flexible-width columns. */
  readonly minWidth = input<number>();
  /** Pins the column to an edge (requires a numeric `width`). */
  readonly pinned = input<false | 'left' | 'right'>(false);
  /** Aggregate shown on group rows for this column's field. */
  readonly groupSummary = input<SummaryType>();
  /** Aggregate shown in the grid's total row for this column's field. */
  readonly totalSummary = input<SummaryType>();
  /** Whether cells of this column can be edited. */
  readonly editable = input(true);
  /** Marks the field as required in editors. */
  readonly required = input(false);
  /** Extra Angular validators applied to the editor control. */
  readonly validators = input<readonly ValidatorFn[]>();

  readonly cellTemplate = contentChild(OgeCellTemplate<T>);
  readonly headerTemplate = contentChild(OgeHeaderTemplate<T>);
  readonly editTemplate = contentChild(OgeEditTemplate<T>);
}
