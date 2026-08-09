import { InjectionToken, type Provider } from '@angular/core';
import type { OgeToolbarSize, OgeToolbarStylingMode } from './toolbar-types';

/**
 * Every user-facing string in the toolbar — override globally via
 * `provideOgeToolbarConfig({ messages: {...} })` or per component via
 * `[messages]`.
 */
export interface OgeToolbarMessages {
  /** Accessible name and tooltip of the overflow button. */
  overflowMenu: string;
  /**
   * Accessible name of the toolbar itself, used when neither `ariaLabel` nor
   * `ariaLabelledBy` is set.
   */
  toolbar: string;
  /** Accessible name of the `overflow: 'extended'` second-row toggle. */
  moreCommands: string;
  /** Accessible name of the back scroll button in `overflow: 'scroll'`. */
  scrollBackward: string;
  /** Accessible name of the forward scroll button in `overflow: 'scroll'`. */
  scrollForward: string;
  /** Shown in place of the items when there are none to display. */
  noData: string;
}

export const OGE_DEFAULT_TOOLBAR_MESSAGES: OgeToolbarMessages = {
  overflowMenu: 'More commands',
  toolbar: 'Toolbar',
  moreCommands: 'Show more commands',
  scrollBackward: 'Scroll backward',
  scrollForward: 'Scroll forward',
  noData: 'No commands to display',
};

/** Application-wide defaults for the toolbar. */
export interface OgeToolbarConfig {
  messages: OgeToolbarMessages;
  /** Default for the `size` input. */
  size?: OgeToolbarSize;
  /** Default for the `stylingMode` input. */
  stylingMode?: OgeToolbarStylingMode;
}

export const OGE_DEFAULT_TOOLBAR_CONFIG: OgeToolbarConfig = {
  messages: OGE_DEFAULT_TOOLBAR_MESSAGES,
};

export const OGE_TOOLBAR_CONFIG = new InjectionToken<OgeToolbarConfig>(
  'OGE_TOOLBAR_CONFIG',
  { factory: () => OGE_DEFAULT_TOOLBAR_CONFIG },
);

export type OgeToolbarConfigInput = Partial<
  Omit<OgeToolbarConfig, 'messages'>
> & {
  messages?: Partial<OgeToolbarMessages>;
};

/**
 * Application- or component-scoped toolbar defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeToolbarConfig({
 *     size: 'sm',
 *     messages: { overflowMenu: 'Daha fazla komut' },
 *   }),
 * ]
 * ```
 */
export function provideOgeToolbarConfig(
  config: OgeToolbarConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_TOOLBAR_CONFIG,
    useValue: {
      ...OGE_DEFAULT_TOOLBAR_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_TOOLBAR_MESSAGES, ...messages },
    } satisfies OgeToolbarConfig,
  };
}
