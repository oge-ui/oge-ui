'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_KANBAN_CONFIG,
  resolveOgeKanbanConfig,
  type OgeKanbanConfig,
  type OgeKanbanConfigInput,
} from '@oge-ui/kanban-engine';

const OgeKanbanConfigContext = createContext<OgeKanbanConfig>(
  OGE_DEFAULT_KANBAN_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeKanbanConfig()` — wrap a
 * subtree to change the Kanban defaults beneath it: `messages` (merged block
 * by block), `locale` and `cardHeight`. Nested providers merge over the outer
 * one, and a new `config` object re-resolves the subtree (switching the UI
 * language at runtime is a state change, nothing more).
 */
export function OgeKanbanConfigProvider({
  config,
  children,
}: {
  config?: OgeKanbanConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeKanbanConfigContext);
  const value = useMemo<OgeKanbanConfig>(
    () => resolveOgeKanbanConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeKanbanConfigContext.Provider value={value}>
      {children}
    </OgeKanbanConfigContext.Provider>
  );
}

/** The resolved Kanban defaults for the current subtree. */
export function useOgeKanbanConfig(): OgeKanbanConfig {
  return useContext(OgeKanbanConfigContext);
}
