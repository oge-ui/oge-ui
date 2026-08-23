// The modal vocabulary lives beside the shared helpers in `@oge-ui/behavior`
// (ADR 0001) so the React modal speaks the exact same events and reasons;
// re-exported so `@oge-ui/overlay` remains the Angular import path.
export type {
  OgeModalCloseReason,
  OgeModalOpeningEvent,
  OgeModalResizeEvent,
  OgeModalClosingEvent,
  OgeModalClosedEvent,
  OgeModalAutoFocus,
  OgeModalPlacement,
} from '@oge-ui/behavior';

/** Context of the `*ogeModalTitle` / `*ogeModalFooter` slots. */
export interface OgeModalSlotContext {
  /** Closes the modal (reason `'api'`); an argument becomes `closed.result`. */
  $implicit: (result?: unknown) => void;
}
