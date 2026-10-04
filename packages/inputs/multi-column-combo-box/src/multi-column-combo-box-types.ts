import type { TemplateRef } from '@angular/core';
import type { OgeComboBoxColumnBase } from '@oge-ui/behavior';

/** Template context of a custom cell (`OgeComboBoxColumn.cellTemplate`). */
export interface OgeComboBoxCellTemplateContext<TItem> {
  /** The row item. */
  $implicit: TItem;
  /** The raw cell value (`column.field` read with dot-notation). */
  value: unknown;
  /** The formatted cell text. */
  text: string;
  /** Index of the row within the visible (filtered / loaded) list. */
  rowIndex: number;
}

/**
 * One popup column: `field`, `caption`, `width`, `format`, `searchable`,
 * `alignment`, `cssClass` (shared with the React layer) plus an optional
 * `cellTemplate`.
 */
export interface OgeComboBoxColumn<TItem> extends OgeComboBoxColumnBase<TItem> {
  /** Custom cell content (badges, avatars); the cell keeps its grid semantics. */
  readonly cellTemplate?: TemplateRef<OgeComboBoxCellTemplateContext<TItem>>;
}

/** One row or many. `multiple` makes `value` an array and renders chips. */
export type OgeMultiColumnComboBoxSelectionMode = 'single' | 'multiple';

/** Payload of `selectionChanged` — the selection after a commit and its delta. */
export interface OgeMultiColumnComboBoxSelectionChangedEvent<TItem> {
  selectedItems: readonly TItem[];
  addedItems: readonly TItem[];
  removedItems: readonly TItem[];
}

/** Payload of `rowClick` — a row was activated by click or keyboard. */
export interface OgeMultiColumnComboBoxRowClickEvent<TItem> {
  item: TItem;
  /** Index within the visible (filtered / loaded) list. */
  index: number;
  event: Event;
}
