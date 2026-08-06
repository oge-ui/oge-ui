import type { PivotFieldConfig, PivotPath } from './pivot-types';

/** Slot metadata the display pass needs for every visible matrix line. */
export interface PivotSlot {
  readonly path: PivotPath;
  /** Axis-field depth of the slot's node (-1 for the grand-total slot). */
  readonly level: number;
  /** `pathKey` of the parent group, null at the top level. */
  readonly parentKey: string | null;
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/**
 * Applies `summaryDisplayMode` / `runningTotal` post-processing in place.
 * Runs on the already-materialized visible matrix, so its cost is bounded by
 * the visible cell count.
 */
export function applyDisplayModes(
  values: unknown[][][],
  rowSlots: readonly PivotSlot[],
  columnSlots: readonly PivotSlot[],
  measures: readonly PivotFieldConfig[]
): void {
  const grandRow = rowSlots.findIndex((slot) => slot.isGrandTotal);
  const grandColumn = columnSlots.findIndex((slot) => slot.isGrandTotal);

  /** Nearest ancestor total slot on an axis (fallback: the grand slot). */
  const totalIndexByKey = (slots: readonly PivotSlot[]): Map<string, number> => {
    const map = new Map<string, number>();
    slots.forEach((slot, index) => {
      if (slot.isTotal) map.set(JSON.stringify(slot.path.map(String)), index);
    });
    return map;
  };
  const rowTotalByKey = totalIndexByKey(rowSlots);
  const columnTotalByKey = totalIndexByKey(columnSlots);
  const parentTotal = (
    slot: PivotSlot,
    byKey: Map<string, number>,
    grand: number
  ): number => {
    for (let cut = slot.path.length - 1; cut >= 1; cut--) {
      const key = JSON.stringify(slot.path.slice(0, cut).map(String));
      const index = byKey.get(key);
      if (index !== undefined) return index;
    }
    return grand;
  };

  measures.forEach((measure, m) => {
    const mode = measure.summaryDisplayMode ?? 'none';
    const running = measure.runningTotal;

    if (running) {
      if (running.direction === 'column') {
        // accumulate left→right along the column axis, per row
        for (let r = 0; r < rowSlots.length; r++) {
          let sum = 0;
          let group: string | null = null;
          for (let c = 0; c < columnSlots.length; c++) {
            const slot = columnSlots[c];
            if (slot.isTotal || slot.isGrandTotal) continue;
            if (!running.allowCrossGroupVariation && slot.parentKey !== group) {
              group = slot.parentKey;
              sum = 0;
            }
            const value = asNumber(values[r][c][m]);
            if (value !== null) {
              sum += value;
              values[r][c][m] = sum;
            }
          }
        }
      } else {
        // accumulate top→bottom along the row axis, per column
        for (let c = 0; c < columnSlots.length; c++) {
          let sum = 0;
          let group: string | null = null;
          for (let r = 0; r < rowSlots.length; r++) {
            const slot = rowSlots[r];
            if (slot.isTotal || slot.isGrandTotal) continue;
            if (!running.allowCrossGroupVariation && slot.parentKey !== group) {
              group = slot.parentKey;
              sum = 0;
            }
            const value = asNumber(values[r][c][m]);
            if (value !== null) {
              sum += value;
              values[r][c][m] = sum;
            }
          }
        }
      }
    }

    if (mode === 'none') return;

    if (mode === 'absoluteVariation' || mode === 'percentVariation') {
      // difference vs. the previous visible (non-total) column, per row
      for (let r = 0; r < rowSlots.length; r++) {
        let previous: number | null = null;
        const line = values[r];
        const next: (unknown | undefined)[] = [];
        for (let c = 0; c < columnSlots.length; c++) {
          const slot = columnSlots[c];
          if (slot.isTotal || slot.isGrandTotal) {
            next[c] = null;
            continue;
          }
          const value = asNumber(line[c][m]);
          if (previous === null || value === null) {
            next[c] = null;
          } else {
            next[c] =
              mode === 'absoluteVariation'
                ? value - previous
                : previous === 0
                  ? null
                  : (value - previous) / previous;
          }
          if (value !== null) previous = value;
        }
        for (let c = 0; c < columnSlots.length; c++) line[c][m] = next[c] ?? null;
      }
      return;
    }

    // percent-of-* family: divide by the relevant total cell
    const valid = (pair: [number, number]): [number, number] | null =>
      pair[0] >= 0 && pair[1] >= 0 ? pair : null;
    const denominatorIndex = (r: number, c: number): [number, number] | null => {
      switch (mode) {
        case 'percentOfGrandTotal':
          return valid([grandRow, grandColumn]);
        case 'percentOfColumnGrandTotal':
          return valid([grandRow, c]);
        case 'percentOfRowGrandTotal':
          return valid([r, grandColumn]);
        case 'percentOfColumnTotal':
          return valid([parentTotal(rowSlots[r], rowTotalByKey, grandRow), c]);
        case 'percentOfRowTotal':
          return valid([r, parentTotal(columnSlots[c], columnTotalByKey, grandColumn)]);
        default:
          return null;
      }
    };

    const snapshot = values.map((line) => line.map((cell) => cell[m]));
    for (let r = 0; r < rowSlots.length; r++) {
      for (let c = 0; c < columnSlots.length; c++) {
        const target = denominatorIndex(r, c);
        const value = asNumber(snapshot[r][c]);
        if (!target || value === null) {
          values[r][c][m] = null;
          continue;
        }
        const denominator = asNumber(snapshot[target[0]][target[1]]);
        values[r][c][m] = denominator === null || denominator === 0 ? null : value / denominator;
      }
    }
  });
}
