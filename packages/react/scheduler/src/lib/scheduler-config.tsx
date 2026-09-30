'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_SCHEDULER_CONFIG,
  resolveOgeSchedulerConfig,
  type OgeSchedulerConfig,
  type OgeSchedulerConfigInput,
} from '@oge-ui/scheduler-engine';

const OgeSchedulerConfigContext = createContext<OgeSchedulerConfig>(
  OGE_DEFAULT_SCHEDULER_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeSchedulerConfig()` — wrap a
 * subtree to change the scheduler defaults (messages, locale, minimum chip
 * height) beneath it. The merge is shallow per top-level key: a partial
 * `messages` replaces whole nested blocks (`toolbar`, `editor`, …). Nested
 * providers merge over the outer one, and a new `config` object re-resolves
 * the subtree — pass a fresh object to switch the UI language at runtime.
 *
 * ```tsx
 * <OgeSchedulerConfigProvider config={{ locale: 'de' }}>
 *   <OgeScheduler dataSource={appointments} />
 * </OgeSchedulerConfigProvider>
 * ```
 */
export function OgeSchedulerConfigProvider({
  config,
  children,
}: {
  config?: OgeSchedulerConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeSchedulerConfigContext);
  const value = useMemo<OgeSchedulerConfig>(
    () => resolveOgeSchedulerConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeSchedulerConfigContext.Provider value={value}>
      {children}
    </OgeSchedulerConfigContext.Provider>
  );
}

/** The resolved scheduler defaults for the current subtree. */
export function useOgeSchedulerConfig(): OgeSchedulerConfig {
  return useContext(OgeSchedulerConfigContext);
}
