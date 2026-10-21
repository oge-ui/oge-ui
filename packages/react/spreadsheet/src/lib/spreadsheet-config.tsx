'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  resolveOgeSpreadsheetConfig,
  type OgeSpreadsheetConfig,
  type OgeSpreadsheetConfigInput,
} from '@oge-ui/spreadsheet-engine';

const OgeSpreadsheetConfigContext = createContext<OgeSpreadsheetConfig>(
  OGE_DEFAULT_SPREADSHEET_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeSpreadsheetConfig()` — wrap a
 * subtree to change the spreadsheet defaults beneath it: `messages` (merged
 * over the defaults) and `locale`. Nested providers merge over the outer one,
 * and a new `config` object re-resolves the subtree (switching the UI
 * language at runtime is a state change, nothing more).
 */
export function OgeSpreadsheetConfigProvider({
  config,
  children,
}: {
  config?: OgeSpreadsheetConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeSpreadsheetConfigContext);
  const value = useMemo<OgeSpreadsheetConfig>(
    () => resolveOgeSpreadsheetConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeSpreadsheetConfigContext.Provider value={value}>
      {children}
    </OgeSpreadsheetConfigContext.Provider>
  );
}

/** The resolved spreadsheet defaults for the current subtree. */
export function useOgeSpreadsheetConfig(): OgeSpreadsheetConfig {
  return useContext(OgeSpreadsheetConfigContext);
}
