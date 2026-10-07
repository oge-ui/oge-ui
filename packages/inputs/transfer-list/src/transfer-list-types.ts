import type {
  OgeListBoxReorderCause,
  OgeTransferListMoveCause,
  OgeTransferListSide,
} from '@oge-ui/behavior';

/** Payload of the cancelable `moving` pre-event. */
export interface OgeTransferListMovingEvent<TItem = unknown> {
  /** The items about to move. */
  items: TItem[];
  /** Their `valueExpr` results. */
  values: unknown[];
  /** The side they leave. */
  from: OgeTransferListSide;
  /** The side they join. */
  to: OgeTransferListSide;
  /** `'button'`, `'keyboard'` or `'drag'` — all three run the same move. */
  cause: OgeTransferListMoveCause;
  /** Set to `true` to veto the move. */
  cancel: boolean;
}

/** Payload of `moved` — items changed sides. */
export interface OgeTransferListMovedEvent<TItem = unknown> {
  items: TItem[];
  values: unknown[];
  from: OgeTransferListSide;
  to: OgeTransferListSide;
  cause: OgeTransferListMoveCause;
  /** The new value (the target side's values, in arrival order). */
  value: readonly unknown[];
}

/** Payload of the cancelable `reordering` — a reorder inside one list. */
export interface OgeTransferListReorderingEvent<TItem = unknown> {
  /** The list being reordered. */
  side: OgeTransferListSide;
  item: TItem;
  /** Index in that list before the move. */
  fromIndex: number;
  /** Index it lands at. */
  toIndex: number;
  /** `'keyboard'` (Alt+arrows), `'drag'` or `'api'`. */
  cause: OgeListBoxReorderCause;
  event: Event | undefined;
  /** Set to `true` to keep the order. */
  cancel: boolean;
}

/** Payload of `reordered` — an item moved inside one list. */
export interface OgeTransferListReorderedEvent<TItem = unknown> {
  side: OgeTransferListSide;
  item: TItem;
  fromIndex: number;
  toIndex: number;
  cause: OgeListBoxReorderCause;
  /** That list's items in the new order. */
  items: TItem[];
  /** The value after the reorder (a target reorder changes its order). */
  value: readonly unknown[];
  event: Event | undefined;
}
