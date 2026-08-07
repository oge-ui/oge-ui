import type { SummaryType } from '../data/load-options';
import { compareValues } from '../util/comparators';

/**
 * Distributive measure accumulator: cheap to update per row and to merge
 * bottom-up for subtotals. `avg` derives from sum/count; `custom` reducers
 * run separately over the cell's row lists.
 */
export interface PivotAcc {
  sum: number;
  numCount: number;
  count: number;
  min: unknown;
  max: unknown;
}

export function createAcc(): PivotAcc {
  return { sum: 0, numCount: 0, count: 0, min: null, max: null };
}

export function accumulate(acc: PivotAcc, value: unknown): void {
  acc.count += 1;
  if (typeof value === 'number' && !Number.isNaN(value)) {
    acc.sum += value;
    acc.numCount += 1;
  }
  if (value != null) {
    if (acc.min == null || compareValues(value, acc.min) < 0) acc.min = value;
    if (acc.max == null || compareValues(value, acc.max) > 0) acc.max = value;
  }
}

export function mergeAcc(target: PivotAcc, source: PivotAcc): void {
  target.sum += source.sum;
  target.numCount += source.numCount;
  target.count += source.count;
  if (
    source.min != null &&
    (target.min == null || compareValues(source.min, target.min) < 0)
  ) {
    target.min = source.min;
  }
  if (
    source.max != null &&
    (target.max == null || compareValues(source.max, target.max) > 0)
  ) {
    target.max = source.max;
  }
}

/** Final value of a distributive accumulator for the given summary type. */
export function accValue(acc: PivotAcc, type: SummaryType): unknown {
  switch (type) {
    case 'sum':
      return acc.sum;
    case 'count':
      return acc.count;
    case 'avg':
      return acc.numCount === 0 ? null : acc.sum / acc.numCount;
    case 'min':
      return acc.min;
    case 'max':
      return acc.max;
    case 'custom':
      return null; // resolved via CustomSummaryMap over the cell's rows
  }
}
