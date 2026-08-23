import { OgeGridGroupingState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Row grouping state slice: group descriptors + summary configuration.
 *
 * The descriptor rules live in `@oge-ui/behavior`'s `OgeGridGroupingState`
 * (ADR 0001); this class is the Angular seam.
 */
export class GroupingSlice extends OgeGridGroupingState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
