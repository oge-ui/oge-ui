import { InjectionToken, type Provider } from '@angular/core';

/**
 * Every user-facing string in the inputs package — override globally via
 * `provideOgeInputsConfig({ messages: {...} })` or per editor via `[messages]`.
 * Error patterns support `{placeholder}` interpolation.
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
};

/** Application-wide defaults, overridable per editor via the matching inputs. */
export interface OgeInputsConfig {
  /**
   * BCP 47 locale for every `Intl` format in the date editors; a
   * component-level `locale` input overrides it, unset = the browser
   * locale.
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
  messages: OgeInputsMessages;
}

export const OGE_DEFAULT_INPUTS_CONFIG: OgeInputsConfig = {
  spinRepeatDelayMs: 400,
  spinRepeatIntervalMs: 80,
  copiedResetMs: 2000,
  searchTimeoutMs: 250,
  messages: OGE_DEFAULT_INPUTS_MESSAGES,
};

export const OGE_INPUTS_CONFIG = new InjectionToken<OgeInputsConfig>(
  'OGE_INPUTS_CONFIG',
  {
    factory: () => OGE_DEFAULT_INPUTS_CONFIG,
  },
);

export type OgeInputsConfigInput = Partial<
  Omit<OgeInputsConfig, 'messages'>
> & {
  messages?: Partial<OgeInputsMessages>;
};

/**
 * Application- or component-scoped input defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeInputsConfig({
 *     messages: { requiredError: 'Bu alan zorunludur' },
 *   }),
 * ]
 * ```
 */
export function provideOgeInputsConfig(config: OgeInputsConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_INPUTS_CONFIG,
    useValue: {
      ...OGE_DEFAULT_INPUTS_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_INPUTS_MESSAGES, ...messages },
    } satisfies OgeInputsConfig,
  };
}
