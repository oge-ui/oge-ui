import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgeAnchoredPanel,
  OgePopup,
  type OgePopupCloseReason,
  type OgeRect,
} from '@oge-ui/overlay';
import type { SchedulerAppointment } from '../engine/scheduler-model';
import type { OgeSchedulerPopupMessages } from '../config';

/**
 * Internal appointment popup: an `OgeAnchoredPanel` opened on a virtual
 * anchor rect (the clicked chip), showing the appointment summary with
 * Edit / Delete / Close actions. Escape and outside clicks close through
 * the shared overlay stack.
 */
@Component({
  selector: 'oge-scheduler-appointment-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgePopup],
  template: `
    @if (panel.isOpen()) {
      <oge-popup [panel]="panel">
        <div class="oge-scheduler-popup" #panelEl role="dialog" aria-modal="false"
          [attr.aria-label]="appointment()?.text">
          @if (appointment(); as appt) {
            <div class="oge-scheduler-popup-header">
              <span
                class="oge-scheduler-popup-swatch"
                [style.background-color]="appt.color ?? null"
                aria-hidden="true"
              ></span>
              <span class="oge-scheduler-popup-title">{{ appt.text }}</span>
              <button
                type="button"
                class="oge-scheduler-btn oge-scheduler-btn-icon"
                [attr.aria-label]="messages().close"
                (click)="panel.close()"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m4 4 8 8m0-8-8 8" />
                </svg>
              </button>
            </div>
            <div class="oge-scheduler-popup-time">{{ timeText() }}</div>
            @if (appt.description) {
              <div class="oge-scheduler-popup-desc">{{ appt.description }}</div>
            }
            <div class="oge-scheduler-popup-actions">
              @if (allowEditing()) {
                <button
                  type="button"
                  class="oge-scheduler-btn"
                  (click)="onEdit()"
                >
                  {{ messages().edit }}
                </button>
              }
              @if (allowDeleting()) {
                <button
                  type="button"
                  class="oge-scheduler-btn oge-scheduler-btn-danger"
                  (click)="onDelete()"
                >
                  {{ messages().deleteAppointment }}
                </button>
              }
            </div>
          }
        </div>
      </oge-popup>
    }
  `,
})
export class OgeSchedulerAppointmentPopup<T = unknown> {
  readonly messages = input.required<OgeSchedulerPopupMessages>();
  readonly locale = input<string | undefined>(undefined);
  readonly allowEditing = input(true);
  readonly allowDeleting = input(true);

  readonly editRequested = output<SchedulerAppointment<T>>();
  readonly deleteRequested = output<SchedulerAppointment<T>>();
  readonly closed = output<OgePopupCloseReason>();

  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panelEl');
  private readonly anchorRect = signal<OgeRect | null>(null);
  /** The appointment shown; `null` while closed. */
  readonly appointment = signal<SchedulerAppointment<T> | null>(null);

  readonly panel = new OgeAnchoredPanel({
    anchor: () => null,
    anchorRect: () => this.anchorRect(),
    panel: () => this.panelEl()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    onClosed: (reason) => {
      this.appointment.set(null);
      this.closed.emit(reason);
    },
  });

  protected readonly timeText = computed(() => {
    const appointment = this.appointment();
    if (appointment === null) return '';
    const format = new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
      timeStyle: appointment.allDay ? undefined : 'short',
    });
    return `${format.format(appointment.startDate)} – ${format.format(appointment.endDate)}`;
  });

  /** Opens the popup for `appointment`, anchored to the chip's screen rect. */
  open(appointment: SchedulerAppointment<T>, rect: DOMRect): void {
    this.appointment.set(appointment);
    this.anchorRect.set({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    this.panel.open();
  }

  /** Closes the popup (no-op while closed). */
  close(): void {
    this.panel.close();
  }

  protected onEdit(): void {
    const appointment = this.appointment();
    if (appointment === null) return;
    this.panel.close();
    this.editRequested.emit(appointment);
  }

  protected onDelete(): void {
    const appointment = this.appointment();
    if (appointment === null) return;
    this.panel.close();
    this.deleteRequested.emit(appointment);
  }
}
