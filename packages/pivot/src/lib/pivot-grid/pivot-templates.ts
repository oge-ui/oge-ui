import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  OgePivotAxisLine,
  OgePivotCellTemplateContext,
  OgePivotHeaderCell,
} from '@oge-ui/pivot-engine';

/** Context of `*ogePivotCellTemplate`: the prepared cell (`let cell`). */
export interface OgePivotCellTemplateOutletContext {
  $implicit: OgePivotCellTemplateContext;
}

/** Context of `*ogePivotRowHeaderTemplate` (`let line; rowIndex as r`). */
export interface OgePivotRowHeaderTemplateContext {
  $implicit: OgePivotAxisLine;
  rowIndex: number;
  /** Per-field labels of the outline / tabular layouts; `null` when compact. */
  segments: readonly string[] | null;
}

/** Context of `*ogePivotColumnHeaderTemplate` (`let cell`). */
export interface OgePivotColumnHeaderTemplateContext {
  $implicit: OgePivotHeaderCell;
}

/**
 * Custom content of every value cell — one per measure, in place of the
 * formatted text; `cell.text` still carries it (formats, display modes,
 * `customizeCell` applied):
 *
 * ```html
 * <oge-pivot-grid [data]="sales">
 *   <span *ogePivotCellTemplate="let cell" [class.neg]="cell.value < 0">{{ cell.text }}</span>
 * </oge-pivot-grid>
 * ```
 */
@Directive({ selector: '[ogePivotCellTemplate]' })
export class OgePivotCellTemplate {
  readonly templateRef = inject(TemplateRef<OgePivotCellTemplateOutletContext>);

  static ngTemplateContextGuard(
    _dir: OgePivotCellTemplate,
    _ctx: unknown,
  ): _ctx is OgePivotCellTemplateOutletContext {
    return true;
  }
}

/**
 * Custom row-header content (the label part — the expander arrow and the
 * keyboard behaviour stay the grid's):
 *
 * ```html
 * <strong *ogePivotRowHeaderTemplate="let line">{{ line.text }}</strong>
 * ```
 */
@Directive({ selector: '[ogePivotRowHeaderTemplate]' })
export class OgePivotRowHeaderTemplate {
  readonly templateRef = inject(TemplateRef<OgePivotRowHeaderTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgePivotRowHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgePivotRowHeaderTemplateContext {
    return true;
  }
}

/**
 * Custom column-header content:
 *
 * ```html
 * <em *ogePivotColumnHeaderTemplate="let cell">{{ cell.text }}</em>
 * ```
 */
@Directive({ selector: '[ogePivotColumnHeaderTemplate]' })
export class OgePivotColumnHeaderTemplate {
  readonly templateRef = inject(
    TemplateRef<OgePivotColumnHeaderTemplateContext>,
  );

  static ngTemplateContextGuard(
    _dir: OgePivotColumnHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgePivotColumnHeaderTemplateContext {
    return true;
  }
}
