// The shared vocabulary lives in `@oge-ui/behavior` (ADR 0001) so the React
// editors speak the exact same string unions; re-exported here unchanged so
// `@oge-ui/inputs` remains the Angular import path.
export type {
  OgeInputLabelMode,
  OgeInputStylingMode,
  OgeInputSize,
  OgeInputSubscriptSizing,
  OgeInputErrorDisplay,
  OgeInputCounterMode,
  OgeInputShowSuccessIcon,
  OgeFieldError,
} from '@oge-ui/behavior';

/** Native input types supported by the text box. */
export type OgeTextBoxMode =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

/** Underlying native type of the number box (`inputmode` is always decimal). */
export type OgeNumberBoxMode = 'text' | 'tel';

/** Raw per-keystroke payload of the `inputChange` output. */
export interface OgeInputRawEvent {
  text: string;
  event: Event;
}

/**
 * Payload of the `valueCommitted` output. `event` is the originating DOM
 * event for user-driven commits and `undefined` for programmatic changes
 * (form writes, `reset()`) — letting rules distinguish user edits from
 * programmatic writes.
 */
export interface OgeInputValueCommittedEvent<T> {
  value: T;
  previousValue: T;
  event: Event | undefined;
}

export interface OgeInputKeyEvent {
  event: KeyboardEvent;
}

export interface OgeInputFocusEvent {
  event: FocusEvent;
}
