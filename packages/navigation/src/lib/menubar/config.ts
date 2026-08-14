import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_MENUBAR_CONFIG,
  resolveOgeMenubarConfig,
  type OgeMenubarConfig,
  type OgeMenubarConfigInput,
} from '@oge-ui/behavior';

/**
 * The catalog, the defaults and the merge rule are framework-free and live in
 * `@oge-ui/behavior`; this file is only the Angular DI seam over them.
 */
export {
  OGE_DEFAULT_MENUBAR_CONFIG,
  OGE_DEFAULT_MENUBAR_MESSAGES,
} from '@oge-ui/behavior';
export type {
  OgeMenubarConfig,
  OgeMenubarConfigInput,
  OgeMenubarMessages,
} from '@oge-ui/behavior';

export const OGE_MENUBAR_CONFIG = new InjectionToken<OgeMenubarConfig>(
  'OGE_MENUBAR_CONFIG',
  {
    factory: () => OGE_DEFAULT_MENUBAR_CONFIG,
  },
);

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
  return {
    provide: OGE_MENUBAR_CONFIG,
    useValue: resolveOgeMenubarConfig(config),
  };
}
