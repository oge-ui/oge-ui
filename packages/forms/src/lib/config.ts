import { InjectionToken, type Provider } from '@angular/core';
import type { OgeFormLabelLocation } from './form/form-types';

/**
 * Every user-facing string in the forms family — override globally via
 * `provideOgeFormsConfig({ messages: {...} })` or per component via
 * `[messages]`.
 */
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
  /** Heading of the validation summary; `{count}` is the error count. */
  validationSummaryTitle: string;
  /** Heading of the validation summary when exactly one field is invalid. */
  validationSummaryTitleOne: string;
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
  validationSummaryTitle: '{count} fields need your attention',
  validationSummaryTitleOne: '1 field needs your attention',
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

export const OGE_FORMS_CONFIG = new InjectionToken<OgeFormsConfig>(
  'OGE_FORMS_CONFIG',
  {
    factory: () => OGE_DEFAULT_FORMS_CONFIG,
  },
);

export type OgeFormsConfigInput = Partial<Omit<OgeFormsConfig, 'messages'>> & {
  messages?: Partial<OgeFormsMessages>;
};

/**
 * Application-wide forms defaults. Message overrides are shallow-merged over
 * the built-in English strings, so partial translations are fine.
 */
export function provideOgeFormsConfig(config: OgeFormsConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_FORMS_CONFIG,
    useValue: {
      ...OGE_DEFAULT_FORMS_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_FORMS_MESSAGES, ...messages },
    } satisfies OgeFormsConfig,
  };
}
