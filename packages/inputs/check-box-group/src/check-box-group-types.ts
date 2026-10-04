export type { OgeCheckBoxGroupLayout } from '@oge-ui/behavior';

/** Fired when one check box of the group is toggled by the user. */
export interface OgeCheckBoxGroupItemClickEvent<TItem = unknown> {
  readonly item: TItem;
  readonly index: number;
  /** The item's new checked state. */
  readonly checked: boolean;
  readonly event: Event | undefined;
}

/** Fired when the "select all" box is toggled by the user. */
export interface OgeCheckBoxGroupSelectAllEvent {
  /** `true` — every selectable item was checked; `false` — all were unchecked. */
  readonly checked: boolean;
  readonly event: Event | undefined;
}
