import {
  OgeGridEditingState,
  type OgeEditFormItem,
  type OgeEditMode,
  type OgeEditingOptions,
} from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

export type { OgeEditFormItem, OgeEditMode, OgeEditingOptions };

/**
 * Editing state slice: which editor is open plus the pending (batch) change
 * set. Pending changes are UI state — they reach the DataSource only on save.
 *
 * Since ADR 0001's grid phase the state machine is `@oge-ui/behavior`'s
 * `OgeGridEditingState`, shared verbatim with the React grid; this class is
 * the Angular seam and hands it `signal()`/`computed()` as its reactivity, so
 * every member keeps driving change detection as before.
 */
export class OgeEditingSlice extends OgeGridEditingState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
