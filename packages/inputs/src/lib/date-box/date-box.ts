import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { sameDay, startOfDay, toLocalDate } from '@oge-ui/core';
import {
  OGE_OVERLAY_CONFIG,
  OgePopup,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeCalendar } from '../calendar/calendar';
import { isDayDisabled } from '../calendar/calendar-engine';
import type {
  OgeCalendarCellTemplateContext,
  OgeCalendarDisabledDates,
  OgeCalendarZoomLevel,
} from '../calendar/calendar-types';
import { OgeFieldChrome } from '../field/field-chrome';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '../field/input-host';
import { OgeInputBase } from '../field/input-base';
import { SelectPanelController } from '../select-list/select-panel-controller';
import type {
  OgeDateBoxApplyValueMode,
  OgeDateBoxDisplayFormat,
  OgeDateBoxTimeView,
  OgeDateBoxType,
} from './date-box-types';
import { parseDateText } from './date-parse';

interface TimeSlot {
  minutes: number;
  text: string;
}

/**
 * Date/time editor on the shared oge field chrome: typed text parses
 * locale-aware through `Intl` (never `Date.parse`), the picker is an embedded
 * `<oge-calendar>` (and/or an interval time list), and the value is always a
 * local `Date | null` — serialization is the app's concern:
 *
 * ```html
 * <oge-date-box label="Start" [(value)]="start" />
 * <oge-date-box label="Meeting" type="datetime" [interval]="15" [(value)]="at" />
 * <oge-date-box label="Alarm" type="time" [(value)]="alarm" />
 * ```
 *
 * The popup follows the APG date-picker-dialog pattern: DOM focus moves INTO
 * the calendar grid on open and Escape restores it to the input. Unparseable
 * or out-of-range text shows the invalid state while typing and reverts to
 * the committed value on blur — a wrong date is never committed. Works
 * standalone via `[(value)]`, with Signal Forms via `[formField]`, and with
 * reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-date-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome, OgePopup, OgeCalendar],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeDateBox }],
  host: {
    class: 'oge-input oge-date-box',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <input
        #native
        class="oge-input-native"
        type="text"
        role="combobox"
        aria-haspopup="dialog"
        aria-autocomplete="none"
        autocomplete="off"
        [id]="inputId"
        [value]="inputText()"
        [placeholder]="placeholderText()"
        [disabled]="effectiveDisabled()"
        [readOnly]="readonly() || !acceptCustomValue()"
        [attr.name]="name() || null"
        [attr.title]="tooltip() ?? null"
        [attr.tabindex]="tabIndex()"
        [attr.aria-expanded]="opened()"
        [attr.aria-controls]="opened() ? panel.panelId : null"
        [attr.aria-label]="labelMode() === 'hidden' && label() ? label() : null"
        [attr.aria-labelledby]="
          labelMode() !== 'hidden' && label() ? labelId : null
        "
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        (input)="onNativeInput($event)"
        (click)="onFieldClick()"
        (keydown)="onKeydown($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup [panel]="panel">
        <div
          class="oge-date-box-panel"
          role="dialog"
          [attr.aria-label]="label() || msg().calendarLabel"
        >
          <div class="oge-date-box-pickers">
            @if (type() !== 'time') {
              <oge-calendar
                class="oge-date-box-calendar"
                [value]="draft()"
                [min]="min()"
                [max]="max()"
                [disabledDates]="disabledDates()"
                [firstDayOfWeek]="firstDayOfWeek()"
                [showWeekNumbers]="showWeekNumbers()"
                [locale]="locale()"
                [zoomLevel]="zoomLevel()"
                [cellTemplate]="calendarCellTemplate()"
                (valueCommitted)="onCalendarPick($event.value, $event.event)"
              />
            }
            @if (type() !== 'date') {
              @if (timeView() === 'columns') {
                <div #timeList class="oge-date-box-columns">
                  <div
                    class="oge-date-box-col"
                    role="listbox"
                    [attr.aria-label]="msg().calendarLabel"
                  >
                    @for (slot of hourSlots(); track slot.hour) {
                      <button
                        type="button"
                        role="option"
                        class="oge-date-box-time"
                        [class.oge-date-box-time-selected]="
                          isHourSelected(slot.hour)
                        "
                        [attr.aria-selected]="isHourSelected(slot.hour)"
                        (click)="pickHour(slot.hour, $event)"
                      >
                        {{ slot.text }}
                      </button>
                    }
                  </div>
                  <div
                    class="oge-date-box-col"
                    role="listbox"
                    [attr.aria-label]="msg().calendarLabel"
                  >
                    @for (slot of minuteSlots(); track slot.minute) {
                      <button
                        type="button"
                        role="option"
                        class="oge-date-box-time"
                        [class.oge-date-box-time-selected]="
                          isMinuteSelected(slot.minute)
                        "
                        [attr.aria-selected]="isMinuteSelected(slot.minute)"
                        (click)="pickMinute(slot.minute, $event)"
                      >
                        {{ slot.text }}
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <div
                  #timeList
                  class="oge-date-box-times"
                  role="listbox"
                  [attr.aria-label]="msg().calendarLabel"
                >
                  @for (slot of timeSlots(); track slot.minutes) {
                    <button
                      type="button"
                      role="option"
                      class="oge-date-box-time"
                      [class.oge-date-box-time-selected]="isTimeSelected(slot)"
                      [attr.aria-selected]="isTimeSelected(slot)"
                      (click)="pickTime(slot, $event)"
                    >
                      {{ slot.text }}
                    </button>
                  }
                </div>
              }
            }
          </div>
          @if (applyValueMode() === 'useButtons') {
            <div class="oge-date-box-actions">
              <button
                type="button"
                class="oge-date-box-action oge-date-box-ok"
                (click)="applyDraft($event)"
              >
                {{ msg().okButton }}
              </button>
              <button
                type="button"
                class="oge-date-box-action"
                (click)="close()"
              >
                {{ msg().cancelButton }}
              </button>
            </div>
          }
        </div>
      </oge-popup>
    }
  `,
  styleUrl: './date-box.scss',
})
export class OgeDateBox
  extends OgeInputBase<Date | null>
  implements FormValueControl<Date | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** The committed date (always a local `Date`; time-of-day matters for `time`/`datetime`). */
  readonly value = model<Date | null>(null);
  readonly type = input<OgeDateBoxType>('date');
  /** Display text — `Intl.DateTimeFormatOptions` or a formatter; `undefined` = per-type default. */
  readonly displayFormat = input<OgeDateBoxDisplayFormat | undefined>(
    undefined,
  );
  /** First selectable day; typing an earlier date marks the field invalid (never clamps). */
  readonly min = input<Date | undefined>(undefined);
  /** Last selectable day; typing a later date marks the field invalid (never clamps). */
  readonly max = input<Date | undefined>(undefined);
  /** Individual unselectable days: an array or a predicate. */
  readonly disabledDates = input<OgeCalendarDisabledDates | undefined>(
    undefined,
  );
  /** Time list step in minutes (`time`/`datetime`). */
  readonly interval = input(30);
  /** Time picker layout: one interval list (default) or hour + minute columns. */
  readonly timeView = input<OgeDateBoxTimeView>('list');
  /** Picker commit policy: on pick (default) or via the OK/Cancel footer. */
  readonly applyValueMode = input<OgeDateBoxApplyValueMode>('instantly');
  /** Clicking the field opens the picker. */
  readonly openOnFieldClick = input(true);
  /** `false` makes the text read-only — picker input only. */
  readonly acceptCustomValue = input(true);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** `0`–`6` (Sunday-first); `undefined` resolves from the locale. */
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  /** Week-number column of the embedded calendar. */
  readonly showWeekNumbers = input<
    boolean | { rule: 'firstDay' | 'firstFourDays' | 'fullWeek' }
  >(false);
  /** Initial drill level of the embedded calendar. */
  readonly zoomLevel = input<OgeCalendarZoomLevel>('month');
  /** Custom calendar cell rendering. */
  readonly calendarCellTemplate = input<
    TemplateRef<OgeCalendarCellTemplateContext> | undefined
  >(undefined);
  /** BCP 47 locale for display and parsing; `undefined` = the runtime default. */
  readonly locale = input<string | undefined>(undefined);
  /** Instance locale, falling back to the DI config, then the browser. */
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );
  /** Picker visibility — two-way. */
  readonly opened = model(false);

  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();

  private readonly native = viewChild<ElementRef<HTMLInputElement>>('native');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly timeListRef = viewChild<ElementRef<HTMLElement>>('timeList');

  private readonly panelController = new SelectPanelController({
    anchor: () =>
      this.chromeRef()?.nativeElement.querySelector('.oge-input-container') ??
      this.hostEl.nativeElement,
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () => this.dropdownPlacement(),
    width: () => undefined as unknown as number | 'anchor',
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    opened: this.opened,
    blocked: () => this.effectiveDisabled() || this.readonly(),
    restoreFocus: () => this.focus(),
    onOpened: () => {
      this.draft.set(this.value());
      // APG date-picker-dialog: DOM focus moves INTO the picker
      setTimeout(() => {
        const popup = this.popupRef()?.nativeElement as HTMLElement | undefined;
        const target =
          popup?.querySelector<HTMLElement>('[data-focus-target]') ??
          popup?.querySelector<HTMLElement>('.oge-date-box-time-selected') ??
          popup?.querySelector<HTMLElement>('.oge-date-box-time');
        target?.focus();
        this.scrollTimeListToSelection();
      });
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.draft.set(null);
      this.dropDownClosed.emit();
    },
  });

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = this.panelController.panel;

  override readonly dropdown: OgeInputDropDownApi = (() => {
    const api = this.panelController.dropDownApi(
      () => !this.effectiveDisabled(),
      () => this.toggle(),
    );
    const self = this as OgeDateBox;
    return {
      visible: api.visible,
      expanded: api.expanded,
      toggle: api.toggle,
      get icon() {
        return self.type() === 'time'
          ? ('clock' as const)
          : ('calendar' as const);
      },
    };
  })();

  /** Uncommitted typed text; `null` = show the formatted value. */
  private readonly text = signal<string | null>(null);
  /** Popup draft (useButtons collects picks here before OK). */
  protected readonly draft = signal<Date | null>(null);

  private readonly formatter = computed(() => {
    const custom = this.displayFormat();
    if (typeof custom === 'function') return custom;
    const options: Intl.DateTimeFormatOptions =
      custom ??
      (this.type() === 'date'
        ? { dateStyle: 'short' }
        : this.type() === 'time'
          ? { timeStyle: 'short' }
          : { dateStyle: 'short', timeStyle: 'short' });
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), options);
    return (date: Date) => format.format(date);
  });

  protected readonly inputText = computed(() => {
    const typed = this.text();
    if (typed !== null) return typed;
    const value = this.value();
    return value === null ? '' : this.formatter()(value);
  });

  protected readonly timeSlots = computed<TimeSlot[]>(() => {
    const step = Math.max(1, this.interval());
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), {
      timeStyle: 'short',
    });
    const slots: TimeSlot[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      slots.push({
        minutes,
        text: format.format(
          new Date(2001, 0, 1, Math.floor(minutes / 60), minutes % 60),
        ),
      });
    }
    return slots;
  });

  constructor() {
    super();
    this.destroyRef.onDestroy(() => this.panelController.destroy());
  }

  // --- public API ------------------------------------------------------------

  open(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.opened.set(true);
  }

  close(): void {
    this.opened.set(false);
  }

  toggle(): void {
    if (this.opened()) this.close();
    else this.open();
  }

  // --- typing ----------------------------------------------------------------

  protected onNativeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    this.inputChange.emit({ text: raw, event });
    this.parseInvalid.set(raw.trim() !== '' && this.parseTyped(raw) === null);
  }

  private parseTyped(raw: string): Date | null {
    const parsed = parseDateText(
      raw,
      this.effectiveLocale(),
      this.type(),
      this.value() ?? new Date(),
    );
    if (parsed === null) return null;
    if (this.type() !== 'time' && this.dayBlocked(parsed)) return null;
    return parsed;
  }

  private dayBlocked(date: Date): boolean {
    return isDayDisabled(date, this.min(), this.max(), this.disabledDates());
  }

  /** Commits the typed text; unparseable/blocked text reverts to the value. */
  private commitTypedText(event?: Event): void {
    const raw = this.text();
    if (raw === null) return;
    this.text.set(null);
    this.parseInvalid.set(false);
    if (raw.trim() === '') {
      this.commitNow(null, event);
      return;
    }
    const parsed = this.parseTyped(raw);
    if (parsed !== null) this.commitNow(parsed, event);
    // parsed === null → revert: inputText falls back to the formatted value
  }

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!this.opened()) this.open();
        return;
      }
      case 'Enter': {
        this.commitTypedText(event);
        if (this.opened()) this.close();
        this.handleEnterKey(event);
        return;
      }
      case 'Escape': {
        // the panel's document listener closes the popup; second Escape
        // reverts uncommitted text
        if (!this.opened() && this.text() !== null) {
          event.preventDefault();
          this.text.set(null);
          this.parseInvalid.set(false);
        }
        return;
      }
    }
  }

  // --- picker ----------------------------------------------------------------

  protected onCalendarPick(picked: Date | null, event?: Event): void {
    if (picked === null) return;
    const merged = this.mergeDay(picked);
    if (this.applyValueMode() === 'useButtons') {
      this.draft.set(merged);
      return;
    }
    this.commitNow(merged, event);
    this.text.set(null);
    this.parseInvalid.set(false);
    if (this.type() === 'date') {
      this.close();
      this.focus();
    } else {
      this.draft.set(merged);
      this.scrollTimeListToSelection();
    }
  }

  protected pickTime(slot: TimeSlot, event: Event): void {
    const merged = this.mergeTime(slot.minutes);
    if (this.applyValueMode() === 'useButtons') {
      this.draft.set(merged);
      return;
    }
    this.commitNow(merged, event);
    this.text.set(null);
    this.parseInvalid.set(false);
    this.close();
    this.focus();
  }

  protected applyDraft(event: Event): void {
    const draft = this.draft();
    if (draft !== null) {
      this.commitNow(draft, event);
      this.text.set(null);
      this.parseInvalid.set(false);
    }
    this.close();
    this.focus();
  }

  /** Picked day + the time-of-day of the current draft/value. */
  private mergeDay(day: Date): Date {
    const time = this.draft() ?? this.value();
    return new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      this.type() === 'date' ? 0 : (time?.getHours() ?? 0),
      this.type() === 'date' ? 0 : (time?.getMinutes() ?? 0),
    );
  }

  /** Picked time-of-day + the day of the current draft/value (today for bare times). */
  private mergeTime(minutes: number): Date {
    const base = this.draft() ?? this.value() ?? startOfDay(new Date());
    return new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Math.floor(minutes / 60),
      minutes % 60,
    );
  }

  protected isTimeSelected(slot: TimeSlot): boolean {
    const current = this.draft() ?? this.value();
    if (!current) return false;
    return current.getHours() * 60 + current.getMinutes() === slot.minutes;
  }

  // --- hour/minute columns (`timeView: 'columns'`) ---------------------------

  protected readonly hourSlots = computed(() => {
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), {
      hour: 'numeric',
    });
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      text: format.format(new Date(2001, 0, 1, hour)),
    }));
  });

  protected readonly minuteSlots = computed(() => {
    const step = Math.min(Math.max(1, this.interval()), 60);
    const slots: { minute: number; text: string }[] = [];
    for (let minute = 0; minute < 60; minute += step) {
      slots.push({ minute, text: `:${String(minute).padStart(2, '0')}` });
    }
    return slots.length ? slots : [{ minute: 0, text: ':00' }];
  });

  protected isHourSelected(hour: number): boolean {
    const current = this.draft() ?? this.value();
    return current !== null && current.getHours() === hour;
  }

  protected isMinuteSelected(minute: number): boolean {
    const current = this.draft() ?? this.value();
    return current !== null && current.getMinutes() === minute;
  }

  /** Column picks commit live and keep the popup open (close by OK/outside). */
  protected pickHour(hour: number, event: Event): void {
    const base = this.draft() ?? this.value() ?? startOfDay(new Date());
    this.applyColumnPick(
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        hour,
        base.getMinutes(),
      ),
      event,
    );
  }

  protected pickMinute(minute: number, event: Event): void {
    const base = this.draft() ?? this.value() ?? startOfDay(new Date());
    this.applyColumnPick(
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        base.getHours(),
        minute,
      ),
      event,
    );
  }

  private applyColumnPick(next: Date, event: Event): void {
    this.draft.set(next);
    if (this.applyValueMode() === 'useButtons') return;
    this.commitNow(next, event);
    this.text.set(null);
    this.parseInvalid.set(false);
  }

  private scrollTimeListToSelection(): void {
    setTimeout(() => {
      this.timeListRef()
        ?.nativeElement.querySelector('.oge-date-box-time-selected')
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  // --- base contract ---------------------------------------------------------

  protected override handleBlur(event: FocusEvent): void {
    // focus moving into the picker dialog is not a real blur
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    super.handleBlur(event);
  }

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    this.commitTypedText();
    if (this.opened()) this.close();
  }

  protected override parseErrorMessage(): string {
    const min = this.min();
    const max = this.max();
    if (min || max) {
      const format = this.formatter();
      return this.msg()
        .dateOutOfRangeError.replace('{min}', min ? format(min) : '…')
        .replace('{max}', max ? format(max) : '…');
    }
    return this.msg().invalidDateError;
  }

  protected override onValueWritten(): void {
    this.text.set(null);
    this.parseInvalid.set(false);
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.native()?.nativeElement ?? null;
  }

  protected emptyValue(): Date | null {
    return null;
  }

  protected valueIsEmpty(value: Date | null): boolean {
    return value === null;
  }

  protected override normalizeWrite(value: unknown): Date | null {
    // lenient writes: ISO-like strings and epoch numbers land as LOCAL dates
    // (grid rows often store `yyyy-MM-dd` strings)
    return toLocalDate(value);
  }

  /** Same-day helper surfaced for specs. */
  protected sameDayAs(a: Date | null, b: Date | null): boolean {
    return sameDay(a, b);
  }
}
