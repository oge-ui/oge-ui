import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
  resolveOgeWordDocumentConfig,
  type OgeWordDocumentConfig,
  type OgeWordDocumentConfigInput,
} from '@oge-ui/spreadsheet-engine/word';

export const OGE_WORD_DOCUMENT_CONFIG =
  new InjectionToken<OgeWordDocumentConfig>('OGE_WORD_DOCUMENT_CONFIG', {
    factory: () => OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
  });

/**
 * Configures every `<oge-word-document>` below the provider. A partial
 * `messages` merges over the defaults; a function makes the config live, so
 * a signal it reads can switch the UI language without a reload.
 */
export function provideOgeWordDocumentConfig(
  config: OgeWordDocumentConfigInput | (() => OgeWordDocumentConfigInput),
): Provider {
  return typeof config === 'function'
    ? {
        provide: OGE_WORD_DOCUMENT_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeWordDocumentConfig(config()), computed),
      }
    : {
        provide: OGE_WORD_DOCUMENT_CONFIG,
        useValue: resolveOgeWordDocumentConfig(config),
      };
}
