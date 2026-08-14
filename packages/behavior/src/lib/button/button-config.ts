/**
 * Button defaults and user-facing strings, shared by every render layer.
 *
 * These are plain data — no injector, no context — so the Angular package can
 * wrap them in an `InjectionToken` and the React package in a context provider
 * while both read the *same* numbers and the same English strings. Keeping them
 * here is what stops the two from drifting to different `clickGuardMs` values.
 */

/** Every user-facing string in the buttons family. */
export interface OgeButtonsMessages {
  /** Screen-reader text announced while a button is busy (`loading` / pending `action`). */
  loading: string;
  /** Tooltip fragment shown when `holdToConfirm` is enabled. */
  holdToConfirm: string;
  /** Status row while a drop-down button loads async items. */
  dropDownLoading: string;
  /** Status row when a drop-down has no items. */
  dropDownNoItems: string;
  /** Status row when async items failed to load. */
  dropDownLoadError: string;
  /** Aria label of the split drop-down's chevron toggle. */
  dropDownToggle: string;
}

export const OGE_DEFAULT_BUTTONS_MESSAGES: OgeButtonsMessages = {
  loading: 'Loading',
  holdToConfirm: 'Hold to confirm',
  dropDownLoading: 'Loading…',
  dropDownNoItems: 'No items',
  dropDownLoadError: 'Could not load items',
  dropDownToggle: 'Open menu',
};

/** Application-wide defaults, overridable per button via the matching inputs. */
export interface OgeButtonsConfig {
  /** Default window for `clickGuard: true` (throttle) and guard options without `ms`. */
  clickGuardMs: number;
  /** Default hold duration for `holdToConfirm: true`. */
  holdToConfirmMs: number;
  /** Delay before `autoRepeat` starts repeating. */
  autoRepeatDelayMs: number;
  /** Interval between repeated clicks while `autoRepeat` is held. */
  autoRepeatIntervalMs: number;
  messages: OgeButtonsMessages;
}

export const OGE_DEFAULT_BUTTONS_CONFIG: OgeButtonsConfig = {
  clickGuardMs: 500,
  holdToConfirmMs: 800,
  autoRepeatDelayMs: 400,
  autoRepeatIntervalMs: 80,
  messages: OGE_DEFAULT_BUTTONS_MESSAGES,
};

export type OgeButtonsConfigInput = Partial<
  Omit<OgeButtonsConfig, 'messages'>
> & {
  messages?: Partial<OgeButtonsMessages>;
};

/** Shallow-merges a partial override onto the defaults (messages merged too). */
export function resolveOgeButtonsConfig(
  input: OgeButtonsConfigInput | undefined,
): OgeButtonsConfig {
  const { messages, ...rest } = input ?? {};
  return {
    ...OGE_DEFAULT_BUTTONS_CONFIG,
    ...rest,
    messages: { ...OGE_DEFAULT_BUTTONS_MESSAGES, ...messages },
  };
}
