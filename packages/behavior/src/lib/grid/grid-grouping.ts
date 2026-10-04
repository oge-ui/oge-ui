import { ogeNumberFormat, type GroupInterval } from '@oge-ui/core';
import { formatPattern } from '../input/error-messages';
import type { OgeDataType } from './grid-columns';
import { formatCellValue } from './grid-header-filter';

/** The catalog patterns {@link ogeGroupValueText} reads. */
export interface OgeGroupIntervalMessages {
  groupWeekPattern: string;
  groupQuarterPattern: string;
  groupRangePattern: string;
}

/**
 * A group row's value caption, aware of the column's `groupInterval`: a
 * week bucket reads `Week of <date>`, a quarter `Q2 2026`, an hour bucket
 * the date and time, a numeric bucket `100 – 200` (the upper bound is the
 * next bucket's start, as the half-open filter range is), and everything
 * else the cell format of the key.
 */
export function ogeGroupValueText(
  value: unknown,
  column: {
    readonly dataType: OgeDataType;
    readonly format?: ((value: unknown) => string) | undefined;
    /** Locale dates and numbers render in (the column's). */
    readonly locale?: string | undefined;
  },
  interval: GroupInterval | undefined,
  messages: OgeGroupIntervalMessages,
): string {
  const locale = column.locale;
  if (typeof interval === 'number' && typeof value === 'number') {
    return formatPattern(messages.groupRangePattern, {
      from: formatCellValue(value, column.dataType, column.format, locale),
      to: formatCellValue(
        value + interval,
        column.dataType,
        column.format,
        locale,
      ),
    });
  }
  if (value instanceof Date) {
    if (interval === 'week') {
      return formatPattern(messages.groupWeekPattern, {
        date: formatCellValue(value, 'date', undefined, locale),
      });
    }
    if (interval === 'quarter') {
      return formatPattern(messages.groupQuarterPattern, {
        quarter: ogeNumberFormat(locale).format(
          Math.floor(value.getMonth() / 3) + 1,
        ),
        year: ogeNumberFormat(locale, { useGrouping: false }).format(
          value.getFullYear(),
        ),
      });
    }
    if (interval === 'hour') {
      return column.format
        ? column.format(value)
        : formatCellValue(value, 'datetime', undefined, locale);
    }
  }
  return formatCellValue(value, column.dataType, column.format, locale);
}
