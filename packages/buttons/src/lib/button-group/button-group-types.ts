import type { OgeButtonSeverity } from '../button/button-types';

/** How an `oge-button-group` tracks selection. */
export type OgeButtonGroupSelectionMode = 'none' | 'single' | 'multiple';

/**
 * Data-driven alternative to declarative `<oge-button>` children.
 * Icons require declarative children (`[ogeButtonIcon]` projection).
 */
export interface OgeButtonGroupItem {
  /** Selection key of the item; also the `value` of the rendered button. */
  value: string;
  text?: string;
  hint?: string;
  disabled?: boolean;
  /** Overrides the group's `severity` for this item. */
  severity?: OgeButtonSeverity;
  badge?: string | number | boolean;
}

/** Payload of the group's `itemClick` output. */
export interface OgeButtonGroupItemClickEvent {
  /** `value` of the clicked button; `undefined` for buttons without one. */
  value: string | undefined;
  event: MouseEvent | KeyboardEvent;
  /** The matching `items` entry when the group is data-driven. */
  item?: OgeButtonGroupItem;
  /** DOM-order index of the clicked button; `-1` when unresolvable. */
  index: number;
}

/** Payload of the group's `selectionChanged` output. */
export interface OgeButtonGroupSelectionChangedEvent {
  selectedKeys: readonly string[];
  addedKeys: readonly string[];
  removedKeys: readonly string[];
}
