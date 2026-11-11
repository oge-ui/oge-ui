import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { OgeSimpleTableResolvedColumn } from '@oge-ui/behavior';

/** Context of `[ogeSimpleTableRow]`. */
export interface OgeSimpleTableRowContext<TRow = unknown> {
  /** The row (also the implicit `let-row`). */
  $implicit: TRow;
  /** The resolved columns — put `columns[i].cellClass` on a `<td>` to align it with its header. */
  columns: readonly OgeSimpleTableResolvedColumn[];
  /** Index of the row in `value` (not in the page). */
  rowIndex: number;
}

/**
 * The markup of each row — a whole `<tr>` with free `<td>`s. Bind
 * `[ogeSimpleTableRowOf]` to the same array as `value` and `let-row` is typed
 * as its element under `strictTemplates`:
 *
 * ```html
 * <oge-simple-table [value]="orders" [columns]="columns">
 *   <ng-template ogeSimpleTableRow [ogeSimpleTableRowOf]="orders" let-order let-columns="columns">
 *     <tr>
 *       <td>{{ order.no }}</td>
 *       <td [class]="columns[1].cellClass">{{ order.total | number }}</td>
 *     </tr>
 *   </ng-template>
 * </oge-simple-table>
 * ```
 */
@Directive({ selector: '[ogeSimpleTableRow]' })
// `any` default: without `[ogeSimpleTableRowOf]` the row type cannot be
// inferred, and `unknown` would make every `let-row` field access a template
// error under strictTemplates.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class OgeSimpleTableRow<TRow = any> {
  /** The rows the template renders — only read for its type. */
  readonly ogeSimpleTableRowOf = input<readonly TRow[] | undefined>(undefined);
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeSimpleTableRowContext<TRow>>>(TemplateRef);

  static ngTemplateContextGuard<TRow>(
    _dir: OgeSimpleTableRow<TRow>,
    _ctx: unknown,
  ): _ctx is OgeSimpleTableRowContext<TRow> {
    return true;
  }
}

/** Context of `[ogeSimpleTableHeader]` and `[ogeSimpleTableFooter]`. */
export interface OgeSimpleTableSectionContext<TRow = unknown> {
  /** The resolved columns (also the implicit `let-columns`). */
  $implicit: readonly OgeSimpleTableResolvedColumn[];
  /** Every row of `value` — for totals in a footer. */
  rows: readonly TRow[];
}

/**
 * Replaces the header row(s) inside `<thead>` — grouped headers, `rowspan`,
 * `colspan`. Use `scope="col"` on each `<th>`.
 */
@Directive({ selector: '[ogeSimpleTableHeader]' })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class OgeSimpleTableHeader<TRow = any> {
  /** The rows of the table — only read for its type. */
  readonly ogeSimpleTableHeaderOf = input<readonly TRow[] | undefined>(
    undefined,
  );
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeSimpleTableSectionContext<TRow>>>(TemplateRef);

  static ngTemplateContextGuard<TRow>(
    _dir: OgeSimpleTableHeader<TRow>,
    _ctx: unknown,
  ): _ctx is OgeSimpleTableSectionContext<TRow> {
    return true;
  }
}

/** Rows of a `<tfoot>` — totals, notes. */
@Directive({ selector: '[ogeSimpleTableFooter]' })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class OgeSimpleTableFooter<TRow = any> {
  /** The rows of the table — only read for its type. */
  readonly ogeSimpleTableFooterOf = input<readonly TRow[] | undefined>(
    undefined,
  );
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeSimpleTableSectionContext<TRow>>>(TemplateRef);

  static ngTemplateContextGuard<TRow>(
    _dir: OgeSimpleTableFooter<TRow>,
    _ctx: unknown,
  ): _ctx is OgeSimpleTableSectionContext<TRow> {
    return true;
  }
}

/** Content of the full-width cell shown when `value` is empty. */
@Directive({ selector: '[ogeSimpleTableEmpty]' })
export class OgeSimpleTableEmpty {
  /** The projected template. */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}
