import { OgePivotStateCore } from '@oge-ui/pivot-engine';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * UI state of a pivot grid: user-driven field layout overrides (on top of the
 * declared `<oge-pivot-field>` configuration), the expansion of both axes
 * (kept as key → path so remote contracts get real paths back) and the
 * field-panel collapse flag.
 *
 * Since ADR 0003 the rules live in `@oge-ui/pivot-engine`'s
 * `OgePivotStateCore`, shared verbatim with the React pivot; this class only
 * backs it with Angular signals.
 */
export class OgePivotStateStore extends OgePivotStateCore {
  constructor() {
    super(SIGNAL_ADAPTER);
  }
}
