import { InjectionToken, type Provider } from '@angular/core';

/**
 * Behavioral defaults of the overlay primitives. The overlay renders no
 * user-facing strings, so — uniquely among oge packages — there is no
 * `messages` block; consumer components (drop-down button etc.) own their
 * own i18n.
 */
export interface OgeOverlayConfig {
  /** Gap between anchor and panel on the main axis. */
  offset: number;
  /** Minimum distance kept from viewport edges when clamping. */
  viewportPadding: number;
  /** Idle time after which the menu type-ahead buffer resets. */
  typeAheadMs: number;
  /** Hover dwell time before a tooltip shows (focus shows immediately). */
  tooltipShowDelayMs: number;
  /** Grace period before a tooltip hides after the pointer leaves. */
  tooltipHideDelayMs: number;
}

export const OGE_DEFAULT_OVERLAY_CONFIG: OgeOverlayConfig = {
  offset: 4,
  viewportPadding: 8,
  typeAheadMs: 500,
  tooltipShowDelayMs: 400,
  tooltipHideDelayMs: 100,
};

export const OGE_OVERLAY_CONFIG = new InjectionToken<OgeOverlayConfig>(
  'OGE_OVERLAY_CONFIG',
  {
    factory: () => OGE_DEFAULT_OVERLAY_CONFIG,
  },
);

export type OgeOverlayConfigInput = Partial<OgeOverlayConfig>;

/**
 * Application- or component-scoped overlay defaults:
 *
 * ```ts
 * providers: [provideOgeOverlayConfig({ offset: 8 })]
 * ```
 */
export function provideOgeOverlayConfig(
  config: OgeOverlayConfigInput,
): Provider {
  return {
    provide: OGE_OVERLAY_CONFIG,
    useValue: {
      ...OGE_DEFAULT_OVERLAY_CONFIG,
      ...config,
    } satisfies OgeOverlayConfig,
  };
}
