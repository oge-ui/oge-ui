'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_BUTTONS_CONFIG,
  resolveOgeButtonsConfig,
  type OgeButtonsConfig,
  type OgeButtonsConfigInput,
} from '@oge-ui/behavior';

// The shape, the defaults and the merge come from `@oge-ui/behavior`, the same
// module the Angular package reads (ADR 0001). Only the delivery mechanism is
// framework-shaped: an injection token there, a context provider here.
export type {
  OgeButtonsConfig,
  OgeButtonsConfigInput,
  OgeButtonsMessages,
} from '@oge-ui/behavior';
export {
  OGE_DEFAULT_BUTTONS_CONFIG,
  OGE_DEFAULT_BUTTONS_MESSAGES,
} from '@oge-ui/behavior';

const OgeButtonsConfigContext = createContext<OgeButtonsConfig>(
  OGE_DEFAULT_BUTTONS_CONFIG,
);

export interface OgeButtonsConfigProviderProps {
  /** Partial overrides; `messages` is shallow-merged onto the defaults. */
  config?: OgeButtonsConfigInput;
  children?: ReactNode;
}

/**
 * Application- or subtree-scoped button defaults — the React counterpart of
 * Angular's `provideOgeButtonsConfig()`:
 *
 * ```tsx
 * <OgeButtonsConfigProvider config={{ clickGuardMs: 300 }}>
 *   <App />
 * </OgeButtonsConfigProvider>
 * ```
 */
export function OgeButtonsConfigProvider({
  config,
  children,
}: OgeButtonsConfigProviderProps) {
  const value = useMemo(() => resolveOgeButtonsConfig(config), [config]);
  return (
    <OgeButtonsConfigContext.Provider value={value}>
      {children}
    </OgeButtonsConfigContext.Provider>
  );
}

/** Reads the nearest button configuration (defaults when no provider is set). */
export function useOgeButtonsConfig(): OgeButtonsConfig {
  return useContext(OgeButtonsConfigContext);
}
