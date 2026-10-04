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
import { withInputWidth } from './field-extras';
import {
  OgeDateSegmentCore,
  dateSegmentPlaceholders,
  dayPeriodColumnOptions,
  hourColumnOptions,
  isDayDisabled,
  isTimePartSelected,
  minuteColumnOptions,
  nowForType,
  parseDateText,
  startOfDay,
  timeDisplayOptions,
  toLocalDate,
  withTimePart,
  type OgeTimeColumnOption,
  type OgeTimePart,
  type OgeCalendarDisabledDates,
  type OgeCalendarWeekNumberOptions,
  type OgeCalendarZoomLevel,
  type OgeDateBoxApplyValueMode,
  type OgeDateBoxDisplayFormat,
  type OgeDateBoxTimeView,
  type OgeDateBoxType,
} from '@oge-ui/behavior';
import {
  OgePopup,
  useAnchoredPanel,
  useOgeOverlayConfig,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import { OgeCalendar, type OgeCalendarCellContext } from './calendar';
import { OgeFieldChrome } from './field-chrome';
import {
  nativeInputAttrs,
  successIconVisible,
  type OgeFieldExtrasProps,
} from './field-extras';
import { useOgeField, type OgeControlProps } from './use-field';
import { useAdaptivePopup, type OgeAdaptiveProps } from './adaptive';
import { useOgeInputsConfig } from './inputs-config';

interface TimeSlot {
  minutes: number;
  text: string;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeDateBoxHandle {
  focus(): void;
  blur(): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
}

export interface OgeDateBoxProps
  extends OgeAdaptiveProps, OgeControlProps<Date | null>, OgeFieldExtrasProps {
  type?: OgeDateBoxType;
  /** Display text — `Intl.DateTimeFormatOptions` or a formatter; `undefined` = per-type default. */
  displayFormat?: OgeDateBoxDisplayFormat;
  /** First selectable day; typing an earlier date marks the field invalid (never clamps). */
  min?: Date;
  /** Last selectable day; typing a later date marks the field invalid (never clamps). */
  max?: Date;
  /** Individual unselectable days: an array or a predicate. */
  disabledDates?: OgeCalendarDisabledDates;
  /** Time list step in minutes (`time`/`datetime`). */
  interval?: number;
  /** Time picker layout: one interval list (default) or hour + minute columns. */
  timeView?: OgeDateBoxTimeView;
  /**
   * Clock of the display text and the time picker. `true` adds an AM/PM
   * column to `timeView: 'columns'`; `false` forces 24-hour; `undefined`
   * (default) follows the locale with a single 24-entry hour column.
   */
  hour12?: boolean;
  /** Seconds in the display text, a seconds column and the masked entry. */
  showSeconds?: boolean;
  /** "Today" footer button (`date`/`datetime`) — picks today's day. */
  showTodayButton?: boolean;
  /** "Now" footer button (`time`/`datetime`) — picks the current time. */
  showNowButton?: boolean;
  /**
   * Segment entry instead of free text (DevExtreme `useMaskBehavior`): the
   * field shows the locale's numeric pattern, digits fill the active
   * segment and auto-advance, ArrowUp/Down step it, ArrowLeft/Right move
   * between segments and Alt+ArrowDown opens the picker. `displayFormat` is
   * not used while it is on.
   */
  useMaskBehavior?: boolean;
  /** Picker commit policy: on pick (default) or via the OK/Cancel footer. */
  applyValueMode?: OgeDateBoxApplyValueMode;
  /** Clicking the field opens the picker. */
  openOnFieldClick?: boolean;
  /** `false` makes the text read-only — picker input only. */
  acceptCustomValue?: boolean;
  dropdownPlacement?: OgePopupPlacement;
  /** `0`–`6` (Sunday-first); `undefined` resolves from the locale. */
  firstDayOfWeek?: number;
  /** Week-number column of the embedded calendar. */
  showWeekNumbers?: boolean | OgeCalendarWeekNumberOptions;
  /** Initial drill level of the embedded calendar. */
  zoomLevel?: OgeCalendarZoomLevel;
  /** Custom calendar cell rendering. */
  renderCalendarCell?: (context: OgeCalendarCellContext) => ReactNode;
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
 * Date/time editor on the shared oge field chrome — the React render of the
 * Angular `<oge-date-box>`: typed text parses locale-aware through `Intl`
 * (never `Date.parse`) via the shared `@oge-ui/behavior` parser, the picker is
 * an embedded `<OgeCalendar>` (and/or an interval time list), and the value is
 * always a local `Date | null` — serialization is the app's concern.
 *
 * The popup follows the APG date-picker-dialog pattern: DOM focus moves INTO
 * the calendar grid on open and Escape restores it to the input. Unparseable
 * or out-of-range text shows the invalid state while typing and reverts to the
 * committed value on blur — a wrong date is never committed. `useMaskBehavior`
 * swaps free typing for the shared segment machine; `hour12`/`showSeconds`
 * shape the time picker; `showTodayButton`/`showNowButton` add shortcuts.
 *
 * ```tsx
 * <OgeDateBox label="Start" value={start} onValueChange={setStart} />
 * <OgeDateBox label="Meeting" type="datetime" interval={15} value={at} onValueChange={setAt} />
 * ```
 */
export const OgeDateBox = forwardRef<OgeDateBoxHandle, OgeDateBoxProps>(
  function OgeDateBoxRender(props, ref) {
    const {
      type = 'date',
      displayFormat,
      min,
      max,
      disabledDates,
      interval = 30,
      timeView = 'list',
      hour12,
      showSeconds = false,
      showTodayButton = false,
      showNowButton = false,
      useMaskBehavior = false,
      applyValueMode = 'instantly',
      openOnFieldClick = true,
      acceptCustomValue = true,
      firstDayOfWeek,
      showWeekNumbers = false,
      zoomLevel = 'month',
      renderCalendarCell,
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
    const nativeRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const timeListRef = useRef<HTMLDivElement>(null);

    const locale = props.locale ?? config.locale;

    const formatter = ((): ((date: Date) => string) => {
      if (typeof displayFormat === 'function') return displayFormat;
      const options: Intl.DateTimeFormatOptions =
        displayFormat ?? timeDisplayOptions(type, hour12, showSeconds);
      const format = new Intl.DateTimeFormat(locale, options);
      return (date: Date) => format.format(date);
    })();

    const adaptive = useAdaptivePopup(props, 'fullscreen');
    const field = useOgeField<Date | null>({
      props,
      emptyValue: null,
      isEmpty: (value) => value === null,
      parseErrorMessage: (msg) => {
        if (min || max) {
          return msg.dateOutOfRangeError
            .replace('{min}', min ? formatter(min) : '…')
            .replace('{max}', max ? formatter(max) : '…');
        }
        return msg.invalidDateError;
      },
      focusNative: () => nativeRef.current?.focus(),
    });
    const readonly = props.readonly ?? false;
    // lenient writes: ISO-like strings and epoch numbers land as LOCAL dates
    // (grid rows often store `yyyy-MM-dd` strings)
    const value = toLocalDate(field.value);

    /** Uncommitted typed text; `null` = show the formatted value. */
    const [text, setText] = useState<string | null>(null);
    /** Popup draft (useButtons collects picks here before OK). */
    const [draft, setDraft] = useState<Date | null>(null);

    // --- opened (controlled/uncontrolled) -----------------------------------

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
      text,
      draft,
      value,
      type,
      maskDirty: false,
    });
    latest.current = {
      props,
      field,
      opened,
      text,
      draft,
      value,
      type,
      maskDirty: latest.current?.maskDirty ?? false,
    };

    const setOpened = (next: boolean): void => {
      if (latest.current.props.opened === undefined) {
        setUncontrolledOpened(next);
      }
      latest.current.props.onOpenedChange?.(next);
    };

    // An external programmatic write resets uncommitted text — the Angular
    // `onValueWritten` rule.
    const lastValue = useRef(props.value);
    useEffect(() => {
      if (props.value !== undefined && lastValue.current !== props.value) {
        resetTyping();
      }
      lastValue.current = props.value;
    }, [props.value]);

    // --- masked entry (`useMaskBehavior`) ---------------------------------

    const maskRef = useRef<{ core: OgeDateSegmentCore; key: string } | null>(
      null,
    );
    /** `true` while the segments hold an uncommitted edit. */
    const [maskDirty, setMaskDirty] = useState(false);
    /** Bumped after every segment edit — the core itself is not reactive. */
    const [, setMaskRevision] = useState(0);
    const maskOptions = {
      locale,
      type,
      hour12,
      showSeconds,
      placeholders: dateSegmentPlaceholders(field.msg),
    };
    const maskKey = JSON.stringify(maskOptions);
    if (useMaskBehavior) {
      if (!maskRef.current) {
        maskRef.current = {
          core: new OgeDateSegmentCore(maskOptions),
          key: maskKey,
        };
      } else if (maskRef.current.key !== maskKey) {
        maskRef.current.core.configure(maskOptions);
        maskRef.current.key = maskKey;
      }
      // idempotent, so StrictMode's double render is harmless
      if (!maskDirty) maskRef.current.core.setDate(value);
    }
    const mask = (): OgeDateSegmentCore =>
      (maskRef.current as { core: OgeDateSegmentCore }).core;

    const inputText = useMaskBehavior
      ? mask().isEmpty && !field.focused
        ? ''
        : mask().text
      : (text ?? (value === null ? '' : formatter(value)));

    /** Drops uncommitted typing (free text and segments alike). */
    const resetTyping = (): void => {
      setText(null);
      latest.current.maskDirty = false;
      setMaskDirty(false);
      field.setParseInvalid(false);
    };

    // --- time slots ---------------------------------------------------------

    const timeSlots: TimeSlot[] = (() => {
      if (type === 'date') return [];
      const step = Math.max(1, interval);
      const format = new Intl.DateTimeFormat(
        locale,
        timeDisplayOptions('time', hour12, showSeconds),
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
    })();

    // Columns-mode clock: AM/PM column only for an explicit `hour12: true`.
    const columnHour12 = hour12 === true;
    const timeColumns: {
      part: OgeTimePart;
      label: string;
      options: OgeTimeColumnOption[];
    }[] = (() => {
      if (type === 'date' || timeView !== 'columns') return [];
      const columns = [
        {
          part: 'hour' as const,
          label: field.msg.hourColumnLabel,
          options: hourColumnOptions(locale, hour12),
        },
        {
          part: 'minute' as const,
          label: field.msg.minuteColumnLabel,
          options: minuteColumnOptions(interval),
        },
      ];
      const extra: {
        part: OgeTimePart;
        label: string;
        options: OgeTimeColumnOption[];
      }[] = [];
      if (showSeconds) {
        extra.push({
          part: 'second',
          label: field.msg.secondColumnLabel,
          options: minuteColumnOptions(1),
        });
      }
      if (columnHour12) {
        extra.push({
          part: 'dayPeriod',
          label: field.msg.dayPeriodColumnLabel,
          options: dayPeriodColumnOptions(locale),
        });
      }
      return [...columns, ...extra];
    })();

    const working = draft ?? value;

    const isTimeSelected = (slot: TimeSlot): boolean =>
      working !== null &&
      working.getHours() * 60 + working.getMinutes() === slot.minutes;
    const isPartSelected = (part: OgeTimePart, option: number): boolean =>
      isTimePartSelected(working, part, option, columnHour12);

    const scrollTimeListToSelection = (): void => {
      setTimeout(() => {
        timeListRef.current
          ?.querySelector('.oge-date-box-time-selected')
          ?.scrollIntoView?.({ block: 'nearest' });
      });
    };

    // --- panel --------------------------------------------------------------

    const panel = useAnchoredPanel({
      // anchor on the bordered container, not the host — the host also holds
      // the label and subscript, which the popup must ignore
      anchor: () =>
        hostRef.current?.querySelector<HTMLElement>('.oge-input-container') ??
        hostRef.current,
      panel: () => popupRef.current,
      placement: () => latest.current.props.dropdownPlacement ?? 'bottom-start',
      width: () => undefined as unknown as number | 'anchor',
      offset: () => overlayConfig.offset,
      viewportPadding: () => overlayConfig.viewportPadding,
      restoreFocus: () => nativeRef.current?.focus(),
      onClosed: () => {
        if (openedRef.current) setOpened(false);
      },
    });
    const panelRef = useRef(panel);
    panelRef.current = panel;

    // Tracks what we have already announced: the panel machine can close
    // itself (Escape, outside click), so `machine.isOpen` alone would miss
    // those closes and never run the teardown.
    const announcedOpen = useRef(false);
    useEffect(() => {
      const machine = panelRef.current;
      if (opened) {
        if (!machine.isOpen) machine.open();
        if (announcedOpen.current) return;
        announcedOpen.current = true;
        setDraft(latest.current.value);
        // APG date-picker-dialog: DOM focus moves INTO the picker
        setTimeout(() => {
          const popup = popupRef.current;
          const target =
            popup?.querySelector<HTMLElement>('[data-focus-target]') ??
            popup?.querySelector<HTMLElement>('.oge-date-box-time-selected') ??
            popup?.querySelector<HTMLElement>('.oge-date-box-time');
          target?.focus();
          scrollTimeListToSelection();
        });
        latest.current.props.onDropDownOpened?.();
      } else {
        if (machine.isOpen) machine.close('api');
        if (!announcedOpen.current) return;
        announcedOpen.current = false;
        setDraft(null);
        latest.current.props.onDropDownClosed?.();
      }
    }, [opened, panel.isOpen]);

    // --- open/close ---------------------------------------------------------

    const open = (): void => {
      if (field.effectiveDisabled || latest.current.props.readonly) return;
      setOpened(true);
    };
    const close = (): void => setOpened(false);
    const toggle = (): void => (openedRef.current ? close() : open());

    // --- typing -------------------------------------------------------------

    const dayBlocked = (date: Date): boolean =>
      isDayDisabled(
        date,
        latest.current.props.min,
        latest.current.props.max,
        latest.current.props.disabledDates,
      );

    const parseTyped = (raw: string): Date | null => {
      const parsed = parseDateText(
        raw,
        locale,
        latest.current.type,
        latest.current.value ?? new Date(),
      );
      if (parsed === null) return null;
      if (latest.current.type !== 'time' && dayBlocked(parsed)) return null;
      return parsed;
    };

    /** Writes the masked text + active-segment selection into the input. */
    const syncMask = (): void => {
      const core = mask();
      const el = nativeRef.current;
      if (el) {
        // write before the state so React sees an unchanged value and
        // leaves the selection on the active segment
        el.value = core.text;
        const [start, end] = core.activeRange();
        try {
          el.setSelectionRange(start, end);
        } catch {
          // detached / hidden input — selection is best-effort
        }
      }
      setMaskRevision((n) => n + 1);
      const { state, date } = core.read(latest.current.value);
      field.setParseInvalid(
        state === 'invalid' ||
          (state === 'complete' &&
            date !== null &&
            latest.current.type !== 'time' &&
            dayBlocked(date)),
      );
    };

    /** Commits complete segments; incomplete/invalid ones revert. */
    const commitMask = (event?: Event): void => {
      if (!latest.current.maskDirty) return;
      const { state, date } = mask().read(latest.current.value);
      resetTyping();
      if (state === 'empty') {
        field.commit.commitNow(null, event);
      } else if (
        state === 'complete' &&
        date !== null &&
        (latest.current.type === 'time' || !dayBlocked(date))
      ) {
        field.commit.commitNow(date, event);
      }
      setMaskRevision((n) => n + 1);
    };

    const maskEditable = useMaskBehavior && acceptCustomValue;

    /** Mask keys; `true` when the segment machine consumed the key. */
    const maskKeydown = (event: ReactKeyboardEvent): boolean => {
      if (!maskEditable) return false;
      const el = nativeRef.current;
      if (!el) return false;
      const rtl = getComputedStyle(el).direction === 'rtl';
      const handled = mask().key(
        event,
        [el.selectionStart ?? 0, el.selectionEnd ?? 0],
        rtl,
        latest.current.value,
      );
      if (!handled) return false;
      event.preventDefault();
      latest.current.maskDirty = true;
      setMaskDirty(true);
      syncMask();
      return true;
    };

    /** Commits the typed text; unparseable/blocked text reverts to the value. */
    const commitTypedText = (event?: Event): void => {
      if (useMaskBehavior) {
        commitMask(event);
        return;
      }
      const raw = latest.current.text;
      if (raw === null) return;
      resetTyping();
      if (raw.trim() === '') {
        field.commit.commitNow(null, event);
        return;
      }
      const parsed = parseTyped(raw);
      if (parsed !== null) field.commit.commitNow(parsed, event);
      // parsed === null → revert: inputText falls back to the formatted value
    };

    const onKeydown = (event: ReactKeyboardEvent): void => {
      if (field.effectiveDisabled || latest.current.props.readonly) return;
      if (maskKeydown(event)) return;
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          if (!openedRef.current) open();
          return;
        }
        case 'Enter': {
          commitTypedText(event.nativeEvent);
          if (openedRef.current) close();
          field.handleEnterKey(event);
          return;
        }
        case 'Escape': {
          // the panel machine closes the popup; second Escape reverts
          // uncommitted text
          if (
            !openedRef.current &&
            (latest.current.text !== null || latest.current.maskDirty)
          ) {
            event.preventDefault();
            latest.current.maskDirty = false;
            resetTyping();
            if (useMaskBehavior) {
              mask().setDate(latest.current.value);
              syncMask();
            }
          }
          return;
        }
      }
    };

    // --- picker -------------------------------------------------------------

    /** Picked day + the time-of-day of the current draft/value. */
    const mergeDay = (day: Date): Date => {
      const time = latest.current.draft ?? latest.current.value;
      return new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        latest.current.type === 'date' ? 0 : (time?.getHours() ?? 0),
        latest.current.type === 'date' ? 0 : (time?.getMinutes() ?? 0),
        latest.current.type === 'date' || !showSeconds
          ? 0
          : (time?.getSeconds() ?? 0),
      );
    };

    /** Picked time-of-day + the day of the draft/value (today for bare times). */
    const mergeTime = (minutes: number): Date => {
      const base =
        latest.current.draft ?? latest.current.value ?? startOfDay(new Date());
      return new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        Math.floor(minutes / 60),
        minutes % 60,
      );
    };

    const onCalendarPick = (picked: Date | null, event?: Event): void => {
      if (picked === null) return;
      const merged = mergeDay(picked);
      if (applyValueMode === 'useButtons') {
        setDraft(merged);
        return;
      }
      field.commit.commitNow(merged, event);
      resetTyping();
      if (latest.current.type === 'date') {
        close();
        nativeRef.current?.focus();
      } else {
        setDraft(merged);
        scrollTimeListToSelection();
      }
    };

    const pickTime = (slot: TimeSlot, event: Event): void => {
      const merged = mergeTime(slot.minutes);
      if (applyValueMode === 'useButtons') {
        setDraft(merged);
        return;
      }
      field.commit.commitNow(merged, event);
      resetTyping();
      close();
      nativeRef.current?.focus();
    };

    /** Column picks commit live and keep the popup open (close by OK/outside). */
    const applyColumnPick = (next: Date, event: Event): void => {
      setDraft(next);
      if (applyValueMode === 'useButtons') return;
      field.commit.commitNow(next, event);
      resetTyping();
    };

    const pickPart = (
      part: OgeTimePart,
      option: number,
      event: Event,
    ): void => {
      const base =
        latest.current.draft ?? latest.current.value ?? startOfDay(new Date());
      applyColumnPick(
        withTimePart(base, part, option, columnHour12, showSeconds),
        event,
      );
    };

    const todayVisible = showTodayButton && type !== 'time';
    const nowVisible = showNowButton && type !== 'date';
    const todayBlocked = isDayDisabled(
      startOfDay(new Date()),
      min,
      max,
      disabledDates,
    );

    const pickNow = (event: Event): void => {
      const now = nowForType(latest.current.type, showSeconds);
      if (applyValueMode === 'useButtons') {
        setDraft(now);
        return;
      }
      field.commit.commitNow(now, event);
      resetTyping();
      close();
      nativeRef.current?.focus();
    };

    const applyDraft = (event: { nativeEvent: Event }): void => {
      const current = latest.current.draft;
      if (current !== null) {
        field.commit.commitNow(current, event.nativeEvent);
        resetTyping();
      }
      close();
      nativeRef.current?.focus();
    };

    // --- blur ---------------------------------------------------------------

    const onBlur = (event: ReactFocusEvent): void => {
      // focus moving into the picker dialog is not a real blur
      const related = event.relatedTarget as Node | null;
      if (related && hostRef.current?.contains(related)) return;
      // nor is the adaptive dialog taking focus (the field goes inert)
      if (openedRef.current && adaptive.active) return;
      commitTypedText();
      if (openedRef.current) close();
      field.handleBlur(event);
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        blur: () => nativeRef.current?.blur(),
        open,
        close,
        toggle,
        clear: () => field.clear(),
      }),
      [],
    );

    // --- render -------------------------------------------------------------

    const floatUp = field.focused || !field.isEmpty || opened;
    const placeholderText =
      labelMode === 'floating' && label && !floatUp ? '' : placeholder;

    const describedBy = (() => {
      const parts: string[] = [];
      if (subscriptSizing !== 'none') {
        if (field.showError && field.resolvedErrorText) {
          parts.push(field.ids.errorId);
        } else if (hint) parts.push(field.ids.hintId);
      }
      return parts.length ? parts.join(' ') : undefined;
    })();

    const successVisible = successIconVisible(showSuccessIcon, {
      pending: props.pending ?? false,
      invalid: field.effectiveInvalid,
      empty: field.isEmpty,
      touched: field.effectiveTouched,
    });
    const extraAttrs = nativeInputAttrs(inputAttr);

    const hostClasses = [
      'oge-input',
      'oge-date-box',
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

    const timeButton = (
      key: string | number,
      text: string,
      selected: boolean,
      onClick: (event: Event) => void,
    ) => (
      <button
        key={key}
        type="button"
        role="option"
        className={[
          'oge-date-box-time',
          selected && 'oge-date-box-time-selected',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-selected={selected}
        onClick={(event) => onClick(event.nativeEvent)}
      >
        {text}
      </button>
    );

    return (
      <span
        ref={hostRef}
        className={hostClasses}
        style={withInputWidth(style, props.width)}
      >
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
              icon: type === 'time' ? 'clock' : 'calendar',
            },
          }}
          prefix={prefix}
          suffix={suffix}
        >
          <input
            {...extraAttrs}
            ref={nativeRef}
            className="oge-input-native"
            type="text"
            role="combobox"
            aria-haspopup="dialog"
            aria-autocomplete="none"
            autoComplete="off"
            id={field.ids.inputId}
            value={inputText}
            placeholder={placeholderText}
            disabled={field.effectiveDisabled}
            readOnly={readonly || !acceptCustomValue}
            name={props.name || undefined}
            title={props.tooltip}
            tabIndex={props.tabIndex ?? 0}
            autoFocus={props.autofocus}
            aria-expanded={opened}
            aria-controls={opened ? panel.panelId : undefined}
            aria-label={labelMode === 'hidden' && label ? label : undefined}
            aria-labelledby={
              labelMode !== 'hidden' && label ? field.ids.labelId : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={field.showError ? true : undefined}
            aria-required={props.required ? true : undefined}
            onPaste={(event) => {
              if (!maskEditable || readonly) return;
              event.preventDefault();
              const parsed = parseTyped(
                event.clipboardData?.getData('text') ?? '',
              );
              if (parsed === null) return;
              mask().setDate(parsed);
              latest.current.maskDirty = true;
              setMaskDirty(true);
              syncMask();
            }}
            onChange={(event) => {
              const raw = event.target.value;
              if (useMaskBehavior) {
                // keys are handled on keydown; whatever still reached the
                // text (autofill, a mobile keyboard, IME) is read whole
                const parsed = parseTyped(raw);
                if (parsed !== null) mask().setDate(parsed);
                latest.current.maskDirty = true;
                setMaskDirty(true);
                syncMask();
                props.onInputChange?.({ text: raw, event: event.nativeEvent });
                return;
              }
              setText(raw);
              props.onInputChange?.({ text: raw, event: event.nativeEvent });
              field.setParseInvalid(
                raw.trim() !== '' && parseTyped(raw) === null,
              );
            }}
            onClick={() => {
              if (field.effectiveDisabled || readonly) return;
              if (maskEditable) {
                const el = nativeRef.current;
                if (el) mask().focusAt(el.selectionStart ?? 0);
                syncMask();
              }
              if (!openedRef.current && openOnFieldClick) open();
            }}
            onKeyDown={onKeydown}
            onFocus={(event) => {
              if (maskEditable && !readonly) {
                mask().focusFirst();
                syncMask();
              } else if (selectOnFocus) nativeRef.current?.select();
              field.handleFocus(event);
            }}
            onBlur={onBlur}
          />
        </OgeFieldChrome>
        {opened && (
          <OgePopup
            panel={panel}
            ref={popupRef}
            adaptive={adaptive.presentation}
            adaptiveTitle={label || field.msg.calendarLabel}
            closeLabel={field.msg.adaptiveClose}
          >
            {/* adaptive: the full-screen surface around it is the dialog */}
            <div
              className="oge-date-box-panel"
              role={adaptive.active ? undefined : 'dialog'}
              aria-label={
                adaptive.active ? undefined : label || field.msg.calendarLabel
              }
            >
              <div className="oge-date-box-pickers">
                {type !== 'time' && (
                  <OgeCalendar
                    className="oge-date-box-calendar"
                    value={draft}
                    onValueCommitted={(event) =>
                      onCalendarPick(event.value, event.event)
                    }
                    min={min}
                    max={max}
                    disabledDates={disabledDates}
                    firstDayOfWeek={firstDayOfWeek}
                    showWeekNumbers={showWeekNumbers}
                    locale={props.locale}
                    zoomLevel={zoomLevel}
                    renderCell={renderCalendarCell}
                  />
                )}
                {type !== 'date' &&
                  (timeView === 'columns' ? (
                    <div ref={timeListRef} className="oge-date-box-columns">
                      {timeColumns.map((column) => (
                        <div
                          key={column.part}
                          className="oge-date-box-col"
                          role="listbox"
                          aria-label={column.label}
                        >
                          {column.options.map((option) =>
                            timeButton(
                              `${column.part}-${option.value}`,
                              option.text,
                              isPartSelected(column.part, option.value),
                              (event) =>
                                pickPart(column.part, option.value, event),
                            ),
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      ref={timeListRef}
                      className="oge-date-box-times"
                      role="listbox"
                      aria-label={field.msg.calendarLabel}
                    >
                      {timeSlots.map((slot) =>
                        timeButton(
                          slot.minutes,
                          slot.text,
                          isTimeSelected(slot),
                          (event) => pickTime(slot, event),
                        ),
                      )}
                    </div>
                  ))}
              </div>
              {(applyValueMode === 'useButtons' ||
                todayVisible ||
                nowVisible) && (
                <div className="oge-date-box-actions">
                  {todayVisible && (
                    <button
                      type="button"
                      className="oge-date-box-action oge-date-box-shortcut oge-date-box-today"
                      disabled={todayBlocked}
                      onClick={(event) =>
                        onCalendarPick(
                          startOfDay(new Date()),
                          event.nativeEvent,
                        )
                      }
                    >
                      {field.msg.todayButton}
                    </button>
                  )}
                  {nowVisible && (
                    <button
                      type="button"
                      className="oge-date-box-action oge-date-box-shortcut oge-date-box-now"
                      onClick={(event) => pickNow(event.nativeEvent)}
                    >
                      {field.msg.nowButton}
                    </button>
                  )}
                  {applyValueMode === 'useButtons' && (
                    <>
                      <span className="oge-date-box-actions-gap" />
                      <button
                        type="button"
                        className="oge-date-box-action oge-date-box-ok"
                        onClick={applyDraft}
                      >
                        {field.msg.okButton}
                      </button>
                      <button
                        type="button"
                        className="oge-date-box-action"
                        onClick={() => close()}
                      >
                        {field.msg.cancelButton}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </OgePopup>
        )}
      </span>
    );
  },
);
