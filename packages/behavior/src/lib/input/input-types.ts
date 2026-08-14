/**
 * The input vocabulary shared by both render layers (ADR 0001): string-union
 * modes and the error shape. The Angular package re-exports these from its
 * `field/input-types` so its import surface is unchanged.
 */

/** Where (and whether) the label renders relative to the field. */
export type OgeInputLabelMode = 'static' | 'floating' | 'hidden' | 'outside';

/** Field container fill style. */
export type OgeInputStylingMode = 'outlined' | 'filled' | 'underlined';

/** Control height preset — 28/34/42px, the button scale. */
export type OgeInputSize = 'sm' | 'md' | 'lg';

/** Subscript region behavior: reserved height, grow-as-needed, or none. */
export type OgeInputSubscriptSizing = 'fixed' | 'dynamic' | 'none';

/** When validation errors become visible. */
export type OgeInputErrorDisplay = 'touched' | 'dirty' | 'always';

/** Counter behavior: `limit` enforces natively, `soft` only displays. */
export type OgeInputCounterMode = 'limit' | 'soft';

/** Success icon visibility policy. */
export type OgeInputShowSuccessIcon = false | 'touched' | 'always';

/** A single validation error in the Signal-Forms shape both layers display. */
export interface OgeFieldError {
  readonly kind: string;
  readonly message?: string;
}
