// @oge-ui/inputs/transfer-list — secondary entry point. Importing a single
// editor from its own entry lets a bundler split the family per component;
// the primary '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeTransferList } from './transfer-list';
export {
  type OgeTransferListMovingEvent,
  type OgeTransferListMovedEvent,
} from './transfer-list-types';
export {
  type OgeTransferListSide,
  type OgeTransferListMoveCause,
} from '@oge-ui/behavior';
