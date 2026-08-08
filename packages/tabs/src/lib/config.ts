import { InjectionToken, type Provider } from '@angular/core';

/**
 * Every user-facing string in the tabs package — override globally via
 * `provideOgeTabsConfig({ messages: {...} })` or per component via
 * `[messages]`.
 */
export interface OgeTabsMessages {
  /** Aria label of a tab's close button. */
  closeTab: string;
  /** Aria label of the backward overflow arrow. */
  scrollBackward: string;
  /** Aria label of the forward overflow arrow. */
  scrollForward: string;
  /** Aria label of the all-tabs overflow menu button. */
  tabListMenu: string;
  /** Announced after a dirty tab's label (unsaved-changes indicator). */
  dirty: string;
  /** Shown in place of the strip when there are no visible tabs. */
  noData: string;
}

export const OGE_DEFAULT_TABS_MESSAGES: OgeTabsMessages = {
  closeTab: 'Close tab',
  scrollBackward: 'Scroll tabs backward',
  scrollForward: 'Scroll tabs forward',
  tabListMenu: 'Show all tabs',
  dirty: 'has unsaved changes',
  noData: 'No tabs to display',
};

/** Application-wide defaults for the tabs package. */
export interface OgeTabsConfig {
  messages: OgeTabsMessages;
}

export const OGE_DEFAULT_TABS_CONFIG: OgeTabsConfig = {
  messages: OGE_DEFAULT_TABS_MESSAGES,
};

export const OGE_TABS_CONFIG = new InjectionToken<OgeTabsConfig>(
  'OGE_TABS_CONFIG',
  {
    factory: () => OGE_DEFAULT_TABS_CONFIG,
  },
);

export type OgeTabsConfigInput = Partial<Omit<OgeTabsConfig, 'messages'>> & {
  messages?: Partial<OgeTabsMessages>;
};

/**
 * Application- or component-scoped tabs defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeTabsConfig({
 *     messages: { closeTab: 'Sekmeyi kapat' },
 *   }),
 * ]
 * ```
 */
export function provideOgeTabsConfig(config: OgeTabsConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_TABS_CONFIG,
    useValue: {
      ...OGE_DEFAULT_TABS_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_TABS_MESSAGES, ...messages },
    } satisfies OgeTabsConfig,
  };
}
