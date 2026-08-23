import { OgeGridPagingState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Paging state slice. A `null` page size means paging is off.
 *
 * The skip/take arithmetic lives in `@oge-ui/behavior`'s `OgeGridPagingState`
 * (ADR 0001); this class is the Angular seam.
 */
export class PagingSlice extends OgeGridPagingState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
