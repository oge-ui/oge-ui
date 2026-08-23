export { OgeForm } from './lib/form';
export {
  OgeValidationSummary,
  type OgeValidationSummaryProps,
} from './lib/validation-summary';
export { OgeFormsConfigProvider, useOgeFormsConfig } from './lib/forms-config';
export type {
  OgeFormProps,
  OgeFormHandle,
  OgeFormAppearance,
  OgeFormItemDefinition,
  OgeFormGroupDefinition,
  OgeFormSectionDefinition,
  OgeFormNodeDefinition,
  OgeFormItemContext,
  OgeFormLabelContext,
  OgeFormGroupCaptionContext,
  OgeFormSubmittingEvent,
  OgeFormSubmittedEvent,
  OgeFormKeyEvent,
} from './lib/form-types';
// The shared vocabulary, config, item model and rule evaluator come from
// `@oge-ui/behavior` — re-exported so consumers import one package.
export {
  OGE_DEFAULT_FORMS_CONFIG,
  OGE_DEFAULT_FORMS_MESSAGES,
  captionize,
  evaluateOgeValidationRules,
  inferDataType,
  isBareEditor,
  pickEditorType,
  readPath,
  writePath,
} from '@oge-ui/behavior';
export type {
  OgeFormsConfig,
  OgeFormsConfigInput,
  OgeFormsMessages,
  OgeFormColCount,
  OgeFormDataType,
  OgeFormEditorOptions,
  OgeFormEditorType,
  OgeFormErrorEntry,
  OgeFormFieldChangedEvent,
  OgeFormGroupData,
  OgeFormItemDataBase,
  OgeFormLabelLocation,
  OgeFormScreenSize,
  OgeFormValidatedEvent,
  OgeResolvedFormItem,
  OgeValidationContext,
  OgeValidationRule,
} from '@oge-ui/behavior';
