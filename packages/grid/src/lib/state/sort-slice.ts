import { OgeGridSortState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Sort state slice: read-only signals + intent methods.
 *
 * The asc → desc → none cycle (and its `additive` / `allowUnsorting`
 * variations) lives in `@oge-ui/behavior`'s `OgeGridSortState` since ADR
 * 0001's grid phase, shared verbatim with the React grid; this class is the
 * Angular seam.
 */
export class SortSlice extends OgeGridSortState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
