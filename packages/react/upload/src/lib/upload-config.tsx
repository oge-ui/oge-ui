'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_UPLOAD_CONFIG,
  createXhrUploadAdapter,
  resolveUploadConfig,
  type OgeUploadAdapter,
  type OgeUploadConfig,
  type OgeUploadConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/behavior`, so the two render layers cannot drift (ADR 0001);
// re-exported so React consumers import one package.
export type {
  OgeUploadConfig,
  OgeUploadConfigInput,
  OgeUploadMessages,
  OgeUploadMessagesInput,
  OgeUploadButtonMessages,
  OgeUploadDropZoneMessages,
  OgeUploadStatusMessages,
  OgeUploadValidationMessages,
  OgeUploadAnnouncementMessages,
} from '@oge-ui/behavior';

const OgeUploadConfigContext = createContext<OgeUploadConfig>(
  OGE_DEFAULT_UPLOAD_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeUploadConfig()` — wrap a
 * subtree to change the uploader defaults beneath it. Nested providers merge
 * over the outer one, messages group by group.
 */
export function OgeUploadConfigProvider({
  config,
  children,
}: {
  config?: OgeUploadConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeUploadConfigContext);
  const value = useMemo<OgeUploadConfig>(
    () => resolveUploadConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeUploadConfigContext.Provider value={value}>
      {children}
    </OgeUploadConfigContext.Provider>
  );
}

/** The resolved uploader defaults for the current subtree. */
export function useOgeUploadConfig(): OgeUploadConfig {
  return useContext(OgeUploadConfigContext);
}

let defaultAdapter: OgeUploadAdapter | null = null;

const OgeUploadTransportContext = createContext<OgeUploadAdapter | null>(null);

/**
 * The transport every uploader resolves unless one is bound to
 * `uploadAdapter` — the React counterpart of Angular's `OGE_UPLOAD_TRANSPORT`
 * token. Substitute it for a whole subtree: jsdom's XHR performs real network
 * I/O, and a static docs deploy answers `POST /api/upload` with the SPA
 * rewrite's 200, so both tests and demos want a fake here.
 */
export function OgeUploadTransportProvider({
  adapter,
  children,
}: {
  adapter: OgeUploadAdapter;
  children?: ReactNode;
}) {
  return (
    <OgeUploadTransportContext.Provider value={adapter}>
      {children}
    </OgeUploadTransportContext.Provider>
  );
}

/** The transport for the current subtree — XHR unless a provider replaced it. */
export function useOgeUploadTransport(): OgeUploadAdapter {
  const provided = useContext(OgeUploadTransportContext);
  if (provided) return provided;
  defaultAdapter ??= createXhrUploadAdapter();
  return defaultAdapter;
}
