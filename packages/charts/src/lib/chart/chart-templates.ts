import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  OgeChartPointEvent,
  OgeChartRenderLabel,
} from '@oge-ui/charts-engine';

export interface OgeChartLabelTemplateContext {
  /**
   * The data label (`let label`): its `text`, `value`, `argument`,
   * `seriesName`, `seriesIndex`, `pointIndex` and placement.
   */
  $implicit: OgeChartRenderLabel;
}

/**
 * Structural directive replacing every data label's content — rendered in
 * a 120 × 22 px `foreignObject` at the label's position, so any compact
 * HTML works (a badge, an icon plus the value). Works on `oge-chart`,
 * `oge-pie-chart` and `oge-polar-chart`:
 *
 * ```html
 * <oge-chart [dataSource]="data" [series]="series">
 *   <span *ogeChartLabelTemplate="let label" class="badge">{{ label.text }}</span>
 * </oge-chart>
 * ```
 */
@Directive({ selector: '[ogeChartLabelTemplate]' })
export class OgeChartLabelTemplate {
  readonly templateRef = inject(TemplateRef<OgeChartLabelTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeChartLabelTemplate,
    _ctx: unknown,
  ): _ctx is OgeChartLabelTemplateContext {
    return true;
  }
}

export interface OgeChartTooltipTemplateContext<T = unknown> {
  /** The hovered point(s) — one entry per series in shared mode. */
  $implicit: readonly OgeChartPointEvent<T>[];
}

/**
 * Structural directive replacing the tooltip's content:
 *
 * ```html
 * <oge-chart [dataSource]="data" [series]="series">
 *   <div *ogeChartTooltipTemplate="let points">{{ points[0].seriesName }}</div>
 * </oge-chart>
 * ```
 */
@Directive({ selector: '[ogeChartTooltipTemplate]' })
export class OgeChartTooltipTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeChartTooltipTemplateContext<T>>);

  static ngTemplateContextGuard<T>(
    _dir: OgeChartTooltipTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeChartTooltipTemplateContext<T> {
    return true;
  }
}

export interface OgeChartAnnotationTemplateContext {
  /** The annotation payload (`let note`). */
  $implicit: { text: string };
}

/**
 * Structural directive replacing an annotation's label content (rendered
 * in a `foreignObject`, so any HTML works).
 */
@Directive({ selector: '[ogeChartAnnotationTemplate]' })
export class OgeChartAnnotationTemplate {
  readonly templateRef = inject(TemplateRef<OgeChartAnnotationTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeChartAnnotationTemplate,
    _ctx: unknown,
  ): _ctx is OgeChartAnnotationTemplateContext {
    return true;
  }
}

export interface OgeChartLegendTemplateContext {
  /**
   * The legend entry (`let item`); `swatch` is the marker's CSS background
   * (a striped swatch when the points carry their own colours).
   */
  $implicit: { name: string; color: string; hidden: boolean; swatch?: string };
}

/** Structural directive replacing a legend item's content. */
@Directive({ selector: '[ogeChartLegendTemplate]' })
export class OgeChartLegendTemplate {
  readonly templateRef = inject(TemplateRef<OgeChartLegendTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeChartLegendTemplate,
    _ctx: unknown,
  ): _ctx is OgeChartLegendTemplateContext {
    return true;
  }
}
