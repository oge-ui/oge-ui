import { OgeGridFilterState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Filter state slice combining three sources into one expression: per-column
 * filter-row filters, Excel-style header-filter selections and the global
 * search text (the latter travels separately as `LoadOptions.searchText`).
 *
 * The combination rules live in `@oge-ui/behavior`'s `OgeGridFilterState`
 * (ADR 0001); this class is the Angular seam.
 */
export class FilterSlice extends OgeGridFilterState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
