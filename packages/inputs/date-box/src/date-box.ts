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
  OgeDateSegmentCore,
  dateSegmentPlaceholders,
  dayPeriodColumnOptions,
  hourColumnOptions,
  isTimePartSelected,
  minuteColumnOptions,
  nowForType,
  timeDisplayOptions,
  withTimePart,
  type OgeTimeColumnOption,
  type OgeTimePart,
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
  OgeCalendarCellTemplateContext,
  OgeCalendarDisabledDates,
  OgeCalendarZoomLevel,
} from '@oge-ui/inputs/calendar';
import { OgeFieldChrome } from '@oge-ui/inputs/field';
import { OGE_INPUT_HOST, type OgeInputDropDownApi } from '@oge-ui/inputs/field';
import { OgeInputBase } from '@oge-ui/inputs/field';
import { SelectPanelController } from '@oge-ui/inputs/select-list';
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

interface TimeColumn {
  part: OgeTimePart;
  label: string;
  options: OgeTimeColumnOption[];
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
 * the committed value on blur — a wrong date is never committed.
 * `useMaskBehavior` swaps free typing for segment entry (digits fill
 * day/month/year/hour/minute segments in the locale's order, arrows step
 * them). `hour12`/`showSeconds` shape the time picker and the display;
 * `showTodayButton`/`showNowButton` add footer shortcuts. Works
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
        (paste)="onPaste($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      />
      <ng-content select="[ogeInputSuffix]" ngProjectAs="[ogeInputSuffix]" />
    </oge-field-chrome>
    @if (opened()) {
      <oge-popup
        [panel]="panel"
        [adaptive]="presentation()"
        [adaptiveTitle]="label() || msg().calendarLabel"
        [closeLabel]="msg().adaptiveClose"
      >
        <!-- adaptive: the full-screen surface around it is the dialog -->
        <div
          class="oge-date-box-panel"
          [attr.role]="adaptiveActive() ? null : 'dialog'"
          [attr.aria-label]="
            adaptiveActive() ? null : label() || msg().calendarLabel
          "
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
                  @for (column of timeColumns(); track column.part) {
                    <div
                      class="oge-date-box-col"
                      role="listbox"
                      [attr.aria-label]="column.label"
                    >
                      @for (option of column.options; track option.value) {
                        <button
                          type="button"
                          role="option"
                          class="oge-date-box-time"
                          [class.oge-date-box-time-selected]="
                            isPartSelected(column.part, option.value)
                          "
                          [attr.aria-selected]="
                            isPartSelected(column.part, option.value)
                          "
                          (click)="pickPart(column.part, option.value, $event)"
                        >
                          {{ option.text }}
                        </button>
                      }
                    </div>
                  }
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
          @if (
            applyValueMode() === 'useButtons' || todayVisible() || nowVisible()
          ) {
            <div class="oge-date-box-actions">
              @if (todayVisible()) {
                <button
                  type="button"
                  class="oge-date-box-action oge-date-box-shortcut oge-date-box-today"
                  [disabled]="todayBlocked()"
                  (click)="pickToday($event)"
                >
                  {{ msg().todayButton }}
                </button>
              }
              @if (nowVisible()) {
                <button
                  type="button"
                  class="oge-date-box-action oge-date-box-shortcut oge-date-box-now"
                  (click)="pickNow($event)"
                >
                  {{ msg().nowButton }}
                </button>
              }
              @if (applyValueMode() === 'useButtons') {
                <span class="oge-date-box-actions-gap"></span>
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
              }
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
  /**
   * Clock of the display text and the time picker. `true` adds an AM/PM
   * column to `timeView: 'columns'`; `false` forces 24-hour; `undefined`
   * (default) follows the locale with a single 24-entry hour column.
   */
  readonly hour12 = input<boolean | undefined>(undefined);
  /** Seconds in the display text, a seconds column and the masked entry. */
  readonly showSeconds = input(false);
  /** "Today" footer button (`date`/`datetime`) — picks today's day. */
  readonly showTodayButton = input(false);
  /** "Now" footer button (`time`/`datetime`) — picks the current time. */
  readonly showNowButton = input(false);
  /**
   * Segment entry instead of free text (DevExtreme `useMaskBehavior`): the
   * field shows the locale's numeric pattern, digits fill the active
   * segment and auto-advance, ArrowUp/Down step it, ArrowLeft/Right move
   * between segments and Alt+ArrowDown opens the picker. `displayFormat` is
   * not used while it is on.
   */
  readonly useMaskBehavior = input(false);
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
  /**
   * `'auto'` presents the picker as a modal full-screen dialog (title, close
   * button, touch-sized calendar) on viewports narrower than
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
      timeDisplayOptions(this.type(), this.hour12(), this.showSeconds());
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), options);
    return (date: Date) => format.format(date);
  });

  // --- masked entry (`useMaskBehavior`) --------------------------------------

  private maskCore: OgeDateSegmentCore | null = null;
  private maskKey = '';
  /** Bumped after every segment edit — the core itself is not reactive. */
  private readonly maskRevision = signal(0);
  /** `true` while the segments hold an uncommitted edit. */
  private readonly maskDirty = signal(false);

  /** The segment machine, (re)configured from the live inputs. */
  private mask(): OgeDateSegmentCore {
    const options = {
      locale: this.effectiveLocale(),
      type: this.type(),
      hour12: this.hour12(),
      showSeconds: this.showSeconds(),
      placeholders: dateSegmentPlaceholders(this.msg()),
    };
    const key = JSON.stringify(options);
    if (!this.maskCore) this.maskCore = new OgeDateSegmentCore(options);
    else if (key !== this.maskKey) this.maskCore.configure(options);
    this.maskKey = key;
    return this.maskCore;
  }

  protected readonly inputText = computed(() => {
    if (this.useMaskBehavior()) {
      this.maskRevision();
      const core = this.mask();
      if (!this.maskDirty()) core.setDate(this.value());
      return core.isEmpty && !this.focusedSig() ? '' : core.text;
    }
    const typed = this.text();
    if (typed !== null) return typed;
    const value = this.value();
    return value === null ? '' : this.formatter()(value);
  });

  protected readonly timeSlots = computed<TimeSlot[]>(() => {
    const step = Math.max(1, this.interval());
    const format = new Intl.DateTimeFormat(
      this.effectiveLocale(),
      timeDisplayOptions('time', this.hour12(), this.showSeconds()),
    );
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
    if (this.useMaskBehavior()) {
      // keys are handled on keydown; whatever still reached the text
      // (autofill, a mobile keyboard, IME) is read whole, then re-masked
      const parsed = this.parseTyped(raw);
      if (parsed !== null) this.mask().setDate(parsed);
      this.maskDirty.set(true);
      this.syncMask();
      this.inputChange.emit({ text: raw, event });
      return;
    }
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

  /** Writes the masked text + active-segment selection into the input. */
  private syncMask(): void {
    const core = this.mask();
    const el = this.native()?.nativeElement;
    if (el) {
      // write before the signal so the binding sees an unchanged value and
      // leaves the selection on the active segment
      el.value = core.text;
      const [start, end] = core.activeRange();
      try {
        el.setSelectionRange(start, end);
      } catch {
        // detached / hidden input — selection is best-effort
      }
    }
    this.maskRevision.update((n) => n + 1);
    const { state, date } = core.read(this.value());
    this.parseInvalid.set(
      state === 'invalid' ||
        (state === 'complete' &&
          date !== null &&
          this.type() !== 'time' &&
          this.dayBlocked(date)),
    );
  }

  /** Commits complete segments; incomplete/invalid ones revert to the value. */
  private commitMask(event?: Event): void {
    if (!this.maskDirty()) return;
    const { state, date } = this.mask().read(this.value());
    this.resetTyping();
    if (state === 'empty') {
      this.commitNow(null, event);
    } else if (
      state === 'complete' &&
      date !== null &&
      (this.type() === 'time' || !this.dayBlocked(date))
    ) {
      this.commitNow(date, event);
    }
    this.maskRevision.update((n) => n + 1);
  }

  /** Mask keys; `true` when the segment machine consumed the key. */
  private maskKeydown(event: KeyboardEvent): boolean {
    if (!this.useMaskBehavior() || !this.acceptCustomValue()) return false;
    const el = this.native()?.nativeElement;
    if (!el) return false;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const handled = this.mask().key(
      event,
      [el.selectionStart ?? 0, el.selectionEnd ?? 0],
      rtl,
      this.value(),
    );
    if (!handled) return false;
    event.preventDefault();
    this.maskDirty.set(true);
    this.syncMask();
    return true;
  }

  protected onPaste(event: ClipboardEvent): void {
    if (!this.useMaskBehavior() || this.readonly()) return;
    if (!this.acceptCustomValue()) return;
    event.preventDefault();
    const parsed = this.parseTyped(event.clipboardData?.getData('text') ?? '');
    if (parsed === null) return;
    this.mask().setDate(parsed);
    this.maskDirty.set(true);
    this.syncMask();
  }

  /** Drops uncommitted typing (free text and segments alike). */
  private resetTyping(): void {
    this.text.set(null);
    this.maskDirty.set(false);
    this.parseInvalid.set(false);
  }

  /** Commits the typed text; unparseable/blocked text reverts to the value. */
  private commitTypedText(event?: Event): void {
    if (this.useMaskBehavior()) {
      this.commitMask(event);
      return;
    }
    const raw = this.text();
    if (raw === null) return;
    this.resetTyping();
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
    if (this.useMaskBehavior() && this.acceptCustomValue()) {
      const el = this.native()?.nativeElement;
      if (el) this.mask().focusAt(el.selectionStart ?? 0);
      this.syncMask();
    }
    if (!this.opened() && this.openOnFieldClick()) this.open();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (this.maskKeydown(event)) return;
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
        if (!this.opened() && (this.text() !== null || this.maskDirty())) {
          event.preventDefault();
          this.resetTyping();
          if (this.useMaskBehavior()) this.syncMask();
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
    this.resetTyping();
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
    this.resetTyping();
    this.close();
    this.focus();
  }

  protected applyDraft(event: Event): void {
    const draft = this.draft();
    if (draft !== null) {
      this.commitNow(draft, event);
      this.resetTyping();
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
      this.type() === 'date' || !this.showSeconds()
        ? 0
        : (time?.getSeconds() ?? 0),
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

  // --- time columns (`timeView: 'columns'`) ---------------------------------

  /** Columns-mode clock: AM/PM column only for an explicit `hour12: true`. */
  private readonly columnHour12 = computed(() => this.hour12() === true);

  protected readonly timeColumns = computed<TimeColumn[]>(() => {
    const locale = this.effectiveLocale();
    const msg = this.msg();
    const columns: TimeColumn[] = [
      {
        part: 'hour',
        label: msg.hourColumnLabel,
        options: hourColumnOptions(locale, this.hour12()),
      },
      {
        part: 'minute',
        label: msg.minuteColumnLabel,
        options: minuteColumnOptions(this.interval()),
      },
    ];
    if (this.showSeconds()) {
      columns.push({
        part: 'second',
        label: msg.secondColumnLabel,
        options: minuteColumnOptions(1),
      });
    }
    if (this.columnHour12()) {
      columns.push({
        part: 'dayPeriod',
        label: msg.dayPeriodColumnLabel,
        options: dayPeriodColumnOptions(locale),
      });
    }
    return columns;
  });

  protected isPartSelected(part: OgeTimePart, value: number): boolean {
    return isTimePartSelected(
      this.draft() ?? this.value(),
      part,
      value,
      this.columnHour12(),
    );
  }

  /** Column picks commit live and keep the popup open (close by OK/outside). */
  protected pickPart(part: OgeTimePart, value: number, event: Event): void {
    const base = this.draft() ?? this.value() ?? startOfDay(new Date());
    this.applyColumnPick(
      withTimePart(base, part, value, this.columnHour12(), this.showSeconds()),
      event,
    );
  }

  // --- Today / Now -------------------------------------------------------------

  protected readonly todayVisible = computed(
    () => this.showTodayButton() && this.type() !== 'time',
  );
  protected readonly nowVisible = computed(
    () => this.showNowButton() && this.type() !== 'date',
  );

  protected todayBlocked(): boolean {
    return this.dayBlocked(startOfDay(new Date()));
  }

  /** Today's day (time-of-day kept for `datetime`), through the calendar pick path. */
  protected pickToday(event: Event): void {
    this.onCalendarPick(startOfDay(new Date()), event);
  }

  /** The current time (and day), committed or drafted per `applyValueMode`. */
  protected pickNow(event: Event): void {
    const now = nowForType(this.type(), this.showSeconds());
    if (this.applyValueMode() === 'useButtons') {
      this.draft.set(now);
      return;
    }
    this.commitNow(now, event);
    this.resetTyping();
    this.close();
    this.focus();
  }

  private applyColumnPick(next: Date, event: Event): void {
    this.draft.set(next);
    if (this.applyValueMode() === 'useButtons') return;
    this.commitNow(next, event);
    this.resetTyping();
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
    // nor is the adaptive dialog taking focus (the field goes inert)
    if (this.opened() && this.adaptiveActive()) return;
    super.handleBlur(event);
  }

  protected override afterFocusGained(): void {
    if (
      this.useMaskBehavior() &&
      this.acceptCustomValue() &&
      !this.readonly()
    ) {
      this.mask().focusFirst();
      this.syncMask();
      return;
    }
    super.afterFocusGained();
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
    this.resetTyping();
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
