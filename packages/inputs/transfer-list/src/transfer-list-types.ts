import type {
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
