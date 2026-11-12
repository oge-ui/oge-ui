import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  ogeLiveConfig,
  OGE_DEFAULT_BARCODE_CONFIG,
  resolveOgeBarcodeConfig,
  type OgeBarcodeConfig,
  type OgeBarcodeConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`barcode-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_BARCODE_CONFIG,
  OGE_DEFAULT_BARCODE_MESSAGES,
  type OgeBarcodeMessages,
  type OgeBarcodeConfig,
  type OgeBarcodeConfigInput,
} from '@oge-ui/behavior';

export const OGE_BARCODE_CONFIG = new InjectionToken<OgeBarcodeConfig>(
  'OGE_BARCODE_CONFIG',
  { factory: () => OGE_DEFAULT_BARCODE_CONFIG },
);

/**
 * Application- or component-scoped barcode defaults:
 *
 * ```ts
 * providers: [provideOgeBarcodeConfig({ errorCorrection: "Q", messages: { start: "Kamera starten" } })]
 * ```
 */
export function provideOgeBarcodeConfig(
  config: OgeBarcodeConfigInput | (() => OgeBarcodeConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_BARCODE_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeBarcodeConfig(config()), computed),
      }
    : {
        provide: OGE_BARCODE_CONFIG,
        useValue: resolveOgeBarcodeConfig(config),
      };
}
