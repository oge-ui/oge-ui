'use client';

import type { OgeInputShowSuccessIcon } from '@oge-ui/behavior';

/**
 * The three field-chrome extras every oge React *field* editor carries — the
 * React face of the members the Angular `OgeInputBase` gives its subclasses
 * (text box, text area, number box, select box, tag box, autocomplete, date
 * box, date range box, color box). The toggle-style controls and the sliders
 * extend `OgeControlBase` instead and deliberately have none of them.
 */
export interface OgeFieldExtrasProps {
  /** Success icon when valid: `false` / on touch / always. */
  showSuccessIcon?: OgeInputShowSuccessIcon;
  /** Selects the whole text when the input receives focus. */
  selectOnFocus?: boolean;
  /**
   * Escape hatch: extra attributes rendered onto the native input.
   * Attributes the component owns are ignored — see
   * {@link TEMPLATE_BOUND_ATTRS}.
   */
  inputAttr?: Record<string, string>;
}

/** Attributes owned by the components — `inputAttr` may not override them. */
export const TEMPLATE_BOUND_ATTRS = new Set([
  'id',
  'type',
  'value',
  'disabled',
  'readonly',
  'placeholder',
  'title',
  'tabindex',
  'name',
  'maxlength',
  'minlength',
  'spellcheck',
  'autocomplete',
  'inputmode',
  'enterkeyhint',
  'autocapitalize',
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-invalid',
  'aria-required',
  'aria-expanded',
  'aria-controls',
  'aria-haspopup',
  'aria-autocomplete',
  'aria-activedescendant',
]);

/** The `inputAttr` entries that are safe to spread onto the native input. */
export function nativeInputAttrs(
  inputAttr: Record<string, string> | undefined,
): Record<string, string> {
  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputAttr ?? {})) {
    if (!TEMPLATE_BOUND_ATTRS.has(key.toLowerCase())) extra[key] = value;
  }
  return extra;
}

/** Field state the success icon derives from. */
export interface SuccessIconState {
  pending: boolean;
  invalid: boolean;
  empty: boolean;
  touched: boolean;
}

/**
 * Whether the chrome shows its success icon: never while pending, invalid or
 * empty; `'always'` shows as soon as the field is valid, `'touched'` waits
 * for the first blur — the exact rule the Angular field chrome applies.
 */
export function successIconVisible(
  showSuccessIcon: OgeInputShowSuccessIcon | undefined,
  state: SuccessIconState,
): boolean {
  if (!showSuccessIcon || state.pending || state.invalid || state.empty) {
    return false;
  }
  return showSuccessIcon === 'always' || state.touched;
}
