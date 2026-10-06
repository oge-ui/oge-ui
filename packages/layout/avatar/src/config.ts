import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_AVATAR_CONFIG,
  resolveOgeAvatarConfig,
  type OgeAvatarConfig,
  type OgeAvatarConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`avatar-core`); this file is only the Angular DI wrapper
// around them.
export {
  OGE_DEFAULT_AVATAR_CONFIG,
  OGE_DEFAULT_AVATAR_MESSAGES,
  type OgeAvatarMessages,
  type OgeAvatarConfig,
  type OgeAvatarConfigInput,
} from '@oge-ui/behavior';

export const OGE_AVATAR_CONFIG = new InjectionToken<OgeAvatarConfig>(
  'OGE_AVATAR_CONFIG',
  { factory: () => OGE_DEFAULT_AVATAR_CONFIG },
);

/**
 * Application- or component-scoped avatar and avatar-group defaults:
 *
 * ```ts
 * providers: [provideOgeAvatarConfig({ messages: { busy: 'Meşgul' } })]
 * ```
 */
export function provideOgeAvatarConfig(
  config: OgeAvatarConfigInput | (() => OgeAvatarConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_AVATAR_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeAvatarConfig(config()), computed),
      }
    : {
        provide: OGE_AVATAR_CONFIG,
        useValue: resolveOgeAvatarConfig(config),
      };
}
