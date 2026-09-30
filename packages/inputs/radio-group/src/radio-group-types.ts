/** Fired when a radio item is activated by click or keyboard. */
export interface OgeRadioGroupItemClickEvent<TItem = unknown> {
  readonly item: TItem;
  readonly index: number;
  readonly event: Event;
}

/** Layout of the radio items. */
export type OgeRadioGroupLayout = 'vertical' | 'horizontal';
