import { InjectionToken, type Provider } from '@angular/core';
import type { OgeToastPosition } from './toast/toast-types';

/**
 * User-facing strings rendered by the overlay primitives. The anchored
 * popup/menu/tooltip primitives are chrome-free (their consumers own i18n);
 * only the modal renders text of its own.
 */
export interface OgeOverlayMessages {
  /** Aria label of the modal's close (✕) button. */
  modalClose: string;
  /** Aria label of the modal's maximize button (windowed state). */
  modalMaximize: string;
  /** Aria label of the modal's restore button (full-screen state). */
  modalRestore: string;
  /** Aria label of a toast's close (✕) button. */
  toastClose: string;
  /** Aria label of each toast region. */
  toastRegionLabel: string;
  /** Coalesced-duplicate badge; `{count}` is replaced with the count. */
  toastCountBadge: string;
}

export const OGE_DEFAULT_OVERLAY_MESSAGES: OgeOverlayMessages = {
  modalClose: 'Close',
  modalMaximize: 'Maximize',
  modalRestore: 'Restore',
  toastClose: 'Close',
  toastRegionLabel: 'Notifications',
  toastCountBadge: '×{count}',
};

/**
 * Behavioral defaults of the overlay primitives, plus the small `messages`
 * block used by the modal (the anchored primitives render no strings of their
 * own — consumer components such as the drop-down button own their i18n).
 */
export interface OgeOverlayConfig {
  /** Gap between anchor and panel on the main axis. */
  offset: number;
  /** Minimum distance kept from viewport edges when clamping. */
  viewportPadding: number;
  /** Idle time after which the menu type-ahead buffer resets. */
  typeAheadMs: number;
  /** Hover dwell time before a submenu parent row opens its submenu. */
  menuShowDelayMs: number;
  /** Grace period before an open submenu closes after hovering a sibling. */
  menuHideDelayMs: number;
  /** Hover dwell time before a tooltip shows (focus shows immediately). */
  tooltipShowDelayMs: number;
  /** Grace period before a tooltip hides after the pointer leaves. */
  tooltipHideDelayMs: number;
  /** Default toast stack position. */
  toastPosition: OgeToastPosition;
  /** Default toast auto-dismiss time in ms. */
  toastDisplayTime: number;
  /** Max simultaneously visible toasts per position; extras queue FIFO. */
  toastMaxVisible: number;
  /** Show the remaining-time progress bar on toasts by default. */
  toastProgressBar: boolean;
  /** Coalesce identical toasts into one with a count badge by default. */
  toastCoalesceDuplicates: boolean;
  /** User-facing strings (modal/toast buttons and labels). */
  messages: OgeOverlayMessages;
}

export const OGE_DEFAULT_OVERLAY_CONFIG: OgeOverlayConfig = {
  offset: 4,
  viewportPadding: 8,
  typeAheadMs: 500,
  menuShowDelayMs: 50,
  menuHideDelayMs: 300,
  tooltipShowDelayMs: 400,
  tooltipHideDelayMs: 100,
  toastPosition: 'bottom-end',
  toastDisplayTime: 4000,
  toastMaxVisible: 5,
  toastProgressBar: false,
  toastCoalesceDuplicates: false,
  messages: OGE_DEFAULT_OVERLAY_MESSAGES,
};

export const OGE_OVERLAY_CONFIG = new InjectionToken<OgeOverlayConfig>(
  'OGE_OVERLAY_CONFIG',
  {
    factory: () => OGE_DEFAULT_OVERLAY_CONFIG,
  },
);

export type OgeOverlayConfigInput = Partial<
  Omit<OgeOverlayConfig, 'messages'>
> & {
  messages?: Partial<OgeOverlayMessages>;
};

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
  const { messages, ...rest } = config;
  return {
    provide: OGE_OVERLAY_CONFIG,
    useValue: {
      ...OGE_DEFAULT_OVERLAY_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_OVERLAY_MESSAGES, ...messages },
    } satisfies OgeOverlayConfig,
  };
}
