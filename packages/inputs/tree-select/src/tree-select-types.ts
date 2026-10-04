import type { RowKey } from '@oge-ui/navigation';

export type { RowKey };

/** How many nodes the tree select may commit. */
export type OgeTreeSelectSelectionMode = 'single' | 'multiple';

/** How a multiple-selection value is rendered in the closed field. */
export type OgeTreeSelectDisplayMode = 'text' | 'count';

/**
 * Whether the closed field shows the selection as text (`displayMode`
 * applies) or as removable chips.
 */
export type OgeTreeSelectShowSelectionAs = 'text' | 'chips';

/** Emitted after the committed value changed through the tree. */
export interface OgeTreeSelectSelectionChangedEvent {
  /** Selected keys after the change — a single key is still reported as an array. */
  readonly keys: readonly RowKey[];
  readonly previousKeys: readonly RowKey[];
}
