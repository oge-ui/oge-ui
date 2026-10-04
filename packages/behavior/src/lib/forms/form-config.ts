/**
 * Every user-facing string and behavioral default of the forms family, shared
 * by both render layers (ADR 0001). Angular's `provideOgeFormsConfig()` and
 * React's `<OgeFormsConfigProvider>` merge over these exact values.
 */
import { ogeFormatMessage, warnOgeDeprecatedMessage } from '@oge-ui/core';
import type { OgeFormLabelLocation } from './form-types';

export interface OgeFormsMessages {
  /** Marker appended to the label of a required item. */
  requiredMark: string;
  /** Marker appended to the label of an optional item when `showOptionalMark`. */
  optionalMark: string;
  /** Screen-reader text for the required mark. */
  requiredLabel: string;
  /** Screen-reader text for the optional mark. */
  optionalLabel: string;
  /** Separator drawn after a label when `showColonAfterLabel`. */
  labelColon: string;
  /**
   * Heading of the validation summary — an ICU plural over the error count
   * (`ogeFormatMessage`): `'{count, plural, one {# field needs…} other {…}}'`.
   * A plain `{count}` pattern works too.
   */
  validationSummaryTitle: string;
  /**
   * @deprecated Put the singular into `validationSummaryTitle` as an ICU
   * plural branch. Still honoured for exactly one invalid field (with a
   * dev-mode warning) until the next minor.
   */
  validationSummaryTitleOne?: string;
  /** Accessible label of the validation summary region. */
  validationSummaryLabel: string;
  /** Fallback message for an invalid field with no resolvable error text. */
  invalidError: string;
  /** Label of the built-in submit button. */
  submitButton: string;
  /** Label of the built-in reset button. */
  resetButton: string;
  /** Announced while an async submit handler is in flight. */
  submitting: string;
  /** Shown in place of the fields when no visible item resolves. */
  noItems: string;
}

export const OGE_DEFAULT_FORMS_MESSAGES: OgeFormsMessages = {
  requiredMark: '*',
  optionalMark: 'optional',
  requiredLabel: 'required',
  optionalLabel: 'optional',
  labelColon: ':',
  validationSummaryTitle:
    '{count, plural, one {# field needs your attention} other {# fields need your attention}}',
  validationSummaryLabel: 'Validation summary',
  invalidError: 'This value is invalid',
  submitButton: 'Submit',
  resetButton: 'Reset',
  submitting: 'Submitting…',
  noItems: 'No fields to display',
};

/** Application-wide defaults for the forms family. */
export interface OgeFormsConfig {
  messages: OgeFormsMessages;
  /** Default for the `labelLocation` input. */
  labelLocation?: OgeFormLabelLocation;
  /** Default for the `minColWidth` input, in pixels. */
  minColWidth?: number;
  /** Default for the `showRequiredMark` input. */
  showRequiredMark?: boolean;
  /** Default for the `showOptionalMark` input. */
  showOptionalMark?: boolean;
  /** Default for the `showColonAfterLabel` input. */
  showColonAfterLabel?: boolean;
}

export const OGE_DEFAULT_FORMS_CONFIG: OgeFormsConfig = {
  messages: OGE_DEFAULT_FORMS_MESSAGES,
};

export type OgeFormsConfigInput = Partial<Omit<OgeFormsConfig, 'messages'>> & {
  messages?: Partial<OgeFormsMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeFormsConfig(
  input: OgeFormsConfigInput | undefined,
): OgeFormsConfig {
  const { messages, ...rest } = input ?? {};
  return {
    ...OGE_DEFAULT_FORMS_CONFIG,
    ...rest,
    messages: { ...OGE_DEFAULT_FORMS_MESSAGES, ...messages },
  };
}

/**
 * The summary heading for an error count, through `ogeFormatMessage` so the
 * plural form is the locale's (`locale` unset = the runtime default). A
 * catalog still supplying the deprecated `validationSummaryTitleOne` keeps it
 * for exactly one error.
 */
export function validationSummaryTitle(
  count: number,
  messages: OgeFormsMessages,
  locale?: string,
): string {
  const legacyOne = messages.validationSummaryTitleOne;
  if (legacyOne !== undefined) {
    warnOgeDeprecatedMessage(
      'validationSummaryTitleOne',
      'validationSummaryTitle',
    );
    if (count === 1) return ogeFormatMessage(legacyOne, { count }, locale);
  }
  return ogeFormatMessage(messages.validationSummaryTitle, { count }, locale);
}
