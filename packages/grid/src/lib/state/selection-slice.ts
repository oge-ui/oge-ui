import { OgeGridSelectionState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

export type { OgeGridSelectionMode as OgeSelectionMode } from '@oge-ui/behavior';

/**
 * Selection state slice. Only data rows are selectable; range selection runs
 * over the flat list of *data-row keys* supplied by the grid, so group and
 * detail rows never break a shift-range.
 *
 * The anchor/range rules live in `@oge-ui/behavior`'s `OgeGridSelectionState`
 * (ADR 0001); this class is the Angular seam.
 */
export class SelectionSlice extends OgeGridSelectionState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
