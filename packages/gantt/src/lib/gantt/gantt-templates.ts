import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeGanttTask } from '../gantt-types';

export interface OgeGanttTaskTemplateContext<T = unknown> {
  /** The normalized task (`let task`). */
  $implicit: OgeGanttTask<T>;
}

/**
 * Structural directive replacing the bar's inner title content:
 *
 * ```html
 * <oge-gantt [tasks]="tasks">
 *   <span *ogeGanttTaskTemplate="let task">{{ task.title }} 🚀</span>
 * </oge-gantt>
 * ```
 */
@Directive({ selector: '[ogeGanttTaskTemplate]' })
export class OgeGanttTaskTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeGanttTaskTemplateContext<T>>);

  static ngTemplateContextGuard<T>(
    _dir: OgeGanttTaskTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeGanttTaskTemplateContext<T> {
    return true;
  }
}
