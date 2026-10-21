import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  resolveOgeSpreadsheetConfig,
  type OgeSpreadsheetConfig,
  type OgeSpreadsheetConfigInput,
} from '@oge-ui/spreadsheet-engine';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/spreadsheet-engine`, so the two render layers cannot drift
// (ADR 0003); re-exported so Angular consumers import one package.
export {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  OGE_DEFAULT_SPREADSHEET_MESSAGES,
  type OgeSpreadsheetConfig,
  type OgeSpreadsheetConfigInput,
  type OgeSpreadsheetMessages,
} from '@oge-ui/spreadsheet-engine';

export const OGE_SPREADSHEET_CONFIG = new InjectionToken<OgeSpreadsheetConfig>(
  'OGE_SPREADSHEET_CONFIG',
  { factory: () => OGE_DEFAULT_SPREADSHEET_CONFIG },
);

/**
 * Configures every `<oge-spreadsheet>` below the provider. A partial
 * `messages` merges over the defaults.
 */
export function provideOgeSpreadsheetConfig(
  config: OgeSpreadsheetConfigInput | (() => OgeSpreadsheetConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_SPREADSHEET_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeSpreadsheetConfig(config()), computed),
      }
    : {
        provide: OGE_SPREADSHEET_CONFIG,
        useValue: resolveOgeSpreadsheetConfig(config),
      };
}
