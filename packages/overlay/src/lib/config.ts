import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_OVERLAY_CONFIG,
  resolveOverlayConfig,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
} from '@oge-ui/behavior';

// The config shape, its defaults and the `messages` catalog are
// single-sourced in `@oge-ui/behavior` so the React overlay ships the exact
// same feel and strings (ADR 0001); re-exported so `@oge-ui/overlay` remains
// the Angular import path.
export {
  OGE_DEFAULT_OVERLAY_CONFIG,
  OGE_DEFAULT_OVERLAY_MESSAGES,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
  type OgeOverlayMessages,
} from '@oge-ui/behavior';

export const OGE_OVERLAY_CONFIG = new InjectionToken<OgeOverlayConfig>(
  'OGE_OVERLAY_CONFIG',
  {
    factory: () => OGE_DEFAULT_OVERLAY_CONFIG,
  },
);

/**
 * Application- or component-scoped overlay defaults:
 *
 * ```ts
 * providers: [provideOgeOverlayConfig({ offset: 8, messages: { modalClose: 'Kapat' } })]
 * ```
 */
export function provideOgeOverlayConfig(
  config: OgeOverlayConfigInput,
): Provider {
  return {
    provide: OGE_OVERLAY_CONFIG,
    useValue: resolveOverlayConfig(config),
  };
}
