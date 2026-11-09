'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_PRESENTATION_CONFIG,
  resolveOgePresentationConfig,
  type OgePresentationConfig,
  type OgePresentationConfigInput,
} from '@oge-ui/spreadsheet-engine/powerpoint';

const OgePresentationConfigContext = createContext<OgePresentationConfig>(
  OGE_DEFAULT_PRESENTATION_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgePresentationConfig()`: wrap a
 * subtree to change its defaults. Nested providers merge over the outer one.
 */
export function OgePresentationConfigProvider({
  config,
  children,
}: {
  config?: OgePresentationConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgePresentationConfigContext);
  const value = useMemo<OgePresentationConfig>(
    () => resolveOgePresentationConfig(config, parent),
    [config, parent],
  );
  return (
    <OgePresentationConfigContext.Provider value={value}>
      {children}
    </OgePresentationConfigContext.Provider>
  );
}

/** The resolved presentation defaults for the current subtree. */
export function useOgePresentationConfig(): OgePresentationConfig {
  return useContext(OgePresentationConfigContext);
}
