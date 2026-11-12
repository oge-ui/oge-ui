import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_PDF_VIEWER_CONFIG,
  resolveOgePdfViewerConfig,
  type OgePdfViewerConfig,
  type OgePdfViewerConfigInput,
} from '@oge-ui/spreadsheet-engine/pdf';

export const OGE_PDF_VIEWER_CONFIG = new InjectionToken<OgePdfViewerConfig>(
  'OGE_PDF_VIEWER_CONFIG',
  { factory: () => OGE_DEFAULT_PDF_VIEWER_CONFIG },
);

/**
 * Configures every `<oge-pdf-viewer>` below the provider: the pdf.js worker
 * URL (`workerSrc`), a custom pdf.js loader (`pdfjs`) and partial `messages`
 * merged over the defaults. A function makes the config live, so a signal it
 * reads can switch the UI language without a reload.
 */
export function provideOgePdfViewerConfig(
  config: OgePdfViewerConfigInput | (() => OgePdfViewerConfigInput),
): Provider {
  return typeof config === 'function'
    ? {
        provide: OGE_PDF_VIEWER_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgePdfViewerConfig(config()), computed),
      }
    : {
        provide: OGE_PDF_VIEWER_CONFIG,
        useValue: resolveOgePdfViewerConfig(config),
      };
}
