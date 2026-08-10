import { InjectionToken, type Provider } from '@angular/core';
import type {
  OgeMenubarOpenMode,
  OgeMenubarOrientation,
} from './menubar-types';

/** Every user-facing string the menubar renders, including aria labels. */
export interface OgeMenubarMessages {
  /** Accessible name of the bar when the application supplies none. */
  menubar: string;
  /** Aria label of the compact hamburger button. */
  hamburger: string;
}

export const OGE_DEFAULT_MENUBAR_MESSAGES: OgeMenubarMessages = {
  menubar: 'Menu bar',
  hamburger: 'Menu',
};

export interface OgeMenubarConfig {
  messages: OgeMenubarMessages;
  /** Default for the `openMode` input. */
  openMode?: OgeMenubarOpenMode;
  /** Default for the `hoverDelay` input, in ms. */
  hoverDelay?: number;
  /** Default for the `orientation` input. */
  orientation?: OgeMenubarOrientation;
  /** Default for the `compactBelow` input. */
  compactBelow?: number;
}

export const OGE_DEFAULT_MENUBAR_CONFIG: OgeMenubarConfig = {
  messages: OGE_DEFAULT_MENUBAR_MESSAGES,
};

export const OGE_MENUBAR_CONFIG = new InjectionToken<OgeMenubarConfig>(
  'OGE_MENUBAR_CONFIG',
  {
    factory: () => OGE_DEFAULT_MENUBAR_CONFIG,
  },
);

export type OgeMenubarConfigInput = Partial<
  Omit<OgeMenubarConfig, 'messages'>
> & {
  messages?: Partial<OgeMenubarMessages>;
};

/**
 * Application- or component-scoped menubar defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeMenubarConfig({
 *     openMode: 'hover',
 *     messages: { hamburger: 'Menü' },
 *   }),
 * ]
 * ```
 */
export function provideOgeMenubarConfig(
  config: OgeMenubarConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_MENUBAR_CONFIG,
    useValue: {
      ...OGE_DEFAULT_MENUBAR_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_MENUBAR_MESSAGES, ...messages },
    } satisfies OgeMenubarConfig,
  };
}
