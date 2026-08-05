import type { RowKey } from '../rows/row-node';
import type { GridStateSnapshot } from './grid-state-snapshot';

/**
 * Serializable snapshot of the user-driven tree-list state. Same shape as
 * the grid snapshot minus row grouping (a tree list has none), plus row
 * expansion. Plain data — no framework types.
 */
export interface TreeListStateSnapshot extends Omit<
  GridStateSnapshot,
  'group'
> {
  expansion?: {
    /**
     * Keys toggled away from the default polarity: collapsed keys when
     * `autoExpandAll` is on, expanded keys when it is off.
     */
    toggled: RowKey[];
  };
}
