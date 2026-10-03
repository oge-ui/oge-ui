'use client';

import { useEffect, useState } from 'react';
import {
  matchesAdaptiveViewport,
  resolveAdaptivePresentation,
  watchAdaptiveViewport,
  type OgeAdaptiveMode,
  type OgeAdaptivePresentation,
} from '@oge-ui/behavior';

/**
 * Whether the viewport is narrower than `breakpoint` — follows `matchMedia`
 * crossings. `false` on the server and in the first client render (so the
 * hydrated markup matches the server's), then corrected in an effect.
 */
export function useOgeAdaptiveViewport(breakpoint: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    setNarrow(matchesAdaptiveViewport(breakpoint));
    return watchAdaptiveViewport(breakpoint, setNarrow);
  }, [breakpoint]);
  return narrow;
}

/**
 * The presentation a popup editor renders — `'popup'` unless `mode` is
 * `'auto'` and the viewport is narrower than `breakpoint`, then `kind`.
 * Pass the result to `<OgePopup adaptive>`.
 */
export function useOgeAdaptivePresentation(
  mode: OgeAdaptiveMode,
  breakpoint: number,
  kind: Exclude<OgeAdaptivePresentation, 'popup'> = 'sheet',
): OgeAdaptivePresentation {
  const narrow = useOgeAdaptiveViewport(breakpoint);
  return resolveAdaptivePresentation(mode, narrow, kind);
}
