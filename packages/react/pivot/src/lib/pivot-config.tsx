'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_PIVOT_MESSAGES,
  resolvePivotMessages,
  type OgePivotMessages,
} from '@oge-ui/pivot-engine';

// The catalog and its defaults are single-sourced in `@oge-ui/pivot-engine`
// (ADR 0003), so the two render layers cannot drift; re-exported so React
// consumers import one package.
export { OGE_DEFAULT_PIVOT_MESSAGES, type OgePivotMessages };

const OgePivotMessagesContext = createContext<OgePivotMessages>(
  OGE_DEFAULT_PIVOT_MESSAGES,
);

/**
 * The React counterpart of Angular's `provideOgePivotMessages()` — wrap a
 * subtree to localize every pivot grid beneath it. Nested providers merge
 * over the outer one key by key, and a new `messages` object re-resolves the
 * subtree (switch the language at runtime by passing a new catalog).
 */
export function OgePivotMessagesProvider({
  messages,
  children,
}: {
  messages?: Partial<OgePivotMessages>;
  children?: ReactNode;
}) {
  const parent = useContext(OgePivotMessagesContext);
  const value = useMemo(
    () => resolvePivotMessages(messages, parent),
    [messages, parent],
  );
  return (
    <OgePivotMessagesContext.Provider value={value}>
      {children}
    </OgePivotMessagesContext.Provider>
  );
}

/** The resolved pivot messages for the current subtree. */
export function useOgePivotMessages(): OgePivotMessages {
  return useContext(OgePivotMessagesContext);
}
