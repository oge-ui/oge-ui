/**
 * Where the label renders. `static` = inside the field, above the value;
 * `floating` = sits in the placeholder position and floats up on focus or
 * content; `hidden` = no visual label (aria-label only); `outside` =
 * conventional block label above the bordered box.
 */
export type OgeInputLabelMode = 'static' | 'floating' | 'hidden' | 'outside';

/** Border/background treatment of the field container. */
export type OgeInputStylingMode = 'outlined' | 'filled' | 'underlined';

/** Container height preset — 28/34/42px, matching the button scale. */
export type OgeInputSize = 'sm' | 'md' | 'lg';

/**
 * Subscript (hint/error/counter) region sizing. `fixed` reserves one line so
 * appearing errors never shift layout; `dynamic` collapses when empty;
 * `none` removes the region entirely (compact/grid-cell usage).
 */
export type OgeInputSubscriptSizing = 'fixed' | 'dynamic' | 'none';

/** When validation errors become visible. */
export type OgeInputErrorDisplay = 'touched' | 'dirty' | 'always';

/**
 * `limit` enforces `maxLength` via the native attribute; `soft` allows typing
 * past it and renders the counter in the danger color instead.
 */
export type OgeInputCounterMode = 'limit' | 'soft';

/** Success (valid) icon policy for the suffix rail. */
export type OgeInputShowSuccessIcon = false | 'touched' | 'always';

/** Native input types supported by the text box. */
export type OgeTextBoxMode =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

/** Underlying native type of the number box (`inputmode` is always decimal). */
export type OgeNumberBoxMode = 'text' | 'tel';

/**
 * One validation error — structural mirror of Signal Forms'
 * `ValidationError` so the public API has no type dependency on
 * `@angular/forms/signals`. Kind-specific detail fields (`min`,
 * `requiredLength`…) are read via runtime lookup.
 */
export interface OgeFieldError {
  readonly kind: string;
  readonly message?: string;
}

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
