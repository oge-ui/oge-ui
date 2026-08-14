import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_TOOLBAR_CONFIG,
  resolveOgeToolbarConfig,
  type OgeToolbarConfig,
  type OgeToolbarConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`toolbar-core`), shared with the React render layer;
// this file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_TOOLBAR_MESSAGES,
  OGE_DEFAULT_TOOLBAR_CONFIG,
  type OgeToolbarMessages,
  type OgeToolbarConfig,
  type OgeToolbarConfigInput,
} from '@oge-ui/behavior';

export const OGE_TOOLBAR_CONFIG = new InjectionToken<OgeToolbarConfig>(
  'OGE_TOOLBAR_CONFIG',
  { factory: () => OGE_DEFAULT_TOOLBAR_CONFIG },
);

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
  return {
    provide: OGE_TOOLBAR_CONFIG,
    useValue: resolveOgeToolbarConfig(config),
  };
}
