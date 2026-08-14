'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_TABS_CONFIG,
  resolveOgeTabsConfig,
  type OgeTabsConfig,
  type OgeTabsConfigInput,
} from '@oge-ui/behavior';

const OgeTabsConfigContext = createContext<OgeTabsConfig>(
  OGE_DEFAULT_TABS_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeTabsConfig()` — wrap a
 * subtree to change the tabs' user-facing strings beneath it. Both providers
 * merge over the same `@oge-ui/behavior` defaults.
 */
export function OgeTabsConfigProvider({
  config,
  children,
}: {
  config?: OgeTabsConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeTabsConfig(config), [config]);
  return (
    <OgeTabsConfigContext.Provider value={value}>
      {children}
    </OgeTabsConfigContext.Provider>
  );
}

/** The resolved tabs config for the current subtree. */
export function useOgeTabsConfig(): OgeTabsConfig {
  return useContext(OgeTabsConfigContext);
}
