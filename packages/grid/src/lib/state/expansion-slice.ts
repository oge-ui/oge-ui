import { OgeGridExpansionState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Expansion state slice. Groups default to expanded (a *collapsed* set is
 * tracked); master-detail rows default to collapsed (an *expanded* set).
 * Deliberately not part of LoadOptions — toggling re-runs only the flatten
 * step.
 *
 * The two-sets rule lives in `@oge-ui/behavior`'s `OgeGridExpansionState`
 * (ADR 0001); this class is the Angular seam.
 */
export class ExpansionSlice extends OgeGridExpansionState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
