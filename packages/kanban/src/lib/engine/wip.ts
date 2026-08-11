/**
 * Work-in-progress limit arithmetic: per-column counts, overflow state and
 * the +1 preview while a drag hovers a prospective target column. Pure.
 */

export interface KanbanWipState {
  /** Cards currently in the column (across all swimlanes). */
  readonly count: number;
  /** The configured limit; `null` = unlimited. */
  readonly limit: number | null;
  /** The configured lower bound; `null` = none. */
  readonly min: number | null;
  /** `count > limit` — drives the danger badge. */
  readonly exceeded: boolean;
  /** `count < min` — drives the warning badge. */
  readonly underfilled: boolean;
}

export function wipState(
  count: number,
  limit: number | undefined,
  minCount?: number,
): KanbanWipState {
  const effective = typeof limit === 'number' && limit > 0 ? limit : null;
  const min = typeof minCount === 'number' && minCount > 0 ? minCount : null;
  return {
    count,
    limit: effective,
    min,
    exceeded: effective !== null && count > effective,
    underfilled: min !== null && count < min,
  };
}

/**
 * The column count shown while a drag hovers `hoverColumn`: the target
 * previews +1, the origin previews -1 (unless they are the same column,
 * which nets zero). Keys compare by column only — a cross-lane move within
 * one column does not change its total.
 */
export function previewCount(
  count: number,
  column: string,
  fromColumn: string | null,
  hoverColumn: string | null,
): number {
  if (hoverColumn === null || fromColumn === hoverColumn) return count;
  if (column === hoverColumn) return count + 1;
  if (column === fromColumn) return count - 1;
  return count;
}
