import { InjectionToken, type Provider } from '@angular/core';
import type { OgeDrawerMode, OgeDrawerPosition } from './drawer-types';

/** Every user-facing string the drawer renders, including aria labels. */
export interface OgeDrawerMessages {
  /** Accessible name of the panel when the application supplies none. */
  drawer: string;
  /** Label and tooltip of the built-in close button. */
  close: string;
}

export const OGE_DEFAULT_DRAWER_MESSAGES: OgeDrawerMessages = {
  drawer: 'Drawer',
  close: 'Close drawer',
};

export interface OgeDrawerConfig {
  messages: OgeDrawerMessages;
  /** Default for the `mode` input. */
  mode?: OgeDrawerMode;
  /** Default for the `position` input. */
  position?: OgeDrawerPosition;
  /** Default for the `size` input. */
  size?: number | string;
}

export const OGE_DEFAULT_DRAWER_CONFIG: OgeDrawerConfig = {
  messages: OGE_DEFAULT_DRAWER_MESSAGES,
};

export const OGE_DRAWER_CONFIG = new InjectionToken<OgeDrawerConfig>(
  'OGE_DRAWER_CONFIG',
  {
    factory: () => OGE_DEFAULT_DRAWER_CONFIG,
  },
);

export type OgeDrawerConfigInput = Partial<
  Omit<OgeDrawerConfig, 'messages'>
> & {
  messages?: Partial<OgeDrawerMessages>;
};

/**
 * Application- or component-scoped drawer defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeDrawerConfig({
 *     size: 280,
 *     messages: { close: 'Kapat' },
 *   }),
 * ]
 * ```
 */
export function provideOgeDrawerConfig(config: OgeDrawerConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_DRAWER_CONFIG,
    useValue: {
      ...OGE_DEFAULT_DRAWER_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_DRAWER_MESSAGES, ...messages },
    } satisfies OgeDrawerConfig,
  };
}
