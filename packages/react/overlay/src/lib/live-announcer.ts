'use client';

import { useMemo } from 'react';
import {
  getOgeLiveAnnouncer,
  type OgeLiveAnnounceOptions,
  type OgeLivePoliteness,
} from '@oge-ui/behavior';

/** What {@link useOgeLiveAnnouncer} returns — stable across renders. */
export interface OgeLiveAnnouncerHandle {
  /** Announces `message` politely (default) or assertively. */
  announce(
    message: string,
    options?: OgeLiveAnnounceOptions | OgeLivePoliteness,
  ): void;
  /** Empties one region (or both) and drops anything still pending. */
  clear(politeness?: OgeLivePoliteness): void;
}

/**
 * The React handle on the document's shared live regions (one polite, one
 * assertive — `@oge-ui/behavior`'s `OgeLiveAnnouncerCore`), so components
 * never render their own. Identical messages inside a second are dropped, a
 * newer message inside the write delay supersedes the pending one, and each
 * message is cleared after a few seconds so the same text is announced again
 * next time. The document is resolved on each call, never during render, so
 * the hook is SSR-safe; call `announce` from handlers or effects.
 *
 * ```tsx
 * const announcer = useOgeLiveAnnouncer();
 * const save = () => announcer.announce('Changes saved');
 * ```
 */
export function useOgeLiveAnnouncer(): OgeLiveAnnouncerHandle {
  return useMemo<OgeLiveAnnouncerHandle>(
    () => ({
      announce: (message, options) =>
        getOgeLiveAnnouncer().announce(message, options),
      clear: (politeness) => getOgeLiveAnnouncer().clear(politeness),
    }),
    [],
  );
}
