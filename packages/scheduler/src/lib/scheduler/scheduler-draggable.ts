import {
  DestroyRef,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  armedOgeSchedulerPayload,
  beginOgeSchedulerExternalDrag,
  fillSchedulerMessages,
  ogeSchedulerDraggableKey,
  onArmedOgeSchedulerPayload,
  type OgeSchedulerDragPayload,
} from '@oge-ui/scheduler-engine';
import { prepareTouchDrag } from '@oge-ui/behavior';
import { OGE_SCHEDULER_CONFIG } from '../config';

/**
 * Makes any element a source of appointments for every mounted
 * `<oge-scheduler>`: drag it onto a slot (the shared pointer gesture, a
 * ghost preview, touch long press, Escape cancels) and the scheduler builds
 * an appointment from `ogeSchedulerDraggable` through its insert pipeline
 * and emits `appointmentDropped`. The keyboard / single-pointer twin:
 * Enter, Space or a click picks the item up (announced), and Enter or a
 * click on a scheduler cell places it — Escape puts it down.
 *
 * ```html
 * <li [ogeSchedulerDraggable]="task" [ogeSchedulerDraggableDuration]="90">
 *   {{ task.text }}
 * </li>
 * ```
 */
@Directive({
  selector: '[ogeSchedulerDraggable]',
  host: {
    class: 'oge-scheduler-draggable',
    role: 'button',
    tabindex: '0',
    '[attr.aria-pressed]': 'armed()',
    '[class.oge-scheduler-draggable-armed]': 'armed()',
    '(pointerdown)': 'onPointerDown($event)',
    '(keydown)': 'onKeydown($event)',
    '(click)': 'onClick($event)',
  },
})
export class OgeSchedulerDraggable {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly config = inject(OGE_SCHEDULER_CONFIG);

  /** The item the drop turns into an appointment (fields mapped by the target's `*Expr`s). */
  readonly ogeSchedulerDraggable = input.required<unknown>();
  /** Appointment length in minutes; omitted = the target's cell duration. */
  readonly ogeSchedulerDraggableDuration = input<number | undefined>(undefined);
  /** The label announced on pick-up (defaults to the element's text). */
  readonly ogeSchedulerDraggableText = input<string | undefined>(undefined);

  private readonly armedPayload = signal<OgeSchedulerDragPayload | null>(
    armedOgeSchedulerPayload(),
  );
  /** Whether this item is picked up for the keyboard twin. */
  protected readonly armed = computed(
    () => this.armedPayload()?.data === this.ogeSchedulerDraggable(),
  );
  private dragged = false;

  constructor() {
    const stop = onArmedOgeSchedulerPayload((payload) =>
      this.armedPayload.set(payload),
    );
    // the one non-passive touchmove guard (idempotent, SSR-safe)
    prepareTouchDrag();
    inject(DestroyRef).onDestroy(stop);
  }

  private payload(): OgeSchedulerDragPayload {
    return {
      data: this.ogeSchedulerDraggable(),
      durationMinutes: this.ogeSchedulerDraggableDuration(),
      text:
        this.ogeSchedulerDraggableText() ??
        this.host.nativeElement.textContent?.trim() ??
        '',
    };
  }

  private announcement(): string {
    const text = this.payload().text ?? '';
    return fillSchedulerMessages(
      this.config.messages,
    ).announcements.pickedUp.replace('{text}', text);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.dragged = false;
    beginOgeSchedulerExternalDrag(event, {
      source: this.host.nativeElement,
      payload: this.payload(),
      onStart: () => (this.dragged = true),
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      ogeSchedulerDraggableKey(event.key, this.payload(), this.announcement())
    ) {
      event.preventDefault();
    }
  }

  protected onClick(event: MouseEvent): void {
    // a drag swallows its click; a plain click is the single-pointer pick-up
    if (this.dragged || event.detail === 0) return;
    ogeSchedulerDraggableKey('Enter', this.payload(), this.announcement());
  }
}
