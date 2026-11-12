'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_PDF_VIEWER_CONFIG,
  resolveOgePdfViewerConfig,
  type OgePdfViewerConfig,
  type OgePdfViewerConfigInput,
} from '@oge-ui/spreadsheet-engine/pdf';

const OgePdfViewerConfigContext = createContext<OgePdfViewerConfig>(
  OGE_DEFAULT_PDF_VIEWER_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgePdfViewerConfig()`: wrap a
 * subtree to change its defaults. Nested providers merge over the outer one.
 */
export function OgePdfViewerConfigProvider({
  config,
  children,
}: {
  config?: OgePdfViewerConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgePdfViewerConfigContext);
  const value = useMemo<OgePdfViewerConfig>(
    () => resolveOgePdfViewerConfig(config, parent),
    [config, parent],
  );
  return (
    <OgePdfViewerConfigContext.Provider value={value}>
      {children}
    </OgePdfViewerConfigContext.Provider>
  );
}

/** The resolved PDF viewer defaults for the current subtree. */
export function useOgePdfViewerConfig(): OgePdfViewerConfig {
  return useContext(OgePdfViewerConfigContext);
}
