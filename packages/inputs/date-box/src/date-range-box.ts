import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { startOfDay, toLocalDate } from '@oge-ui/core';
import {
  dateRangePresetActive,
  dateRangePresetLabel,
  timeDisplayOptions,
  type OgeDateRangeBoxType,
  type OgeDateRangePreset,
} from '@oge-ui/behavior';
import {
  OGE_OVERLAY_CONFIG,
  OgePopup,
  ogeAdaptivePresentation,
  type OgeAdaptiveMode,
  type OgePopupPlacement,
} from '@oge-ui/overlay';
import { OgeCalendar } from '@oge-ui/inputs/calendar';
import { isDayDisabled } from '@oge-ui/inputs/calendar';
import type {
  OgeCalendarDisabledDates,
  OgeCalendarRange,
} from '@oge-ui/inputs/calendar';
import { OgeFieldChrome } from '@oge-ui/inputs/field';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '@oge-ui/inputs/field';
import { OgeInputBase } from '@oge-ui/inputs/field';
import { SelectPanelController } from '@oge-ui/inputs/select-list';
import type { OgeDateBoxDisplayFormat } from './date-box-types';
import { parseDateText } from './date-parse';

/**
 * Start–end date editor on one field: two inputs sharing the chrome, a
 * two-month range calendar in the popup (hover preview while picking the
 * end), and a `[start, end]` tuple value where either end may stay open:
 *
 * ```html
 * <oge-date-range-box label="Period" [(value)]="period" />
 * <oge-date-range-box [min]="today" [showClearButton]="true" [(value)]="stay" />
 * ```
 *
 * Both sides parse locale-aware through `Intl` exactly like the date box —
 * unparseable text reverts on blur, a reversed pair is reordered on commit.
 * `type: 'time' | 'datetime'` turns it into a time-range or date-time-range
 * picker; `presets` lists quick ranges (`ogeDateRangePresets.last7Days()`…)
 * beside the calendar.
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-date-range-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeFieldChrome, OgePopup, OgeCalendar],
  providers: [{ provide: OGE_INPUT_HOST, useExisting: OgeDateRangeBox }],
  host: {
    class: 'oge-input oge-date-range-box',
    '[class.oge-select-box-open]': 'opened()',
  },
  template: `
    <oge-field-chrome>
      <ng-content select="[ogeInputPrefix]" ngProjectAs="[ogeInputPrefix]" />
      <div class="oge-date-range-strip">
        <input
          #startInput
          class="oge-input-native oge-date-range-input"
          type="text"
          autocomplete="off"
          aria-haspopup="dialog"
          [id]="inputId"
          [value]="startText() ?? formattedStart()"
          [placeholder]="placeholderText()"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly() || !acceptCustomValue()"
          [attr.tabindex]="tabIndex()"
          [attr.aria-label]="msg().rangeStartLabel"
          [attr.aria-invalid]="showError() ? 'true' : null"
          (input)="onSideInput('start', $event)"
          (click)="onFieldClick()"
          (keydown)="onKeydown($event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
        />
        <span class="oge-date-range-sep" aria-hidden="true">–</span>
        <input
          #endInput
          class="oge-input-native oge-date-range-input"
          type="text"
          autocomplete="off"
          aria-haspopup="dialog"
          [value]="endText() ?? formattedEnd()"
          [disabled]="effectiveDisabled()"
          [readOnly]="readonly() || !acceptCustomValue()"
          [attr.tabindex]="tabIndex()"
          [attr.aria-label]="msg().rangeEndLabel"
          [attr.aria-invalid]="showError() ? 'true' : null"
          (input)="onSideInput('end', $event)"
          (click)="onFieldClick()"
          (keydown)="onKeydown($event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
        />
      </div>
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup
        [panel]="panel"
        [adaptive]="presentation()"
        [adaptiveTitle]="label() || msg().calendarLabel"
        [closeLabel]="msg().adaptiveClose"
      >
        @if (adaptiveActive() && type() === 'date') {
          <div ogePopupSheetFooter class="oge-popup-sheet-footer">
            <button
              type="button"
              class="oge-sheet-done"
              (click)="applyDraft($event)"
            >
              {{ msg().adaptiveDone }}
            </button>
          </div>
        }
        <!-- adaptive: the full-screen surface around it is the dialog -->
        <div
          class="oge-date-box-panel"
          [attr.role]="adaptiveActive() ? null : 'dialog'"
          [attr.aria-label]="
            adaptiveActive() ? null : label() || msg().calendarLabel
          "
        >
          <div class="oge-date-range-body">
            @if (presets().length) {
              <div
                class="oge-date-range-presets"
                role="group"
                [attr.aria-label]="msg().presetsLabel"
              >
                @for (preset of presets(); track $index) {
                  <button
                    type="button"
                    class="oge-date-range-preset"
                    [attr.aria-pressed]="isPresetActive(preset)"
                    (click)="applyPreset(preset, $event)"
                  >
                    {{ presetLabel(preset) }}
                  </button>
                }
              </div>
            }
            @if (type() !== 'time') {
              <oge-calendar
                class="oge-date-box-calendar"
                selectionMode="range"
                [viewsCount]="adaptiveActive() ? 1 : 2"
                [range]="draftRange()"
                [min]="min()"
                [max]="max()"
                [disabledDates]="disabledDates()"
                [firstDayOfWeek]="firstDayOfWeek()"
                [showWeekNumbers]="showWeekNumbers()"
                [locale]="locale()"
                (rangeChange)="onRangePick($event)"
              />
            }
          </div>
          @if (type() !== 'date') {
            <div class="oge-date-range-times">
              @for (side of [0, 1]; track side) {
                <div class="oge-date-range-time-col">
                  <div class="oge-date-range-time-head">
                    {{
                      side === 0 ? msg().rangeStartLabel : msg().rangeEndLabel
                    }}
                  </div>
                  <div
                    class="oge-date-box-times"
                    role="listbox"
                    [attr.aria-label]="
                      side === 0 ? msg().rangeStartLabel : msg().rangeEndLabel
                    "
                  >
                    @for (slot of timeSlots(); track slot.minutes) {
                      <button
                        type="button"
                        class="oge-date-box-time"
                        role="option"
                        [class.oge-date-box-time-selected]="
                          isSideTimeSelected(side, slot.minutes)
                        "
                        [attr.aria-selected]="
                          isSideTimeSelected(side, slot.minutes)
                        "
                        (click)="pickSideTime(side, slot.minutes)"
                      >
                        {{ slot.text }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="oge-date-box-actions">
              <button
                type="button"
                class="oge-date-box-action"
                (click)="close(); focus()"
              >
                {{ msg().cancelButton }}
              </button>
              <button
                type="button"
                class="oge-date-box-action oge-date-box-ok"
                (click)="applyDraft($event)"
              >
                {{ msg().okButton }}
              </button>
            </div>
          }
        </div>
      </oge-popup>
    }
  `,
  styleUrl: './date-box.scss',
})
// Note: `FormValueControl` is satisfied structurally except for `min`/`max`,
// which this editor types as Dates (the contract's numeric bounds don't apply
// to a range tuple) — hence no `implements` clause; CVA and `[formField]`
// name-based binding work unchanged.
export class OgeDateRangeBox extends OgeInputBase<OgeCalendarRange> {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);

  /** The `[start, end]` tuple — two-way; either end may be `null` (open). */
  readonly value = model<OgeCalendarRange>([null, null]);
  /**
   * `'datetime'` adds start/end time lists to the picker (commits via OK) and
   * parses/renders times on both sides; `'time'` drops the calendar for a
   * time-of-day range (the days are today's, or the bound value's).
   */
  readonly type = input<OgeDateRangeBoxType>('date');
  /** Clock of the display text and time lists; `undefined` = the locale's. */
  readonly hour12 = input<boolean | undefined>(undefined);
  /** Seconds in the display text (`time`/`datetime`). */
  readonly showSeconds = input(false);
  /**
   * Quick ranges listed beside the calendar (a chip row in the adaptive
   * dialog): `[{ label, range: () => [start, end] }]` or the built-in
   * `ogeDateRangePresets.*()` factories, whose labels come from the messages.
   */
  readonly presets = input<readonly OgeDateRangePreset[]>([]);
  /** Time list step in minutes (`type: 'datetime'`). */
  readonly interval = input(30);
  /** Display text — `Intl.DateTimeFormatOptions` or a formatter; `undefined` = short per type. */
  readonly displayFormat = input<OgeDateBoxDisplayFormat | undefined>(
    undefined,
  );
  readonly min = input<Date | undefined>(undefined);
  readonly max = input<Date | undefined>(undefined);
  readonly disabledDates = input<OgeCalendarDisabledDates | undefined>(
    undefined,
  );
  readonly openOnFieldClick = input(true);
  /** `false` makes the texts read-only — picker input only. */
  readonly acceptCustomValue = input(true);
  readonly dropdownPlacement = input<OgePopupPlacement>('bottom-start');
  /** `0`–`6` (Sunday-first); `undefined` resolves from the locale. */
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  readonly showWeekNumbers = input<
    boolean | { rule: 'firstDay' | 'firstFourDays' | 'fullWeek' }
  >(false);
  /** BCP 47 locale for display and parsing; `undefined` = the runtime default. */
  readonly locale = input<string | undefined>(undefined);
  /** Instance locale, falling back to the DI config, then the browser. */
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );
  /** Picker visibility — two-way. */
  readonly opened = model(false);
  /**
   * `'auto'` presents the picker as a modal full-screen dialog (title, close
   * button, one month, an explicit Done action) on viewports narrower than
   * `adaptiveBreakpoint`; `'none'` always anchors it. `undefined` = config
   * default (`'none'`).
   */
  readonly adaptiveMode = input<OgeAdaptiveMode | undefined>(undefined);
  /** Viewport width (px) below which `adaptiveMode: 'auto'` applies; `undefined` = config (600). */
  readonly adaptiveBreakpoint = input<number | undefined>(undefined);
  /** Current presentation: anchored, or the adaptive full-screen dialog. */
  protected readonly presentation = ogeAdaptivePresentation(
    () => this.adaptiveMode() ?? this.config.adaptiveMode,
    () => this.adaptiveBreakpoint() ?? this.config.adaptiveBreakpoint,
    'fullscreen',
  );
  protected readonly adaptiveActive = computed(
    () => this.presentation() !== 'popup',
  );

  readonly dropDownOpened = output<void>();
  readonly dropDownClosed = output<void>();

  private readonly startInput =
    viewChild<ElementRef<HTMLInputElement>>('startInput');
  private readonly endInput =
    viewChild<ElementRef<HTMLInputElement>>('endInput');
  private readonly chromeRef = viewChild(OgeFieldChrome, { read: ElementRef });
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

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
      this.pickerRange.set(this.value());
      setTimeout(() => {
        const popup = this.popupRef()?.nativeElement as HTMLElement | undefined;
        // the calendar's focus target; a time range has only the lists
        (
          popup?.querySelector<HTMLElement>('[data-focus-target]') ??
          popup?.querySelector<HTMLElement>('.oge-date-box-time-selected') ??
          popup?.querySelector<HTMLElement>('.oge-date-box-time')
        )?.focus();
      });
      this.dropDownOpened.emit();
    },
    onClosed: () => {
      this.pickerRange.set(null);
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
    const self = this as OgeDateRangeBox;
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

  /** Uncommitted typed texts per side; `null` = show the formatted value. */
  protected readonly startText = signal<string | null>(null);
  protected readonly endText = signal<string | null>(null);
  /** In-picker range while the popup is open (`null` = closed). */
  private readonly pickerRange = signal<OgeCalendarRange | null>(null);

  protected readonly draftRange = computed<OgeCalendarRange>(
    () => this.pickerRange() ?? this.value(),
  );

  private readonly formatter = computed(() => {
    const custom = this.displayFormat();
    if (typeof custom === 'function') return custom;
    const format = new Intl.DateTimeFormat(
      this.effectiveLocale(),
      custom ??
        timeDisplayOptions(this.type(), this.hour12(), this.showSeconds()),
    );
    return (date: Date) => format.format(date);
  });

  protected readonly timeSlots = computed(() => {
    const step = Math.max(1, this.interval());
    const format = new Intl.DateTimeFormat(
      this.effectiveLocale(),
      timeDisplayOptions('time', this.hour12(), false),
    );
    const slots: { minutes: number; text: string }[] = [];
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

  protected readonly formattedStart = computed(() => {
    const [start] = this.value();
    return start === null ? '' : this.formatter()(start);
  });

  protected readonly formattedEnd = computed(() => {
    const [, end] = this.value();
    return end === null ? '' : this.formatter()(end);
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

  protected onSideInput(side: 'start' | 'end', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    (side === 'start' ? this.startText : this.endText).set(raw);
    this.inputChange.emit({ text: raw, event });
    const invalid = (text: string | null): boolean =>
      text !== null && text.trim() !== '' && this.parseSide(text) === null;
    this.parseInvalid.set(invalid(this.startText()) || invalid(this.endText()));
  }

  private parseSide(raw: string): Date | null {
    const parsed = parseDateText(raw, this.effectiveLocale(), this.type());
    if (parsed === null) return null;
    if (this.type() === 'time') return parsed;
    return isDayDisabled(parsed, this.min(), this.max(), this.disabledDates())
      ? null
      : parsed;
  }

  /** Commits both typed sides (blur/Enter); bad text reverts to the value. */
  private commitTypedText(event?: Event): void {
    const startRaw = this.startText();
    const endRaw = this.endText();
    if (startRaw === null && endRaw === null) return;
    const [currentStart, currentEnd] = this.value();
    const resolve = (raw: string | null, current: Date | null): Date | null => {
      if (raw === null) return current;
      if (raw.trim() === '') return null;
      return this.parseSide(raw) ?? current;
    };
    const start = resolve(startRaw, currentStart);
    const end = resolve(endRaw, currentEnd);
    this.startText.set(null);
    this.endText.set(null);
    this.parseInvalid.set(false);
    this.commitRange(start, end, event);
  }

  private commitRange(
    start: Date | null,
    end: Date | null,
    event?: Event,
  ): void {
    // datetime keeps the time-of-day; date normalizes to local midnight
    const norm = (date: Date | null): Date | null =>
      date === null ? null : this.type() === 'date' ? startOfDay(date) : date;
    const a = norm(start);
    const b = norm(end);
    const ordered: OgeCalendarRange =
      a && b && a.getTime() > b.getTime() ? [b, a] : [a, b];
    this.commitNow(ordered, event);
  }

  protected onFieldClick(): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.opened()) this.open();
        return;
      case 'Enter':
        this.commitTypedText(event);
        if (this.opened()) this.close();
        this.handleEnterKey(event);
        return;
    }
  }

  // --- picker ----------------------------------------------------------------

  protected onRangePick(range: OgeCalendarRange): void {
    // calendar days come in at midnight — datetime keeps each side's time
    const merged: OgeCalendarRange =
      this.type() !== 'date'
        ? [this.mergeSideTime(range[0], 0), this.mergeSideTime(range[1], 1)]
        : range;
    this.pickerRange.set(merged);
    // datetime commits via the OK footer, the adaptive dialog via Done
    if (this.type() !== 'date' || this.adaptiveActive()) return;
    const [start, end] = merged;
    if (start && end) {
      this.startText.set(null);
      this.endText.set(null);
      this.parseInvalid.set(false);
      this.commitRange(start, end);
      this.close();
      this.focus();
    }
  }

  private mergeSideTime(day: Date | null, side: number): Date | null {
    if (day === null) return null;
    const previous = (this.pickerRange() ?? this.value())[side === 0 ? 0 : 1];
    return new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      previous?.getHours() ?? 0,
      previous?.getMinutes() ?? 0,
      this.showSeconds() ? (previous?.getSeconds() ?? 0) : 0,
    );
  }

  // --- presets -----------------------------------------------------------------

  protected presetLabel(preset: OgeDateRangePreset): string {
    return dateRangePresetLabel(preset, this.msg());
  }

  protected isPresetActive(preset: OgeDateRangePreset): boolean {
    return dateRangePresetActive(preset, this.draftRange());
  }

  /**
   * A preset pick: `date` boxes commit and close (the adaptive dialog waits
   * for Done); `time`/`datetime` boxes draft it for the OK footer.
   */
  protected applyPreset(preset: OgeDateRangePreset, event: Event): void {
    const [start, end] = preset.range();
    this.pickerRange.set([start, end]);
    if (this.type() !== 'date' || this.adaptiveActive()) return;
    this.startText.set(null);
    this.endText.set(null);
    this.parseInvalid.set(false);
    this.commitRange(start, end, event);
    this.close();
    this.focus();
  }

  protected pickSideTime(side: number, minutes: number): void {
    const current = this.pickerRange() ?? this.value();
    const own = current[side === 0 ? 0 : 1];
    const other = current[side === 0 ? 1 : 0];
    const base = own ?? other ?? startOfDay(new Date());
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Math.floor(minutes / 60),
      minutes % 60,
    );
    this.pickerRange.set(side === 0 ? [next, current[1]] : [current[0], next]);
  }

  protected isSideTimeSelected(side: number, minutes: number): boolean {
    const date = (this.pickerRange() ?? this.value())[side === 0 ? 0 : 1];
    return (
      date !== null && date.getHours() * 60 + date.getMinutes() === minutes
    );
  }

  /** OK footer (`type: 'datetime'`): commits the drafted range and closes. */
  protected applyDraft(event: Event): void {
    const [start, end] = this.pickerRange() ?? this.value();
    this.startText.set(null);
    this.endText.set(null);
    this.parseInvalid.set(false);
    this.commitRange(start, end, event);
    this.close();
    this.focus();
  }

  // --- base contract ---------------------------------------------------------

  protected override handleBlur(event: FocusEvent): void {
    // focus moving between the two inputs or into the picker is not a blur
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    // nor is the adaptive dialog taking focus (the fields go inert)
    if (this.opened() && this.adaptiveActive()) return;
    super.handleBlur(event);
  }

  protected override onFocusChanged(focused: boolean): void {
    if (focused) return;
    this.commitTypedText();
    if (this.opened()) this.close();
  }

  protected override parseErrorMessage(): string {
    return this.msg().invalidDateError;
  }

  protected override onValueWritten(): void {
    this.startText.set(null);
    this.endText.set(null);
    this.parseInvalid.set(false);
  }

  protected nativeElement(): HTMLInputElement | null {
    return this.startInput()?.nativeElement ?? null;
  }

  protected emptyValue(): OgeCalendarRange {
    return [null, null];
  }

  protected valueIsEmpty(value: OgeCalendarRange): boolean {
    return value[0] === null && value[1] === null;
  }

  protected override normalizeWrite(value: unknown): OgeCalendarRange {
    if (Array.isArray(value)) {
      return [toLocalDate(value[0]), toLocalDate(value[1])];
    }
    return [null, null];
  }
}
