/**
 * Axis tick-label text: the `label.format` (function or `Intl` options),
 * the legacy `labelFormat`, the built-in Intl defaults per axis kind and
 * the `label.template` wrapper (`'{value} km'`). Intl-only (house rule).
 * Pure.
 */
import type { ChartScaleKind, TimeTickUnit } from './scale';
import type { OgeChartAxisOptions } from './charts-types';
import { numberFormat, siFormat, timeTickFormatter } from './tick-format';

/** Fills `{value}` (every occurrence) of a label template. */
export function applyChartLabelTemplate(
  template: string | undefined,
  text: string,
): string {
  return template === undefined ? text : template.split('{value}').join(text);
}

/** The argument axis' tick label text for a tick value. */
export function chartArgumentLabelFormatter(
  axis: OgeChartAxisOptions,
  argKind: ChartScaleKind,
  categories: readonly unknown[],
  tickUnit: TimeTickUnit | undefined,
  locale: string | undefined,
): (tick: number) => string {
  const format = axis.label?.format ?? axis.labelFormat;
  const template = axis.label?.template;
  let base: (tick: number) => string;
  if (typeof format === 'function') {
    base = (tick) =>
      format(
        argKind === 'category'
          ? categories[tick]
          : argKind === 'time'
            ? new Date(tick)
            : tick,
      );
  } else if (format !== undefined && argKind === 'time') {
    const intl = new Intl.DateTimeFormat(
      locale,
      format as Intl.DateTimeFormatOptions,
    );
    base = (tick) => intl.format(new Date(tick));
  } else if (format !== undefined && argKind !== 'category') {
    const intl = new Intl.NumberFormat(
      locale,
      format as Intl.NumberFormatOptions,
    );
    base = (tick) => intl.format(tick);
  } else if (argKind === 'category') {
    base = (tick) => String(categories[tick] ?? '');
  } else if (argKind === 'time') {
    base = timeTickFormatter(tickUnit ?? 'day', locale);
  } else {
    base = (tick) => numberFormat(tick, locale);
  }
  return template === undefined
    ? base
    : (tick) => applyChartLabelTemplate(template, base(tick));
}

/** A value axis' tick label text (SI-abbreviated unless `abbreviate: false`). */
export function chartValueLabelFormatter(
  axis: OgeChartAxisOptions,
  locale: string | undefined,
): (value: number) => string {
  const format = axis.label?.format ?? axis.labelFormat;
  const template = axis.label?.template;
  let base: (value: number) => string;
  if (typeof format === 'function') {
    base = (value) => format(value);
  } else if (format !== undefined) {
    const intl = new Intl.NumberFormat(
      locale,
      format as Intl.NumberFormatOptions,
    );
    base = (value) => intl.format(value);
  } else if (axis.abbreviate === false) {
    base = (value) => numberFormat(value, locale);
  } else {
    base = (value) => siFormat(value, locale);
  }
  return template === undefined
    ? base
    : (value) => applyChartLabelTemplate(template, base(value));
}
