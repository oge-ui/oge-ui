// @oge-ui/inputs/field — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export {
  type OgeInputCounterState,
  type OgeInputRevealApi,
  type OgeInputCopyApi,
  type OgeInputSpinApi,
  type OgeInputDropDownApi,
} from './input-host';
export { OgeInputPrefix, OgeInputSuffix } from './input-slots';
export { resolveErrorMessage, formatPattern } from './error-messages';
export {
  type OgeInputLabelMode,
  type OgeInputStylingMode,
  type OgeInputSize,
  type OgeInputSubscriptSizing,
  type OgeInputErrorDisplay,
  type OgeInputCounterMode,
  type OgeInputShowSuccessIcon,
  type OgeTextBoxMode,
  type OgeNumberBoxMode,
  type OgeFieldError,
  type OgeInputRawEvent,
  type OgeInputValueCommittedEvent,
  type OgeInputKeyEvent,
  type OgeInputFocusEvent,
  type OgeMaskRule,
  type OgeMaskRules,
  type OgeMaskShowMode,
  type OgeMaskCompletedEvent,
} from './input-types';
export {
  provideOgeInputsConfig,
  OGE_INPUTS_CONFIG,
  OGE_DEFAULT_INPUTS_CONFIG,
  OGE_DEFAULT_INPUTS_MESSAGES,
  type OgeInputsConfig,
  type OgeInputsConfigInput,
  type OgeInputsMessages,
} from './config';
// shared with sibling entry points; not re-exported by @oge-ui/inputs
export { OgeControlBase } from './control-base';
export { OgeFieldChrome } from './field-chrome';
export { graphemeCount } from './grapheme';
export { OgeInputBase } from './input-base';
export { OGE_INPUT_HOST } from './input-host';
