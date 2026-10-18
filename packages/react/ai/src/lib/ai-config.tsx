'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_AI_CONFIG,
  resolveOgeAiConfig,
  type OgeAiConfig,
  type OgeAiConfigInput,
} from '@oge-ui/behavior';

const OgeAiConfigContext = createContext<OgeAiConfig>(OGE_DEFAULT_AI_CONFIG);

/**
 * The React counterpart of Angular's `provideOgeAiConfig()` — wrap a subtree
 * to set the transport and the AI defaults beneath it. Nested providers merge
 * over the outer one, nested objects key by key.
 *
 * ```tsx
 * <OgeAiConfigProvider config={{ transport: createOgeAiHttpTransport({ url: '/api/ai' }) }}>
 *   <App />
 * </OgeAiConfigProvider>
 * ```
 */
export function OgeAiConfigProvider({
  config,
  children,
}: {
  config?: OgeAiConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeAiConfigContext);
  const value = useMemo<OgeAiConfig>(
    () => resolveOgeAiConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeAiConfigContext.Provider value={value}>
      {children}
    </OgeAiConfigContext.Provider>
  );
}

/** The resolved AI defaults for the current subtree. */
export function useOgeAiConfig(): OgeAiConfig {
  return useContext(OgeAiConfigContext);
}
