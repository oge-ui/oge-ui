import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeChartPointEvent } from '../charts-types';

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
  /** The legend entry (`let item`). */
  $implicit: { name: string; color: string; hidden: boolean };
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
