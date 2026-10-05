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
  type OgeRect,
} from '@oge-ui/overlay';
import {
  agendaTimeText,
  morePopupKey,
  schedulerMorePopupTitle,
  type OgeSchedulerResolvedMessages,
  type SchedulerAppointment,
} from '@oge-ui/scheduler-engine';

/**
 * Internal "+N more" popup of the month view: an `OgeAnchoredPanel` on the
 * pressed button listing every appointment of the day (`role="dialog"`
 * named by the date, a list of buttons). Focus moves to the first entry;
 * Up / Down / Home / End move between entries, Enter opens one (the
 * appointment popup), Escape closes and returns focus to the button.
 */
@Component({
  selector: 'oge-scheduler-more-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgePopup],
  template: `
    @if (panel.isOpen() && day(); as date) {
      <oge-popup [panel]="panel">
        <div
          class="oge-scheduler-popup oge-scheduler-more-popup"
          #panelEl
          role="dialog"
          aria-modal="false"
          [attr.aria-label]="title().label"
        >
          <div class="oge-scheduler-popup-header">
            <span class="oge-scheduler-popup-title">{{ title().heading }}</span>
            <button
              type="button"
              class="oge-scheduler-btn oge-scheduler-btn-icon"
              [attr.aria-label]="messages().closeLabel"
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
          <ul class="oge-scheduler-more-list">
            @for (appt of appointments(); track appt.key; let index = $index) {
              <li>
                <button
                  type="button"
                  class="oge-scheduler-more-item"
                  [attr.data-more-index]="index"
                  (click)="pick(appt, $event)"
                  (keydown)="onItemKeydown(index, $event)"
                >
                  <span
                    class="oge-scheduler-agenda-dot"
                    [style.background-color]="appt.color ?? null"
                    aria-hidden="true"
                  ></span>
                  <span class="oge-scheduler-agenda-time">{{
                    timeText(appt, date)
                  }}</span>
                  <span class="oge-scheduler-agenda-text">{{ appt.text }}</span>
                </button>
              </li>
            }
          </ul>
          <div class="oge-scheduler-popup-actions">
            <button
              type="button"
              class="oge-scheduler-btn"
              (click)="goToDay(date)"
            >
              {{ messages().goToDay }}
            </button>
          </div>
        </div>
      </oge-popup>
    }
  `,
})
export class OgeSchedulerMorePopup<T = unknown> {
  readonly messages = input.required<OgeSchedulerResolvedMessages['grid']>();
  readonly locale = input<string | undefined>(undefined);
  readonly appointments = input<readonly SchedulerAppointment<T>[]>([]);
  readonly day = input<Date | null>(null);

  /** An entry was picked: the shell opens the appointment popup. */
  readonly appointmentPicked = output<{
    appointment: SchedulerAppointment<T>;
    rect: DOMRect;
    event: MouseEvent;
  }>();
  /** "Go to day" — the shell drills into the day view. */
  readonly dayRequested = output<Date>();
  readonly closed = output<void>();

  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panelEl');
  private readonly anchorRect = signal<OgeRect | null>(null);
  private anchor: HTMLElement | null = null;

  readonly panel = new OgeAnchoredPanel({
    anchor: () => null,
    anchorRect: () => this.anchorRect(),
    panel: () => this.panelEl()?.nativeElement ?? null,
    placement: () => 'bottom-start',
    onClosed: (reason) => {
      this.closed.emit();
      if (reason === 'escape') this.anchor?.focus();
    },
  });

  protected readonly title = computed(() => {
    const day = this.day();
    return day === null
      ? { label: '', heading: '' }
      : schedulerMorePopupTitle(this.messages(), day, this.locale());
  });

  /** Opens the list anchored to the "+N more" button; focuses the first entry. */
  open(anchor: HTMLElement): void {
    this.anchor = anchor;
    const rect = anchor.getBoundingClientRect();
    this.anchorRect.set({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    this.panel.open();
    setTimeout(() => this.focusItem(0));
  }

  /** Closes the list (no-op while closed). */
  close(): void {
    this.panel.close();
  }

  private focusItem(index: number): void {
    this.panelEl()
      ?.nativeElement.querySelector<HTMLElement>(
        `[data-more-index="${index}"]`,
      )
      ?.focus();
  }

  protected onItemKeydown(index: number, event: KeyboardEvent): void {
    const next = morePopupKey(event.key, index, this.appointments().length);
    if (next === null) return;
    event.preventDefault();
    this.focusItem(next);
  }

  protected timeText(appointment: SchedulerAppointment<T>, day: Date): string {
    return agendaTimeText(
      appointment,
      day,
      this.locale(),
      this.messages().allDayLabel,
    );
  }

  protected pick(appointment: SchedulerAppointment<T>, event: MouseEvent): void {
    const rect =
      this.anchor?.getBoundingClientRect() ??
      (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.panel.close();
    this.appointmentPicked.emit({ appointment, rect, event });
  }

  protected goToDay(day: Date): void {
    this.panel.close();
    this.dayRequested.emit(day);
  }
}
