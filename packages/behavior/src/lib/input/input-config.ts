import { ogeFormatMessage } from '@oge-ui/core';
import {
  OGE_DEFAULT_ADAPTIVE_CONFIG,
  type OgeAdaptiveMode,
} from '../overlay/adaptive';

/**
 * The overflow chip text (`moreTags`) for `count` hidden tags, through
 * `ogeFormatMessage` — so a catalog may spell it as an ICU plural
 * (`'{count, plural, one {# weitere} other {# weitere}}'`) and `#` / `{count}`
 * use the locale's digits.
 */
export function ogeMoreTagsText(
  template: string,
  count: number,
  locale?: string,
): string {
  return ogeFormatMessage(template, { count }, locale);
}

/**
 * Every user-facing string and behavioral default of the input editors,
 * shared by both render layers (ADR 0001). The Angular
 * `provideOgeInputsConfig()` and the React `<OgeInputsConfigProvider>` both
 * merge over these exact values, so a Turkish `requiredError` or a slower
 * spin repeat means the same thing in either framework.
 */
export interface OgeInputsMessages {
  /** Aria label of the clear (✕) button. */
  clearButton: string;
  /** Aria label of the password reveal toggle while hidden. */
  showPassword: string;
  /** Aria label of the password reveal toggle while revealed. */
  hidePassword: string;
  /** Aria label of the copy-to-clipboard button. */
  copyButton: string;
  /** Announced (aria-live) and shown transiently after a successful copy. */
  copied: string;
  /** Aria label of the number box's up spin button. */
  spinIncrement: string;
  /** Aria label of the number box's down spin button. */
  spinDecrement: string;
  /** Screen-reader text next to the async-validation spinner. */
  pending: string;
  /** Screen-reader text next to the success icon. */
  valid: string;
  /** Visual counter with a max — placeholders `{count}` `{max}`. */
  counter: string;
  /** Visual counter without a max — placeholder `{count}`. */
  counterNoMax: string;
  /** Aria label of the counter — placeholders `{count}` `{max}`. */
  counterAria: string;
  /** Aria label of the counter without a max — placeholder `{count}`. */
  counterAriaNoMax: string;
  requiredError: string;
  emailError: string;
  /** Placeholder `{min}`. */
  minError: string;
  /** Placeholder `{max}`. */
  maxError: string;
  /** Placeholder `{requiredLength}`. */
  minLengthError: string;
  /** Placeholder `{requiredLength}`. */
  maxLengthError: string;
  patternError: string;
  /**
   * Masked text box / text box with a `mask`: the value leaves required mask
   * slots empty. A per-editor `maskInvalidMessage` overrides it.
   */
  maskInvalidError: string;
  /** Number box parse failure. */
  invalidNumberError: string;
  /** Fallback for unknown validation error kinds. */
  invalidError: string;
  /** Aria label of the select box's drop-down chevron button. */
  dropDownToggle: string;
  /** Empty-list row of the select box popup. */
  noDataText: string;
  /** Loading row of the select box popup while `loading` is `true`. */
  dropDownLoading: string;
  /** Error row of the select box popup when a lazy `items` function rejects. */
  dropDownLoadError: string;
  /** Aria label of a tag chip's remove (×) button. */
  removeTagButton: string;
  /** Switch track text while on (empty string hides it). */
  switchOn: string;
  /** Switch track text while off (empty string hides it). */
  switchOff: string;
  /** Aria label of a single slider's handle when the app supplies none. */
  sliderHandle: string;
  /** Aria label of a range slider's start handle. */
  sliderStartHandle: string;
  /** Aria label of a range slider's end handle. */
  sliderEndHandle: string;
  /** Aria label / title of the slider's increment button. */
  sliderIncrement: string;
  /** Aria label / title of the slider's decrement button. */
  sliderDecrement: string;
  /** Calendar today shortcut button. */
  todayButton: string;
  /** Aria label of the calendar's previous-view arrow. */
  calendarPrev: string;
  /** Aria label of the calendar's next-view arrow. */
  calendarNext: string;
  /** Aria label / title of the calendar's zoom-out header button. */
  calendarZoomOut: string;
  /** Aria label of the calendar grid. */
  calendarLabel: string;
  /** Aria label of the calendar's week-number column header. */
  weekColumnLabel: string;
  /** Date box parse failure (reverts on blur). */
  invalidDateError: string;
  /** Date box out-of-range message — placeholders `{min}` `{max}`. */
  dateOutOfRangeError: string;
  /** Confirm button of `applyValueMode: 'useButtons'`. */
  okButton: string;
  /** Cancel button of `applyValueMode: 'useButtons'`. */
  cancelButton: string;
  /** Aria label of the date range box's start input. */
  rangeStartLabel: string;
  /** Aria label of the date range box's end input. */
  rangeEndLabel: string;
  /** "Now" button of a time / date-time picker (`showNowButton`). */
  nowButton: string;
  /** Aria label of a date range box's preset list. */
  presetsLabel: string;
  /** Built-in range preset `ogeDateRangePresets.today()`. */
  presetToday: string;
  /** Built-in range preset `ogeDateRangePresets.yesterday()`. */
  presetYesterday: string;
  /** Built-in range preset `ogeDateRangePresets.last7Days()`. */
  presetLast7Days: string;
  /** Built-in range preset `ogeDateRangePresets.last30Days()`. */
  presetLast30Days: string;
  /** Built-in range preset `ogeDateRangePresets.thisWeek()`. */
  presetThisWeek: string;
  /** Built-in range preset `ogeDateRangePresets.lastWeek()`. */
  presetLastWeek: string;
  /** Built-in range preset `ogeDateRangePresets.thisMonth()`. */
  presetThisMonth: string;
  /** Built-in range preset `ogeDateRangePresets.lastMonth()`. */
  presetLastMonth: string;
  /** Built-in range preset `ogeDateRangePresets.thisYear()`. */
  presetThisYear: string;
  /** Built-in range preset `ogeDateRangePresets.lastYear()`. */
  presetLastYear: string;
  /** Aria label of the time picker's hour column. */
  hourColumnLabel: string;
  /** Aria label of the time picker's minute column. */
  minuteColumnLabel: string;
  /** Aria label of the time picker's second column. */
  secondColumnLabel: string;
  /** Aria label of the time picker's AM/PM column. */
  dayPeriodColumnLabel: string;
  /** Empty day segment of the masked date entry (`useMaskBehavior`). */
  segmentDay: string;
  /** Empty month segment of the masked date entry. */
  segmentMonth: string;
  /** Empty year segment of the masked date entry. */
  segmentYear: string;
  /** Empty hour segment of the masked date entry. */
  segmentHour: string;
  /** Empty minute segment of the masked date entry. */
  segmentMinute: string;
  /** Empty second segment of the masked date entry. */
  segmentSecond: string;
  /** Empty AM/PM segment of the masked date entry. */
  segmentDayPeriod: string;
  /** Color box parse failure (reverts on blur). */
  invalidColorError: string;
  /** Aria label of the color box popup dialog when the field has no label. */
  colorPickerLabel: string;
  /** Aria label of the color box's hue slider thumb. */
  hueSliderLabel: string;
  /** `aria-valuetext` of the hue slider — placeholder `{value}` (degrees). */
  hueValueText: string;
  /** Aria label of the color box's alpha slider thumb. */
  alphaSliderLabel: string;
  /** `aria-valuetext` of the alpha slider — placeholder `{value}` (percent). */
  alphaValueText: string;
  /** Aria label of the 2D saturation/brightness surface thumb. */
  colorSurfaceLabel: string;
  /** `aria-roledescription` of the 2D surface — announces the 2-axis nature. */
  colorSurfaceRoleDescription: string;
  /** `aria-valuetext` of the 2D surface — placeholders `{saturation}` `{brightness}`. */
  surfaceValueText: string;
  /** Aria label of the color box's palette grid. */
  paletteLabel: string;
  /** Aria label of the color box's hex text input. */
  hexInputLabel: string;
  /** Aria label of the color box's red channel input. */
  redInputLabel: string;
  /** Aria label of the color box's green channel input. */
  greenInputLabel: string;
  /** Aria label of the color box's blue channel input. */
  blueInputLabel: string;
  /** Aria label of the color box's alpha percent input. */
  alphaInputLabel: string;
  /** Aria label / title of the color box's eyedropper button. */
  eyedropperButton: string;
  /** Aria label of the standalone color gradient group when it has no label. */
  colorGradientLabel: string;
  /** Caption of the color gradient's contrast readout. */
  contrastLabel: string;
  /** The contrast ratio text — placeholder `{ratio}`. */
  contrastRatioText: string;
  /** Badge text of a WCAG level the color meets — placeholder `{level}` (AA / AAA). */
  contrastPass: string;
  /** Badge text of a WCAG level the color fails — placeholder `{level}` (AA / AAA). */
  contrastFail: string;
  /** Label of the check box group's "select all" box and the tag box's "select all" row. */
  selectAllText: string;
  /** Aria label of the adaptive sheet / full-screen dialog's close (✕) button. */
  adaptiveClose: string;
  /** Confirm action of the adaptive tag box and date range box (closes the sheet). */
  adaptiveDone: string;
  /** Placeholder and aria label of the adaptive sheet's search field. */
  adaptiveSearch: string;
  /** Dialog title of an adaptive popup whose editor has no label. */
  adaptiveTitle: string;
  /** Overflow chip of `maxDisplayedTags` — `{count}`, or an ICU plural over it. */
  moreTags: string;
  /** Status shown once `maxSelectedItems` is reached — placeholder `{max}`. */
  maxSelectedItemsMessage: string;
  /** `compare` validation rule failure (forms). */
  compareError: string;
  /** Accessible name of a rating that has no `label`. */
  ratingLabel: string;
  /**
   * Spoken rating value (`aria-valuetext`, each radio's name) — placeholders
   * `{value}` `{max}`, or an ICU plural over them.
   */
  ratingValueText: string;
  /** Spoken value of a rating with no value. */
  ratingNoValueText: string;
  /** Accessible name of a one-time-code input that has no `label`. */
  otpLabel: string;
  /** Accessible name of one code cell — placeholders `{index}` `{length}`. */
  otpCellLabel: string;
  /** Accessible name of a list box that has no `label`. */
  listBoxLabel: string;
  /** Placeholder of the list box's search field. */
  listBoxSearchPlaceholder: string;
  /** Accessible name of the list box's search field. */
  listBoxSearchLabel: string;
  /** Default title (and accessible name) of the transfer list's source list. */
  transferSourceTitle: string;
  /** Default title (and accessible name) of the transfer list's target list. */
  transferTargetTitle: string;
  /** Accessible name of the transfer list's button column. */
  transferActionsLabel: string;
  /** Button: move the source selection to the target list. */
  transferAddSelected: string;
  /** Button: move every shown source item to the target list. */
  transferAddAll: string;
  /** Button: move the target selection back to the source list. */
  transferRemoveSelected: string;
  /** Button: move every shown target item back to the source list. */
  transferRemoveAll: string;
  /** A list header's item count — an ICU plural over `{count}`. */
  transferItemCount: string;
  /**
   * Announced after a move — an ICU plural over `{count}`; `{list}` is the
   * destination list's title.
   */
  transferMovedAnnouncement: string;
  /** Accessible name of a signature pad that has no `label`. */
  signatureLabel: string;
  /** Placeholder drawn on an empty signature pad. */
  signaturePlaceholder: string;
  /** Spoken state of an empty signature pad. */
  signatureEmptyStatus: string;
  /** Spoken state of a signed signature pad. */
  signatureSignedStatus: string;
  /** Accessible name of the drawing surface — placeholders `{label}` `{status}`. */
  signatureImageLabel: string;
  /** Aria label / title of the signature pad's undo button. */
  signatureUndo: string;
  /** Aria label / title of the signature pad's clear button. */
  signatureClear: string;
  /** Accessible name of the signature pad's draw / type switch. */
  signatureModeLabel: string;
  /** The signature pad's draw-mode button. */
  signatureDrawMode: string;
  /** The signature pad's type-mode button (the keyboard alternative). */
  signatureTypeMode: string;
  /** Label of the typed-signature text field. */
  signatureTypeInputLabel: string;
  /** Accessible name of the mention suggestion list. */
  mentionListLabel: string;
}

export const OGE_DEFAULT_INPUTS_MESSAGES: OgeInputsMessages = {
  clearButton: 'Clear',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  copyButton: 'Copy to clipboard',
  copied: 'Copied',
  spinIncrement: 'Increase value',
  spinDecrement: 'Decrease value',
  pending: 'Validating',
  valid: 'Valid',
  counter: '{count}/{max}',
  counterNoMax: '{count}',
  counterAria: '{count} of {max} characters used',
  counterAriaNoMax: '{count} characters entered',
  requiredError: 'This field is required',
  emailError: 'Enter a valid email address',
  minError: 'Value must be at least {min}',
  maxError: 'Value must be at most {max}',
  minLengthError: 'Enter at least {requiredLength} characters',
  maxLengthError: 'Enter no more than {requiredLength} characters',
  patternError: 'The value has an invalid format',
  maskInvalidError: 'Complete the value in the required format',
  invalidNumberError: 'Enter a valid number',
  invalidError: 'Invalid value',
  dropDownToggle: 'Toggle dropdown',
  noDataText: 'No data to display',
  dropDownLoading: 'Loading…',
  dropDownLoadError: 'Failed to load data',
  removeTagButton: 'Remove',
  switchOn: 'ON',
  switchOff: 'OFF',
  sliderHandle: 'Value',
  sliderStartHandle: 'Start value',
  sliderEndHandle: 'End value',
  sliderIncrement: 'Increase',
  sliderDecrement: 'Decrease',
  todayButton: 'Today',
  calendarPrev: 'Previous',
  calendarNext: 'Next',
  calendarZoomOut: 'Zoom out',
  calendarLabel: 'Calendar',
  weekColumnLabel: 'Week',
  invalidDateError: 'Enter a valid date',
  dateOutOfRangeError: 'Date must be between {min} and {max}',
  okButton: 'OK',
  cancelButton: 'Cancel',
  rangeStartLabel: 'Start date',
  rangeEndLabel: 'End date',
  nowButton: 'Now',
  presetsLabel: 'Quick ranges',
  presetToday: 'Today',
  presetYesterday: 'Yesterday',
  presetLast7Days: 'Last 7 days',
  presetLast30Days: 'Last 30 days',
  presetThisWeek: 'This week',
  presetLastWeek: 'Last week',
  presetThisMonth: 'This month',
  presetLastMonth: 'Last month',
  presetThisYear: 'This year',
  presetLastYear: 'Last year',
  hourColumnLabel: 'Hours',
  minuteColumnLabel: 'Minutes',
  secondColumnLabel: 'Seconds',
  dayPeriodColumnLabel: 'AM/PM',
  segmentDay: 'dd',
  segmentMonth: 'mm',
  segmentYear: 'yyyy',
  segmentHour: 'hh',
  segmentMinute: 'mm',
  segmentSecond: 'ss',
  segmentDayPeriod: '--',
  invalidColorError: 'Enter a valid color',
  colorPickerLabel: 'Color picker',
  hueSliderLabel: 'Hue',
  hueValueText: '{value} degrees',
  alphaSliderLabel: 'Opacity',
  alphaValueText: '{value}%',
  colorSurfaceLabel: 'Saturation and brightness',
  colorSurfaceRoleDescription: '2-dimensional color picker',
  surfaceValueText: 'Saturation {saturation}%, Brightness {brightness}%',
  paletteLabel: 'Color palette',
  hexInputLabel: 'Hex color',
  redInputLabel: 'Red',
  greenInputLabel: 'Green',
  blueInputLabel: 'Blue',
  alphaInputLabel: 'Opacity percent',
  eyedropperButton: 'Pick color from screen',
  colorGradientLabel: 'Color gradient',
  contrastLabel: 'Contrast',
  contrastRatioText: '{ratio}:1',
  contrastPass: '{level} pass',
  contrastFail: '{level} fail',
  selectAllText: 'Select all',
  adaptiveClose: 'Close',
  adaptiveDone: 'Done',
  adaptiveSearch: 'Search',
  adaptiveTitle: 'Select',
  moreTags: '+{count} more',
  maxSelectedItemsMessage: 'You can select up to {max} items',
  compareError: 'The values do not match',
  ratingLabel: 'Rating',
  ratingValueText: '{value} of {max}',
  ratingNoValueText: 'Not rated',
  otpLabel: 'Verification code',
  otpCellLabel: 'Character {index} of {length}',
  listBoxLabel: 'Options',
  listBoxSearchPlaceholder: 'Search',
  listBoxSearchLabel: 'Search the list',
  transferSourceTitle: 'Available',
  transferTargetTitle: 'Selected',
  transferActionsLabel: 'Move items',
  transferAddSelected: 'Add selected',
  transferAddAll: 'Add all',
  transferRemoveSelected: 'Remove selected',
  transferRemoveAll: 'Remove all',
  transferItemCount: '{count, plural, one {# item} other {# items}}',
  transferMovedAnnouncement:
    '{count, plural, one {# item moved to {list}} other {# items moved to {list}}}',
  signatureLabel: 'Signature',
  signaturePlaceholder: 'Sign here',
  signatureEmptyStatus: 'not signed',
  signatureSignedStatus: 'signed',
  signatureImageLabel: '{label}, {status}',
  signatureUndo: 'Undo last stroke',
  signatureClear: 'Clear signature',
  signatureModeLabel: 'Signature input method',
  signatureDrawMode: 'Draw',
  signatureTypeMode: 'Type',
  signatureTypeInputLabel: 'Type your full name',
  mentionListLabel: 'Suggestions',
};

/** Application-wide defaults, overridable per editor via the matching inputs. */
export interface OgeInputsConfig {
  /**
   * BCP 47 locale for every `Intl` format in the date editors; a
   * component-level `locale` input overrides it, unset = the browser locale.
   */
  readonly locale?: string;
  /** Delay before number-box spin buttons start repeating. */
  spinRepeatDelayMs: number;
  /** Interval between spin repeats while held. */
  spinRepeatIntervalMs: number;
  /** How long the copy button shows its transient "copied" state. */
  copiedResetMs: number;
  /** Select box: delay before typed search text filters the list. */
  searchTimeoutMs: number;
  /**
   * Rows a list editor asks its `dataSource` for per page (`take`) — select
   * box, tag box, autocomplete and multi-column combo box.
   */
  dataPageSize: number;
  /**
   * Default `adaptiveMode` of every popup editor (select box, tag box,
   * autocomplete, tree select, date / date range / color box). `'none'`
   * keeps the anchored drop-down everywhere; `'auto'` presents it as a bottom
   * sheet or full-screen dialog below `adaptiveBreakpoint`.
   */
  adaptiveMode: OgeAdaptiveMode;
  /** Viewport width (px) below which `adaptiveMode: 'auto'` goes adaptive. */
  adaptiveBreakpoint: number;
  messages: OgeInputsMessages;
}

export const OGE_DEFAULT_INPUTS_CONFIG: OgeInputsConfig = {
  spinRepeatDelayMs: 400,
  spinRepeatIntervalMs: 80,
  copiedResetMs: 2000,
  searchTimeoutMs: 250,
  dataPageSize: 30,
  adaptiveMode: OGE_DEFAULT_ADAPTIVE_CONFIG.adaptiveMode,
  adaptiveBreakpoint: OGE_DEFAULT_ADAPTIVE_CONFIG.adaptiveBreakpoint,
  messages: OGE_DEFAULT_INPUTS_MESSAGES,
};

export type OgeInputsConfigInput = Partial<
  Omit<OgeInputsConfig, 'messages'>
> & {
  messages?: Partial<OgeInputsMessages>;
};

/** Merges a partial config over the defaults — both providers run this. */
export function resolveOgeInputsConfig(
  config: OgeInputsConfigInput = {},
): OgeInputsConfig {
  const { messages, ...rest } = config;
  return {
    ...OGE_DEFAULT_INPUTS_CONFIG,
    ...rest,
    messages: { ...OGE_DEFAULT_INPUTS_MESSAGES, ...messages },
  };
}
