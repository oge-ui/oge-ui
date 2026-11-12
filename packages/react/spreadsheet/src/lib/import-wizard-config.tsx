'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
  resolveOgeImportWizardConfig,
  type OgeImportWizardConfig,
  type OgeImportWizardConfigInput,
} from '@oge-ui/spreadsheet-engine/import';

const OgeImportWizardConfigContext = createContext<OgeImportWizardConfig>(
  OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeImportWizardConfig()`: wrap a
 * subtree to change its defaults. Nested providers merge over the outer one.
 */
export function OgeImportWizardConfigProvider({
  config,
  children,
}: {
  config?: OgeImportWizardConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeImportWizardConfigContext);
  const value = useMemo<OgeImportWizardConfig>(
    () => resolveOgeImportWizardConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeImportWizardConfigContext.Provider value={value}>
      {children}
    </OgeImportWizardConfigContext.Provider>
  );
}

/** The resolved import wizard defaults for the current subtree. */
export function useOgeImportWizardConfig(): OgeImportWizardConfig {
  return useContext(OgeImportWizardConfigContext);
}
