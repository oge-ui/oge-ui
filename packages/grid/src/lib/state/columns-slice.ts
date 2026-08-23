import { OgeGridColumnsState } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

export type { OgePinOverride as PinOverride } from '@oge-ui/behavior';

/**
 * UI-only column state: user-driven width, order and pin overrides.
 *
 * The reorder and clamping rules live in `@oge-ui/behavior`'s
 * `OgeGridColumnsState` (ADR 0001); this class is the Angular seam.
 */
export class ColumnsSlice extends OgeGridColumnsState {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
