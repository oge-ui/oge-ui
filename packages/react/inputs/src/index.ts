export {
  OgeTextBox,
  type OgeTextBoxProps,
  type OgeTextBoxHandle,
  type OgeTextBoxMode,
} from './lib/text-box';
export {
  OgeTextArea,
  measureTextAreaHeight,
  type OgeTextAreaProps,
  type OgeTextAreaHandle,
} from './lib/text-area';
export {
  OgeNumberBox,
  type OgeNumberBoxProps,
  type OgeNumberBoxHandle,
  type OgeNumberBoxMode,
} from './lib/number-box';
export {
  OgeCheckBox,
  type OgeCheckBoxProps,
  type OgeCheckBoxHandle,
} from './lib/check-box';
export {
  OgeSwitch,
  type OgeSwitchProps,
  type OgeSwitchHandle,
} from './lib/switch';
export {
  OgeRadioGroup,
  type OgeRadioGroupProps,
  type OgeRadioGroupHandle,
  type OgeRadioGroupLayout,
  type OgeRadioGroupItemClickEvent,
} from './lib/radio-group';
export {
  OgeSelectBox,
  type OgeSelectBoxProps,
  type OgeSelectBoxHandle,
  type OgeSelectBoxSelectionChangedEvent,
  type OgeSelectBoxItemClickEvent,
  type OgeSelectBoxCustomItemEvent,
} from './lib/select-box';
export {
  OgeTagBox,
  type OgeTagBoxProps,
  type OgeTagBoxHandle,
  type OgeTagBoxSelectionChangedEvent,
  type OgeTagBoxItemClickEvent,
} from './lib/tag-box';
export {
  OgeAutocomplete,
  type OgeAutocompleteProps,
  type OgeAutocompleteHandle,
  type OgeAutocompleteSelectionChangedEvent,
  type OgeAutocompleteItemClickEvent,
} from './lib/autocomplete';
export {
  OgeSlider,
  type OgeSliderProps,
  type OgeSliderHandle,
} from './lib/slider';
export {
  OgeRangeSlider,
  type OgeRangeSliderProps,
  type OgeRangeSliderHandle,
} from './lib/range-slider';
export type {
  OgeSliderBaseProps,
  OgeSliderOrientation,
  OgeSliderValueIndicator,
  OgeSliderDragStartedEvent,
  OgeSliderSlideEndedEvent,
} from './lib/slider-shared';
export {
  OgeCalendar,
  type OgeCalendarProps,
  type OgeCalendarHandle,
  type OgeCalendarCellContext,
} from './lib/calendar';
export type {
  OgeCalendarZoomLevel,
  OgeCalendarSelectionMode,
  OgeCalendarRange,
  OgeCalendarWeekNumberOptions,
  OgeCalendarDisabledDates,
  OgeCalendarCellClickEvent,
} from '@oge-ui/behavior';
export {
  OgeDateBox,
  type OgeDateBoxProps,
  type OgeDateBoxHandle,
} from './lib/date-box';
export type {
  OgeDateBoxType,
  OgeDateBoxApplyValueMode,
  OgeDateBoxDisplayFormat,
  OgeDateBoxTimeView,
} from '@oge-ui/behavior';
export {
  OgeDateRangeBox,
  type OgeDateRangeBoxProps,
  type OgeDateRangeBoxHandle,
} from './lib/date-range-box';
export {
  OgeColorBox,
  type OgeColorBoxProps,
  type OgeColorBoxHandle,
} from './lib/color-box';
export {
  OGE_DEFAULT_COLOR_PALETTE,
  type OgeColorBoxView,
  type OgeColorBoxApplyValueMode,
  type OgeColorFormat,
} from '@oge-ui/behavior';
export {
  OgeTreeSelect,
  type OgeTreeSelectProps,
  type OgeTreeSelectHandle,
  type OgeTreeSelectSelectionMode,
  type OgeTreeSelectDisplayMode,
  type OgeTreeSelectSelectionChangedEvent,
} from './lib/tree-select';
export {
  OgeInputsConfigProvider,
  useOgeInputsConfig,
} from './lib/inputs-config';
export type { OgeControlProps } from './lib/use-field';
export type {
  OgeInputCounterState,
  OgeInputRevealState,
  OgeInputCopyState,
} from './lib/field-chrome';
// The shared vocabulary, config and error shapes come from `@oge-ui/behavior`
// — re-exported so consumers import one package.
export {
  OGE_DEFAULT_INPUTS_CONFIG,
  OGE_DEFAULT_INPUTS_MESSAGES,
} from '@oge-ui/behavior';
export type {
  OgeInputsConfig,
  OgeInputsConfigInput,
  OgeInputsMessages,
  OgeFieldError,
  OgeInputErrorDisplay,
  OgeInputLabelMode,
  OgeInputStylingMode,
  OgeInputSize,
  OgeInputSubscriptSizing,
  OgeInputCounterMode,
  OgeInputShowSuccessIcon,
} from '@oge-ui/behavior';
