'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  isDayDisabled,
  parseDateText,
  startOfDay,
  toLocalDate,
  type OgeCalendarDisabledDates,
  type OgeCalendarRange,
  type OgeCalendarWeekNumberOptions,
  type OgeDateBoxDisplayFormat,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import { OgeCalendar } from './calendar';
import { OgeFieldChrome } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';
import { useOgeInputsConfig } from './inputs-config';

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeDateRangeBoxHandle {
  focus(): void;
  blur(): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
}

export interface OgeDateRangeBoxProps
  extends OgeControlProps<OgeCalendarRange>, OgeFieldExtrasProps {
  /**
   * `'datetime'` adds start/end time lists to the picker (commits via OK) and
   * parses/renders times on both sides.
   */
  type?: 'date' | 'datetime';
  /** Time list step in minutes (`type: 'datetime'`). */
  interval?: number;
  /** Display text — `Intl.DateTimeFormatOptions` or a formatter; `undefined` = short per type. */
  displayFormat?: OgeDateBoxDisplayFormat;
  min?: Date;
  max?: Date;
  disabledDates?: OgeCalendarDisabledDates;
  openOnFieldClick?: boolean;
  /** `false` makes the texts read-only — picker input only. */
  acceptCustomValue?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  /** `0`–`6` (Sunday-first); `undefined` resolves from the locale. */
  firstDayOfWeek?: number;
  showWeekNumbers?: boolean | OgeCalendarWeekNumberOptions;
  /** BCP 47 locale for display and parsing; `undefined` = the runtime default. */
  locale?: string;
  /** Picker visibility — controlled when provided. */
  opened?: boolean;
  /** Uncontrolled initial picker visibility. */
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  onDropDownOpened?: () => void;
  onDropDownClosed?: () => void;
  /** Raw text on every keystroke, regardless of the commit policy. */
  onInputChange?: (event: { text: string; event: Event }) => void;
  label?: string;
  labelMode?: 'static' | 'floating' | 'hidden' | 'outside';
  stylingMode?: 'outlined' | 'filled' | 'underlined';
  placeholder?: string;
  hint?: string;
  subscriptSizing?: 'fixed' | 'dynamic' | 'none';
  fluid?: boolean;
  showClearButton?: boolean;
  showDropDownButton?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Start–end date editor on one field — the React render of the Angular
 * `<oge-date-range-box>`: two inputs sharing the chrome, a two-month range
 * calendar in the popup (hover preview while picking the end), and a
 * `[start, end]` tuple value where either end may stay open.
 *
 * Both sides parse locale-aware through `Intl` exactly like the date box —
 * unparseable text reverts on blur, a reversed pair is reordered on commit.
 *
 * ```tsx
 * <OgeDateRangeBox label="Period" value={period} onValueChange={setPeriod} />
 * ```
 */
export const OgeDateRangeBox = forwardRef<
  OgeDateRangeBoxHandle,
  OgeDateRangeBoxProps
>(function OgeDateRangeBoxRender(props, ref) {
  const {
    type = 'date',
    interval = 30,
    displayFormat,
    min,
    max,
    disabledDates,
    openOnFieldClick = true,
    acceptCustomValue = true,
    firstDayOfWeek,
    showWeekNumbers = false,
    showSuccessIcon = false,
    selectOnFocus = false,
    inputAttr,
    label = '',
    labelMode = 'static',
    stylingMode = 'outlined',
    placeholder = '',
    hint,
    subscriptSizing = 'fixed',
    fluid = false,
    showClearButton = false,
    showDropDownButton = true,
    prefix,
    suffix,
    className,
    style,
  } = props;

  const config = useOgeInputsConfig();
  const overlayConfig = useOgeOverlayConfig();
  const hostRef = useRef<HTMLSpanElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const locale = props.locale ?? config.locale;

  const formatter = ((): ((date: Date) => string) => {
    if (typeof displayFormat === 'function') return displayFormat;
    const format = new Intl.DateTimeFormat(
      locale,
      displayFormat ??
        (type === 'datetime'
          ? { dateStyle: 'short', timeStyle: 'short' }
          : { dateStyle: 'short' }),
    );
    return (date: Date) => format.format(date);
  })();

  const field = useOgeField<OgeCalendarRange>({
    props,
    emptyValue: [null, null],
    isEmpty: (value) => value[0] === null && value[1] === null,
    parseErrorMessage: (msg) => msg.invalidDateError,
    focusNative: () => startInputRef.current?.focus(),
  });
  const readonly = props.readonly ?? false;
  // lenient writes: ISO-like strings and epoch numbers land as LOCAL dates
  const value: OgeCalendarRange = Array.isArray(field.value)
    ? [toLocalDate(field.value[0]), toLocalDate(field.value[1])]
    : [null, null];

  /** Uncommitted typed texts per side; `null` = show the formatted value. */
  const [startText, setStartText] = useState<string | null>(null);
  const [endText, setEndText] = useState<string | null>(null);
  /** In-picker range while the popup is open (`null` = closed). */
  const [pickerRange, setPickerRange] = useState<OgeCalendarRange | null>(null);

  // --- opened (controlled/uncontrolled) -------------------------------------

  const [uncontrolledOpened, setUncontrolledOpened] = useState(
    props.defaultOpened ?? false,
  );
  const opened = props.opened ?? uncontrolledOpened;
  const openedRef = useRef(opened);
  openedRef.current = opened;

  const latest = useRef({
    props,
    field,
    opened,
    startText,
    endText,
    pickerRange,
    value,
    type,
  });
  latest.current = {
    props,
    field,
    opened,
    startText,
    endText,
    pickerRange,
    value,
    type,
  };

  const setOpened = (next: boolean): void => {
    if (latest.current.props.opened === undefined) setUncontrolledOpened(next);
    latest.current.props.onOpenedChange?.(next);
  };

  // An external programmatic write resets uncommitted text — the Angular
  // `onValueWritten` rule.
  const lastValue = useRef(props.value);
  useEffect(() => {
    if (props.value !== undefined && lastValue.current !== props.value) {
      setStartText(null);
      setEndText(null);
      field.setParseInvalid(false);
    }
    lastValue.current = props.value;
  }, [props.value]);

  const draftRange: OgeCalendarRange = pickerRange ?? value;
  const formattedStart = value[0] === null ? '' : formatter(value[0]);
  const formattedEnd = value[1] === null ? '' : formatter(value[1]);

  const timeSlots = (() => {
    if (type !== 'datetime') return [];
    const step = Math.max(1, interval);
    const format = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
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
  })();

  // --- panel ----------------------------------------------------------------

  const panel = useAnchoredPanel({
    anchor: () =>
      hostRef.current?.querySelector<HTMLElement>('.oge-input-container') ??
      hostRef.current,
    panel: () => popupRef.current,
    placement: () => latest.current.props.dropdownPlacement ?? 'bottom-start',
    width: () => undefined as unknown as number | 'anchor',
    offset: () => overlayConfig.offset,
    viewportPadding: () => overlayConfig.viewportPadding,
    restoreFocus: () => startInputRef.current?.focus(),
    onClosed: () => {
      if (openedRef.current) setOpened(false);
    },
  });
  const panelRef = useRef(panel);
  panelRef.current = panel;

  // Tracks what we have already announced: the panel machine can close itself
  // (Escape, outside click), so `machine.isOpen` alone would miss those closes
  // and never run the teardown.
  const announcedOpen = useRef(false);
  useEffect(() => {
    const machine = panelRef.current;
    if (opened) {
      if (!machine.isOpen) machine.open();
      if (announcedOpen.current) return;
      announcedOpen.current = true;
      setPickerRange(latest.current.value);
      setTimeout(() =>
        popupRef.current
          ?.querySelector<HTMLElement>('[data-focus-target]')
          ?.focus(),
      );
      latest.current.props.onDropDownOpened?.();
    } else {
      if (machine.isOpen) machine.close('api');
      if (!announcedOpen.current) return;
      announcedOpen.current = false;
      setPickerRange(null);
      latest.current.props.onDropDownClosed?.();
    }
  }, [opened, panel.isOpen]);

  // --- open/close -----------------------------------------------------------

  const open = (): void => {
    if (field.effectiveDisabled || latest.current.props.readonly) return;
    setOpened(true);
  };
  const close = (): void => setOpened(false);
  const toggle = (): void => (openedRef.current ? close() : open());

  // --- typing ---------------------------------------------------------------

  const parseSide = (raw: string): Date | null => {
    const parsed = parseDateText(raw, locale, latest.current.type);
    if (parsed === null) return null;
    return isDayDisabled(
      parsed,
      latest.current.props.min,
      latest.current.props.max,
      latest.current.props.disabledDates,
    )
      ? null
      : parsed;
  };

  const commitRange = (
    start: Date | null,
    end: Date | null,
    event?: Event,
  ): void => {
    // datetime keeps the time-of-day; date normalizes to local midnight
    const norm = (date: Date | null): Date | null =>
      date === null
        ? null
        : latest.current.type === 'date'
          ? startOfDay(date)
          : date;
    const a = norm(start);
    const b = norm(end);
    const ordered: OgeCalendarRange =
      a && b && a.getTime() > b.getTime() ? [b, a] : [a, b];
    latest.current.field.commit.commitNow(ordered, event);
  };

  /** Commits both typed sides (blur/Enter); bad text reverts to the value. */
  const commitTypedText = (event?: Event): void => {
    const startRaw = latest.current.startText;
    const endRaw = latest.current.endText;
    if (startRaw === null && endRaw === null) return;
    const [currentStart, currentEnd] = latest.current.value;
    const resolve = (raw: string | null, current: Date | null): Date | null => {
      if (raw === null) return current;
      if (raw.trim() === '') return null;
      return parseSide(raw) ?? current;
    };
    const start = resolve(startRaw, currentStart);
    const end = resolve(endRaw, currentEnd);
    setStartText(null);
    setEndText(null);
    field.setParseInvalid(false);
    commitRange(start, end, event);
  };

  const onSideInput = (
    side: 'start' | 'end',
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const raw = event.target.value;
    if (side === 'start') setStartText(raw);
    else setEndText(raw);
    props.onInputChange?.({ text: raw, event: event.nativeEvent });
    const invalid = (text: string | null): boolean =>
      text !== null && text.trim() !== '' && parseSide(text) === null;
    const nextStart = side === 'start' ? raw : latest.current.startText;
    const nextEnd = side === 'end' ? raw : latest.current.endText;
    field.setParseInvalid(invalid(nextStart) || invalid(nextEnd));
  };

  const onKeydown = (event: ReactKeyboardEvent): void => {
    if (field.effectiveDisabled || latest.current.props.readonly) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!openedRef.current) open();
        return;
      case 'Enter':
        commitTypedText(event.nativeEvent);
        if (openedRef.current) close();
        field.handleEnterKey(event);
        return;
    }
  };

  // --- picker ---------------------------------------------------------------

  const mergeSideTime = (day: Date | null, side: number): Date | null => {
    if (day === null) return null;
    const previous = (latest.current.pickerRange ?? latest.current.value)[
      side === 0 ? 0 : 1
    ];
    return new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      previous?.getHours() ?? 0,
      previous?.getMinutes() ?? 0,
    );
  };

  const onRangePick = (picked: OgeCalendarRange): void => {
    // calendar days come in at midnight — datetime keeps each side's time
    const merged: OgeCalendarRange =
      latest.current.type === 'datetime'
        ? [mergeSideTime(picked[0], 0), mergeSideTime(picked[1], 1)]
        : picked;
    setPickerRange(merged);
    if (latest.current.type === 'datetime') return; // commits via the OK footer
    const [start, end] = merged;
    if (start && end) {
      setStartText(null);
      setEndText(null);
      field.setParseInvalid(false);
      commitRange(start, end);
      close();
      startInputRef.current?.focus();
    }
  };

  const pickSideTime = (side: number, minutes: number): void => {
    const current = latest.current.pickerRange ?? latest.current.value;
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
    setPickerRange(side === 0 ? [next, current[1]] : [current[0], next]);
  };

  const isSideTimeSelected = (side: number, minutes: number): boolean => {
    const date = draftRange[side === 0 ? 0 : 1];
    return (
      date !== null && date.getHours() * 60 + date.getMinutes() === minutes
    );
  };

  /** OK footer (`type: 'datetime'`): commits the drafted range and closes. */
  const applyDraft = (event: { nativeEvent: Event }): void => {
    const [start, end] = latest.current.pickerRange ?? latest.current.value;
    setStartText(null);
    setEndText(null);
    field.setParseInvalid(false);
    commitRange(start, end, event.nativeEvent);
    close();
    startInputRef.current?.focus();
  };

  // --- blur -----------------------------------------------------------------

  const onBlur = (event: ReactFocusEvent): void => {
    // focus moving between the two inputs or into the picker is not a blur
    const related = event.relatedTarget as Node | null;
    if (related && hostRef.current?.contains(related)) return;
    commitTypedText();
    if (openedRef.current) close();
    field.handleBlur(event);
  };

  useImperativeHandle(
    ref,
    () => ({
      focus: () => startInputRef.current?.focus(),
      blur: () => startInputRef.current?.blur(),
      open,
      close,
      toggle,
      clear: () => field.clear(),
    }),
    [],
  );

  // --- render ---------------------------------------------------------------

  const floatUp = field.focused || !field.isEmpty || opened;
  const placeholderText =
    labelMode === 'floating' && label && !floatUp ? '' : placeholder;

  const successVisible = successIconVisible(showSuccessIcon, {
    pending: props.pending ?? false,
    invalid: field.effectiveInvalid,
    empty: field.isEmpty,
    touched: field.effectiveTouched,
  });
  const extraAttrs = nativeInputAttrs(inputAttr);

  const hostClasses = [
    'oge-input',
    'oge-date-range-box',
    opened && 'oge-select-box-open',
    field.effectiveDisabled && 'oge-disabled',
    field.focused && 'oge-input-focused',
    field.showError && 'oge-input-invalid',
    readonly && 'oge-input-readonly',
    field.isEmpty && 'oge-input-empty',
    fluid && 'oge-input-fluid',
    floatUp && 'oge-input-float-up',
    props.size === 'sm' && 'oge-input-sm',
    props.size === 'lg' && 'oge-input-lg',
    stylingMode === 'filled' && 'oge-input-filled',
    stylingMode === 'underlined' && 'oge-input-underlined',
    labelMode === 'floating' && 'oge-input-label-floating',
    labelMode === 'outside' && 'oge-input-label-outside',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sideInput = (side: 'start' | 'end') => (
    <input
      {...extraAttrs}
      ref={side === 'start' ? startInputRef : undefined}
      className="oge-input-native oge-date-range-input"
      type="text"
      autoComplete="off"
      aria-haspopup="dialog"
      id={side === 'start' ? field.ids.inputId : undefined}
      value={
        side === 'start'
          ? (startText ?? formattedStart)
          : (endText ?? formattedEnd)
      }
      placeholder={side === 'start' ? placeholderText : undefined}
      disabled={field.effectiveDisabled}
      readOnly={readonly || !acceptCustomValue}
      tabIndex={props.tabIndex ?? 0}
      aria-label={
        side === 'start' ? field.msg.rangeStartLabel : field.msg.rangeEndLabel
      }
      aria-invalid={field.showError ? true : undefined}
      onChange={(event) => onSideInput(side, event)}
      onClick={() => {
        if (field.effectiveDisabled || readonly) return;
        if (!openedRef.current && openOnFieldClick) open();
      }}
      onKeyDown={onKeydown}
      onFocus={(event) => {
        if (selectOnFocus) event.currentTarget.select();
        field.handleFocus(event);
      }}
      onBlur={onBlur}
    />
  );

  return (
    <span ref={hostRef} className={hostClasses} style={style}>
      <OgeFieldChrome
        host={{
          msg: field.msg,
          ...field.ids,
          label,
          labelMode,
          required: props.required ?? false,
          pendingVisible: props.pending ?? false,
          successVisible,
          showClear:
            showClearButton &&
            !field.isEmpty &&
            !field.effectiveDisabled &&
            !readonly,
          clear: () => field.clear(),
          subscriptSizing,
          showError: field.showError,
          resolvedErrorText: field.resolvedErrorText,
          hint,
          counter: null,
          reveal: null,
          copy: null,
          spin: null,
          dropdown: {
            visible: showDropDownButton && !field.effectiveDisabled,
            expanded: opened,
            toggle,
            icon: 'calendar',
          },
        }}
        prefix={prefix}
        suffix={suffix}
      >
        <span className="oge-date-range-strip">
          {sideInput('start')}
          <span className="oge-date-range-sep" aria-hidden="true">
            –
          </span>
          {sideInput('end')}
        </span>
      </OgeFieldChrome>
      {opened && (
        <OgePopup panel={panel} ref={popupRef}>
          <div
            className="oge-date-box-panel"
            role="dialog"
            aria-label={label || field.msg.calendarLabel}
          >
            <OgeCalendar
              className="oge-date-box-calendar"
              selectionMode="range"
              viewsCount={2}
              range={draftRange}
              onRangeChange={onRangePick}
              min={min}
              max={max}
              disabledDates={disabledDates}
              firstDayOfWeek={firstDayOfWeek}
              showWeekNumbers={showWeekNumbers}
              locale={props.locale}
            />
            {type === 'datetime' && (
              <>
                <div className="oge-date-range-times">
                  {[0, 1].map((side) => (
                    <div className="oge-date-range-time-col" key={side}>
                      <div className="oge-date-range-time-head">
                        {side === 0
                          ? field.msg.rangeStartLabel
                          : field.msg.rangeEndLabel}
                      </div>
                      <div
                        className="oge-date-box-times"
                        role="listbox"
                        aria-label={
                          side === 0
                            ? field.msg.rangeStartLabel
                            : field.msg.rangeEndLabel
                        }
                      >
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.minutes}
                            type="button"
                            className={[
                              'oge-date-box-time',
                              isSideTimeSelected(side, slot.minutes) &&
                                'oge-date-box-time-selected',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            role="option"
                            aria-selected={isSideTimeSelected(
                              side,
                              slot.minutes,
                            )}
                            onClick={() => pickSideTime(side, slot.minutes)}
                          >
                            {slot.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="oge-date-box-actions">
                  <button
                    type="button"
                    className="oge-date-box-action"
                    onClick={() => {
                      close();
                      startInputRef.current?.focus();
                    }}
                  >
                    {field.msg.cancelButton}
                  </button>
                  <button
                    type="button"
                    className="oge-date-box-action oge-date-box-ok"
                    onClick={applyDraft}
                  >
                    {field.msg.okButton}
                  </button>
                </div>
              </>
            )}
          </div>
        </OgePopup>
      )}
    </span>
  );
});
