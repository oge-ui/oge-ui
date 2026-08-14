// The variant vocabulary and the shorthand-or-options shapes live in
// `@oge-ui/behavior` so the React buttons cannot drift to a different set of
// severities or a different default guard window (ADR 0001). Re-exported here
// so `@oge-ui/buttons` consumers keep importing them from this package.
export type {
  OgeButtonStylingMode,
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonIconPosition,
  OgeClickGuardOptions,
  OgeHoldToConfirmOptions,
  OgeAutoRepeatOptions,
} from '@oge-ui/behavior';

/**
 * Payload of the `click` output. `event` is the raw DOM event — a
 * `KeyboardEvent` when the click was produced by Space/Enter during a
 * hold-to-confirm or auto-repeat gesture.
 */
export interface OgeButtonClickEvent {
  event: MouseEvent | KeyboardEvent;
}

/** Emitted when the `action` callback settles successfully. */
export interface OgeButtonActionDoneEvent {
  /** Resolved value of the action's promise (or its synchronous return value). */
  result: unknown;
}

/** Emitted when the `action` callback throws or rejects. */
export interface OgeButtonActionFailedEvent {
  error: unknown;
}
