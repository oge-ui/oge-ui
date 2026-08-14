import type { OgeStepData, OgeStepState } from '@oge-ui/behavior';

// The stepper vocabulary and event payloads live framework-free in
// `@oge-ui/behavior` (`stepper-core`), shared with the React render layer;
// re-exported here so existing imports keep working.
export type {
  OgeStepperOrientation,
  OgeStepperDisplay,
  OgeStepState,
  OgeStepGuard,
  OgeStepData,
  OgeStepChangingEvent,
  OgeStepChangedEvent,
  OgeStepBlockedEvent,
  OgeStepperFinishEvent,
} from '@oge-ui/behavior';

/**
 * Context of `[ogeStepHeaderTemplate]` and `[ogeStepIndicatorTemplate]`.
 * Angular-only: `$implicit` is the template-outlet convention, so it has no
 * counterpart in the framework-free core (React takes render props instead).
 */
export interface OgeStepTemplateContext {
  /** The source `steps` entry — `undefined` for declarative children. */
  $implicit: OgeStepData | undefined;
  index: number;
  state: OgeStepState;
}
