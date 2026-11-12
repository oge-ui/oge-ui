import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
  resolveOgeImportWizardConfig,
  type OgeImportWizardConfig,
  type OgeImportWizardConfigInput,
} from '@oge-ui/spreadsheet-engine/import';

export const OGE_IMPORT_WIZARD_CONFIG =
  new InjectionToken<OgeImportWizardConfig>('OGE_IMPORT_WIZARD_CONFIG', {
    factory: () => OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
  });

/**
 * Configures every `<oge-import-wizard>` below the provider: partial
 * `messages` merged over the defaults and `parse` (decimal separator, date
 * order, boolean words). A function makes the config live, so a signal it
 * reads can switch the UI language without a reload.
 */
export function provideOgeImportWizardConfig(
  config: OgeImportWizardConfigInput | (() => OgeImportWizardConfigInput),
): Provider {
  return typeof config === 'function'
    ? {
        provide: OGE_IMPORT_WIZARD_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeImportWizardConfig(config()), computed),
      }
    : {
        provide: OGE_IMPORT_WIZARD_CONFIG,
        useValue: resolveOgeImportWizardConfig(config),
      };
}
