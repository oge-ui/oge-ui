import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { contrastForeground, parseColor } from '@oge-ui/core';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import type { OgeSchedulerView } from '../scheduler-types';
import type { OgeAppointmentTemplate } from './scheduler-templates';

/**
 * Internal presentational chip: renders one appointment (or one segment of
 * it) with its color, text and time line; interaction semantics live on the
 * positioned wrapper in the owning view, not here.
 */
@Component({
  selector: 'oge-scheduler-appointment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-scheduler-chip',
    '[class.oge-scheduler-chip-allday]': 'compact()',
    '[class.oge-scheduler-chip-disabled]': 'appointment().disabled',
    '[style.background-color]': 'background()',
    '[style.color]': 'foreground()',
  },
  template: `
    @if (template(); as tpl) {
      <ng-container
        [ngTemplateOutlet]="tpl.templateRef"
        [ngTemplateOutletContext]="{ $implicit: appointment(), view: view() }"
      />
    } @else {
      <span class="oge-scheduler-chip-text">{{ appointment().text }}</span>
      @if (!compact()) {
        <span class="oge-scheduler-chip-time">{{ timeText() }}</span>
        @if (appointment().location; as location) {
          <span class="oge-scheduler-chip-location">{{ location }}</span>
        }
      }
    }
  `,
})
export class OgeSchedulerAppointmentChip<T = unknown> {
  readonly appointment = input.required<SchedulerAppointment<T>>();
  readonly view = input.required<OgeSchedulerView>();
  /** Single-line rendering (all-day strip, month lanes). */
  readonly compact = input(false);
  readonly locale = input<string | undefined>(undefined);
  readonly template = input<OgeAppointmentTemplate<T> | null>(null);

  protected readonly background = computed(
    () => this.appointment().color ?? null,
  );

  protected readonly foreground = computed(() => {
    const color = this.appointment().color;
    if (color === undefined) return null;
    const parsed = parseColor(color);
    return parsed === null ? null : contrastForeground(parsed);
  });

  protected readonly timeText = computed(() => {
    const appointment = this.appointment();
    const format = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${format.format(appointment.startDate)} – ${format.format(appointment.endDate)}`;
  });
}
