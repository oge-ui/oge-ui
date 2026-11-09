'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
  resolveOgeWordDocumentConfig,
  type OgeWordDocumentConfig,
  type OgeWordDocumentConfigInput,
} from '@oge-ui/spreadsheet-engine/word';

const OgeWordDocumentConfigContext = createContext<OgeWordDocumentConfig>(
  OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeWordDocumentConfig()`: wrap a
 * subtree to change its defaults. Nested providers merge over the outer one.
 */
export function OgeWordDocumentConfigProvider({
  config,
  children,
}: {
  config?: OgeWordDocumentConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeWordDocumentConfigContext);
  const value = useMemo<OgeWordDocumentConfig>(
    () => resolveOgeWordDocumentConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeWordDocumentConfigContext.Provider value={value}>
      {children}
    </OgeWordDocumentConfigContext.Provider>
  );
}

/** The resolved document defaults for the current subtree. */
export function useOgeWordDocumentConfig(): OgeWordDocumentConfig {
  return useContext(OgeWordDocumentConfigContext);
}
