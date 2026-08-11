import { Directive, TemplateRef, inject } from '@angular/core';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import type { OgeSchedulerView } from '../scheduler-types';

export interface OgeAppointmentTemplateContext<T = unknown> {
  /** The normalized appointment (`let appointment`). */
  $implicit: SchedulerAppointment<T>;
  /** The view rendering the chip (`view as v`). */
  view: OgeSchedulerView;
}

/**
 * Structural directive replacing the default chip content:
 *
 * ```html
 * <oge-scheduler [dataSource]="data">
 *   <div *ogeAppointmentTemplate="let appointment">{{ appointment.text }} 🎉</div>
 * </oge-scheduler>
 * ```
 */
@Directive({ selector: '[ogeAppointmentTemplate]' })
export class OgeAppointmentTemplate<T = unknown> {
  readonly templateRef = inject(
    TemplateRef<OgeAppointmentTemplateContext<T>>,
  );

  static ngTemplateContextGuard<T>(
    _dir: OgeAppointmentTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeAppointmentTemplateContext<T> {
    return true;
  }
}

export interface OgeSchedulerCellTemplateContext {
  /** The cell's start date/time (`let date`). */
  $implicit: Date;
  view: OgeSchedulerView;
  /** True in the all-day strip and in month cells. */
  allDay: boolean;
}

/**
 * Structural directive rendered inside every empty grid cell — an **OGE
 * extra** (references only template appointment chips):
 *
 * ```html
 * <oge-scheduler><ng-template ogeCellTemplate let-date>…</ng-template></oge-scheduler>
 * ```
 */
@Directive({ selector: '[ogeCellTemplate]' })
export class OgeSchedulerCellTemplate {
  readonly templateRef = inject(TemplateRef<OgeSchedulerCellTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeSchedulerCellTemplate,
    _ctx: unknown,
  ): _ctx is OgeSchedulerCellTemplateContext {
    return true;
  }
}

export interface OgeDateHeaderTemplateContext {
  /** The column's date (`let date`). */
  $implicit: Date;
  view: OgeSchedulerView;
}

/**
 * Structural directive replacing the day/week date headers — an **OGE
 * extra**:
 *
 * ```html
 * <oge-scheduler><ng-template ogeDateHeaderTemplate let-date>…</ng-template></oge-scheduler>
 * ```
 */
@Directive({ selector: '[ogeDateHeaderTemplate]' })
export class OgeDateHeaderTemplate {
  readonly templateRef = inject(TemplateRef<OgeDateHeaderTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeDateHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeDateHeaderTemplateContext {
    return true;
  }
}
