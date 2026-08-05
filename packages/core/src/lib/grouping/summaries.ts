import type { SummaryDescriptor, SummaryValue } from '../data/load-options';
import { compareValues } from '../util/comparators';
import { createFieldAccessor } from '../util/value-accessor';

function computeOne<T>(rows: readonly T[], descriptor: SummaryDescriptor): unknown {
  if (descriptor.type === 'count') return rows.length;
  const accessor = createFieldAccessor<T>(descriptor.field);
  switch (descriptor.type) {
    case 'sum':
    case 'avg': {
      let sum = 0;
      let count = 0;
      for (const row of rows) {
        const value = accessor(row);
        if (typeof value === 'number' && !Number.isNaN(value)) {
          sum += value;
          count += 1;
        }
      }
      if (descriptor.type === 'sum') return sum;
      return count === 0 ? null : sum / count;
    }
    case 'min':
    case 'max': {
      let best: unknown = null;
      const direction = descriptor.type === 'min' ? -1 : 1;
      for (const row of rows) {
        const value = accessor(row);
        if (value == null) continue;
        if (best == null || Math.sign(compareValues(value, best)) === direction) best = value;
      }
      return best;
    }
  }
}

/** Computes summary values for a set of rows (used per group and for grid totals). */
export function computeSummaries<T>(
  rows: readonly T[],
  descriptors: readonly SummaryDescriptor[]
): SummaryValue[] {
  return descriptors.map((descriptor) => ({
    field: descriptor.field,
    type: descriptor.type,
    value: computeOne(rows, descriptor),
  }));
}
