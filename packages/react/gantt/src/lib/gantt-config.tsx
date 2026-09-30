'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_GANTT_CONFIG,
  resolveGanttConfig,
  type OgeGanttConfig,
  type OgeGanttConfigInput,
} from '@oge-ui/gantt-engine';

const OgeGanttConfigContext = createContext<OgeGanttConfig>(
  OGE_DEFAULT_GANTT_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeGanttConfig()` — wrap a
 * subtree to change the Gantt defaults beneath it (messages, `locale`,
 * `rowHeight`, `undoLimit`). Nested providers merge over the outer one,
 * messages block by block; a new `config` object re-resolves, so switching
 * the UI language at runtime is a state change, the React face of Angular's
 * live `provideOgeGanttConfig(() => …)`.
 */
export function OgeGanttConfigProvider({
  config,
  children,
}: {
  config?: OgeGanttConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeGanttConfigContext);
  const value = useMemo<OgeGanttConfig>(
    () => resolveGanttConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeGanttConfigContext.Provider value={value}>
      {children}
    </OgeGanttConfigContext.Provider>
  );
}

/** The resolved Gantt defaults for the current subtree. */
export function useOgeGanttConfig(): OgeGanttConfig {
  return useContext(OgeGanttConfigContext);
}
