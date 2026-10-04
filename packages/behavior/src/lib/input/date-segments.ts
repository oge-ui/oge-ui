/**
 * Masked (segmented) date entry — DevExtreme's `useMaskBehavior`, Kendo's
 * DateInput, MUI's field sections — as one framework-free machine shared by
 * both render layers (ADR 0001).
 *
 * The field text is a sequence of editable segments (day, month, year,
 * hour, minute, second, AM/PM) and literals, in the locale's own order and
 * with its own separators: the template comes from
 * `Intl.DateTimeFormat#formatToParts` (Gregorian calendar, Latin digits), so
 * `dd.MM.yyyy`, `MM/dd/yyyy` and `yyyy-MM-dd` are never hard-coded.
 *
 * Interaction: digits fill the active segment and auto-advance once no
 * further digit could fit (`2` in a month → `02`, then the next segment);
 * ArrowUp/ArrowDown step the active segment with wrap-around (an empty one
 * starts at the reference date's part); ArrowLeft/ArrowRight move between
 * segments (mirrored under RTL); Home/End jump to the ends; Backspace/Delete
 * clear the segment (a whole-text selection clears everything); a typed
 * separator moves on; `a`/`p` (or the locale's first letters) set AM/PM.
 * Ctrl/Meta/Alt combinations, Tab, Enter and Escape are left to the host.
 *
 * The machine is a plain non-reactive class: the host calls `key()` /
 * `focusAt()` / `setDate()`, then writes `text` and `activeRange()` back
 * into the native input and stores the text in its own reactive state.
 */
import type { OgeDateBoxType } from './calendar-core';
import type { OgeInputsMessages } from './input-config';
import { dayPeriodLabels, resolveHour12 } from './time-parts';

/** An editable part of the masked text. */
export type OgeDateSegmentKind =
  'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'dayPeriod';

/** Placeholder text per segment while it is empty (from the messages catalog). */
export type OgeDateSegmentPlaceholders = Readonly<
  Record<OgeDateSegmentKind, string>
>;

/** The empty-segment placeholders out of the inputs messages catalog. */
export function dateSegmentPlaceholders(
  messages: OgeInputsMessages,
): OgeDateSegmentPlaceholders {
  return {
    year: messages.segmentYear,
    month: messages.segmentMonth,
    day: messages.segmentDay,
    hour: messages.segmentHour,
    minute: messages.segmentMinute,
    second: messages.segmentSecond,
    dayPeriod: messages.segmentDayPeriod,
  };
}

export interface OgeDateSegmentOptions {
  readonly locale: string | undefined;
  readonly type: OgeDateBoxType;
  /** `undefined` = the locale's clock. */
  readonly hour12?: boolean;
  readonly showSeconds?: boolean;
  readonly placeholders: OgeDateSegmentPlaceholders;
}

/** A rendered segment with its character range in `text`. */
export interface OgeDateSegment {
  readonly kind: OgeDateSegmentKind;
  readonly start: number;
  readonly end: number;
  readonly empty: boolean;
}

/** The structural slice of a keyboard event the machine reads. */
export interface OgeDateSegmentKey {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * `empty` — no segment filled; `incomplete` — some filled; `invalid` — all
 * filled but no such date (Feb 30, month 00); `complete` — `date` is set.
 */
export type OgeDateSegmentState =
  'empty' | 'incomplete' | 'invalid' | 'complete';

type TemplatePart =
  | { readonly kind: OgeDateSegmentKind }
  | { readonly kind: 'literal'; readonly text: string };

const SEGMENT_KINDS: readonly OgeDateSegmentKind[] = [
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'dayPeriod',
];

function twoDigitYear(value: number): number {
  return value < 50 ? 2000 + value : 1900 + value;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * The locale's segment template for an editor type — e.g. en-US date →
 * `month / day / year`, de-DE → `day . month . year`.
 */
export function dateSegmentTemplate(
  locale: string | undefined,
  type: OgeDateBoxType,
  hour12: boolean,
  showSeconds: boolean,
): TemplatePart[] {
  const date: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const time: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  };
  const options: Intl.DateTimeFormatOptions =
    type === 'date' ? date : type === 'time' ? time : { ...date, ...time };
  const parts = new Intl.DateTimeFormat(locale, {
    ...options,
    calendar: 'gregory',
    numberingSystem: 'latn',
  }).formatToParts(new Date(2001, 10, 22, 13, 45, 30));
  const template: TemplatePart[] = [];
  for (const part of parts) {
    if ((SEGMENT_KINDS as readonly string[]).includes(part.type)) {
      template.push({ kind: part.type as OgeDateSegmentKind });
    } else if (part.type === 'literal') {
      const last = template[template.length - 1];
      if (last && last.kind === 'literal') {
        template[template.length - 1] = {
          kind: 'literal',
          text: last.text + part.value,
        };
      } else {
        template.push({ kind: 'literal', text: part.value });
      }
    }
  }
  return template;
}

export class OgeDateSegmentCore {
  private template: TemplatePart[] = [];
  private editable: OgeDateSegmentKind[] = [];
  private hour12 = false;
  private periods: readonly [string, string] = ['AM', 'PM'];
  private options!: OgeDateSegmentOptions;
  private readonly values: Partial<Record<OgeDateSegmentKind, number>> = {};
  /** Digits typed into the active segment since it became active. */
  private buffer = '';
  private activeIndex = 0;

  constructor(options: OgeDateSegmentOptions) {
    this.configure(options);
  }

  /** Re-derives the template (locale/type/clock change); keeps the date. */
  configure(options: OgeDateSegmentOptions): void {
    const previous = this.options ? this.read(null) : null;
    this.options = options;
    this.hour12 = resolveHour12(options.locale, options.hour12);
    this.periods = dayPeriodLabels(options.locale);
    this.template = dateSegmentTemplate(
      options.locale,
      options.type,
      this.hour12,
      options.showSeconds ?? false,
    );
    this.editable = this.template
      .filter((part) => part.kind !== 'literal')
      .map((part) => part.kind as OgeDateSegmentKind);
    this.activeIndex = Math.min(this.activeIndex, this.editable.length - 1);
    if (previous?.date) this.setDate(previous.date);
  }

  /** Segment kinds in text order. */
  get kinds(): readonly OgeDateSegmentKind[] {
    return this.editable;
  }

  /** The active segment's kind. */
  get activeKind(): OgeDateSegmentKind {
    return this.editable[this.activeIndex];
  }

  /** `true` while no segment holds a value. */
  get isEmpty(): boolean {
    return this.editable.every((kind) => this.values[kind] === undefined);
  }

  /** Loads a date into every segment (`null` clears them). */
  setDate(date: Date | null): void {
    this.buffer = '';
    for (const kind of SEGMENT_KINDS) delete this.values[kind];
    if (date === null) return;
    const hours = date.getHours();
    this.values.year = date.getFullYear();
    this.values.month = date.getMonth() + 1;
    this.values.day = date.getDate();
    this.values.hour = this.hour12 ? hours % 12 || 12 : hours;
    this.values.minute = date.getMinutes();
    this.values.second = date.getSeconds();
    this.values.dayPeriod = hours >= 12 ? 1 : 0;
  }

  clear(): void {
    this.setDate(null);
  }

  /** The masked text — placeholders for empty segments. */
  get text(): string {
    return this.render().text;
  }

  /** Every segment with its character range. */
  get segments(): readonly OgeDateSegment[] {
    return this.render().segments;
  }

  /** `[start, end]` of the active segment — the host selects it. */
  activeRange(): [number, number] {
    const segment = this.segments[this.activeIndex];
    return segment ? [segment.start, segment.end] : [0, 0];
  }

  /** Activates the segment under (or nearest before) a caret position. */
  focusAt(caret: number): void {
    const segments = this.segments;
    let index = 0;
    for (let i = 0; i < segments.length; i++) {
      if (caret >= segments[i].start) index = i;
    }
    // a caret on a literal right after a segment belongs to the next one
    const current = segments[index];
    if (current && caret > current.end && index < segments.length - 1) {
      index++;
    }
    this.activate(index);
  }

  focusFirst(): void {
    this.activate(0);
  }

  focusLast(): void {
    this.activate(this.editable.length - 1);
  }

  /**
   * Applies one key press. Returns `true` when the machine consumed it (the
   * host calls `preventDefault()` and re-renders), `false` to let it through.
   * `selection` is the native selection — a whole-text selection makes
   * Backspace/Delete clear every segment.
   */
  key(
    event: OgeDateSegmentKey,
    selection?: readonly [number, number],
    rtl = false,
    reference?: Date | null,
  ): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    const { key } = event;
    switch (key) {
      case 'ArrowLeft':
        this.move(rtl ? 1 : -1);
        return true;
      case 'ArrowRight':
        this.move(rtl ? -1 : 1);
        return true;
      case 'Home':
        this.focusFirst();
        return true;
      case 'End':
        this.focusLast();
        return true;
      case 'ArrowUp':
        this.step(1, reference);
        return true;
      case 'ArrowDown':
        this.step(-1, reference);
        return true;
      case 'Backspace':
      case 'Delete': {
        const text = this.text;
        if (
          selection &&
          selection[1] - selection[0] >= text.length &&
          text.length > 0
        ) {
          this.clear();
          this.focusFirst();
          return true;
        }
        const kind = this.activeKind;
        if (this.values[kind] === undefined && key === 'Backspace') {
          this.move(-1);
        }
        delete this.values[this.activeKind];
        this.buffer = '';
        return true;
      }
    }
    if (key.length !== 1) return false; // Tab, Enter, Escape, F-keys…
    if (/[0-9]/.test(key)) {
      this.typeDigit(Number(key));
      return true;
    }
    if (/\p{L}/u.test(key)) {
      if (this.activeKind === 'dayPeriod') this.typePeriodLetter(key);
      return true; // letters never land in the text
    }
    // a typed separator moves on once the segment holds something
    if (this.values[this.activeKind] !== undefined) this.move(1);
    return true;
  }

  /**
   * Reads the segments as a date. `reference` supplies the day of a
   * `type: 'time'` editor (the current value's day, else today).
   */
  read(reference: Date | null): {
    state: OgeDateSegmentState;
    date: Date | null;
  } {
    const filled = this.editable.filter(
      (kind) => this.values[kind] !== undefined,
    );
    if (filled.length === 0) return { state: 'empty', date: null };
    if (filled.length < this.editable.length) {
      return { state: 'incomplete', date: null };
    }
    const ref = reference ?? new Date();
    const v = this.values;
    const hasDate = this.editable.includes('day');
    const hasTime = this.editable.includes('hour');
    let year = hasDate ? (v.year ?? 0) : ref.getFullYear();
    if (hasDate && year < 100) year = twoDigitYear(year);
    const month = hasDate ? (v.month ?? 0) : ref.getMonth() + 1;
    const day = hasDate ? (v.day ?? 0) : ref.getDate();
    let hour = hasTime ? (v.hour ?? 0) : 0;
    if (hasTime && this.hour12) {
      if (hour < 1 || hour > 12) return { state: 'invalid', date: null };
      hour = (hour % 12) + (v.dayPeriod === 1 ? 12 : 0);
    }
    const minute = hasTime ? (v.minute ?? 0) : 0;
    const second =
      hasTime && this.editable.includes('second') ? (v.second ?? 0) : 0;
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > daysInMonth(year, month) ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    ) {
      return { state: 'invalid', date: null };
    }
    const date = new Date(year, month - 1, day, hour, minute, second);
    // years 0–99 through the constructor land in 1900–1999 — pin the year
    if (year < 100) date.setFullYear(year);
    return { state: 'complete', date };
  }

  // --- internals -------------------------------------------------------------

  private render(): { text: string; segments: OgeDateSegment[] } {
    let text = '';
    const segments: OgeDateSegment[] = [];
    for (const part of this.template) {
      if (part.kind === 'literal') {
        text += part.text;
        continue;
      }
      const value = this.values[part.kind];
      const shown =
        value === undefined
          ? this.options.placeholders[part.kind]
          : this.display(part.kind, value);
      segments.push({
        kind: part.kind,
        start: text.length,
        end: text.length + shown.length,
        empty: value === undefined,
      });
      text += shown;
    }
    return { text, segments };
  }

  private display(kind: OgeDateSegmentKind, value: number): string {
    if (kind === 'dayPeriod') return this.periods[value === 1 ? 1 : 0];
    if (kind === 'year') return String(value).padStart(4, '0');
    return String(value).padStart(2, '0');
  }

  private activate(index: number): void {
    const next = Math.max(0, Math.min(index, this.editable.length - 1));
    if (next !== this.activeIndex) this.buffer = '';
    this.activeIndex = next;
  }

  private move(delta: number): void {
    this.activate(this.activeIndex + delta);
    this.buffer = '';
  }

  private bounds(kind: OgeDateSegmentKind): [number, number] {
    switch (kind) {
      case 'year':
        return [1, 9999];
      case 'month':
        return [1, 12];
      case 'day': {
        const { year, month } = this.values;
        return [
          1,
          month !== undefined && month >= 1 && month <= 12
            ? daysInMonth(year ?? 2000, month)
            : 31,
        ];
      }
      case 'hour':
        return this.hour12 ? [1, 12] : [0, 23];
      case 'minute':
      case 'second':
        return [0, 59];
      case 'dayPeriod':
        return [0, 1];
    }
  }

  private typeDigit(digit: number): void {
    const kind = this.activeKind;
    if (kind === 'dayPeriod') return;
    const maxLength = kind === 'year' ? 4 : 2;
    const [, max] = kind === 'day' ? [1, 31] : this.bounds(kind);
    let buffer = this.buffer + String(digit);
    if (Number(buffer) > max) buffer = String(digit);
    this.buffer = buffer;
    this.values[kind] = Number(buffer);
    if (buffer.length >= maxLength || Number(buffer) * 10 > max) {
      this.buffer = '';
      if (this.activeIndex < this.editable.length - 1) this.activeIndex++;
    }
  }

  private typePeriodLetter(letter: string): void {
    const folded = letter.toLocaleLowerCase();
    const [am, pm] = this.periods.map((p) => p.toLocaleLowerCase());
    if (folded === 'a' || am.startsWith(folded)) this.values.dayPeriod = 0;
    else if (folded === 'p' || pm.startsWith(folded)) this.values.dayPeriod = 1;
  }

  private step(dir: 1 | -1, reference?: Date | null): void {
    const kind = this.activeKind;
    this.buffer = '';
    const current = this.values[kind];
    if (current === undefined) {
      // an empty segment starts from the reference (today) — DevExtreme
      const ref = reference ?? new Date();
      const hours = ref.getHours();
      const start: Record<OgeDateSegmentKind, number> = {
        year: ref.getFullYear(),
        month: ref.getMonth() + 1,
        day: ref.getDate(),
        hour: this.hour12 ? hours % 12 || 12 : hours,
        minute: ref.getMinutes(),
        second: ref.getSeconds(),
        dayPeriod: hours >= 12 ? 1 : 0,
      };
      this.values[kind] = start[kind];
      return;
    }
    const [min, max] = this.bounds(kind);
    let next = current + dir;
    if (next > max) next = min;
    if (next < min) next = max;
    this.values[kind] = next;
  }
}
