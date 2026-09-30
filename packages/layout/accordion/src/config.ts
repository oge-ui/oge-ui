import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_ACCORDION_CONFIG,
  resolveOgeAccordionConfig,
  type OgeAccordionConfig,
  type OgeAccordionConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`accordion-core`), shared with the React render layer;
// this file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_ACCORDION_MESSAGES,
  OGE_DEFAULT_ACCORDION_CONFIG,
  type OgeAccordionMessages,
  type OgeAccordionConfig,
  type OgeAccordionConfigInput,
} from '@oge-ui/behavior';

export const OGE_ACCORDION_CONFIG = new InjectionToken<OgeAccordionConfig>(
  'OGE_ACCORDION_CONFIG',
  {
    factory: () => OGE_DEFAULT_ACCORDION_CONFIG,
  },
);

/**
 * Application- or component-scoped accordion defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeAccordionConfig({
 *     messages: { contentLoadFailed: 'Bu bölüm yüklenemedi.', retry: 'Yeniden dene' },
 *   }),
 * ]
 * ```
 */
export function provideOgeAccordionConfig(
  config: OgeAccordionConfigInput,
): Provider {
  return {
    provide: OGE_ACCORDION_CONFIG,
    useValue: resolveOgeAccordionConfig(config),
  };
}
