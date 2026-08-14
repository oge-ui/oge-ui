'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_INPUTS_CONFIG,
  resolveOgeInputsConfig,
  type OgeInputsConfig,
  type OgeInputsConfigInput,
} from '@oge-ui/behavior';

const OgeInputsConfigContext = createContext<OgeInputsConfig>(
  OGE_DEFAULT_INPUTS_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeInputsConfig()` — wrap a
 * subtree to change the editors' defaults and user-facing strings beneath it.
 * Both providers merge over the same `@oge-ui/behavior` defaults.
 */
export function OgeInputsConfigProvider({
  config,
  children,
}: {
  config?: OgeInputsConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeInputsConfig(config), [config]);
  return (
    <OgeInputsConfigContext.Provider value={value}>
      {children}
    </OgeInputsConfigContext.Provider>
  );
}

/** The resolved inputs config for the current subtree. */
export function useOgeInputsConfig(): OgeInputsConfig {
  return useContext(OgeInputsConfigContext);
}
