import { OGE_DEFAULT_TOAST_DEFAULTS } from './toast-core';
import type { OgeToastPosition } from './toast-core';
import {
  OGE_DEFAULT_OVERLAY_TIMINGS,
  type OgeOverlayTimings,
} from './overlay-timings';

/**
 * User-facing strings rendered by the overlay surfaces. The anchored
 * popup/menu/tooltip primitives are chrome-free (their consumers own i18n);
 * only the modal and the toast render text of their own.
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
 * Behavioral defaults of every overlay surface, shared by both render layers
 * (ADR 0001): the anchored-primitive timings, the toast defaults and the
 * `messages` block. The Angular `OGE_OVERLAY_CONFIG` token and the React
 * `<OgeOverlayConfigProvider>` both resolve against this one object.
 */
export interface OgeOverlayConfig extends OgeOverlayTimings {
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
  ...OGE_DEFAULT_OVERLAY_TIMINGS,
  toastPosition: OGE_DEFAULT_TOAST_DEFAULTS.position,
  toastDisplayTime: OGE_DEFAULT_TOAST_DEFAULTS.displayTime,
  toastMaxVisible: OGE_DEFAULT_TOAST_DEFAULTS.maxVisible,
  toastProgressBar: OGE_DEFAULT_TOAST_DEFAULTS.progressBar,
  toastCoalesceDuplicates: OGE_DEFAULT_TOAST_DEFAULTS.coalesceDuplicates,
  messages: OGE_DEFAULT_OVERLAY_MESSAGES,
};

/** Partial config with a partial `messages` block, as both providers accept. */
export type OgeOverlayConfigInput = Partial<
  Omit<OgeOverlayConfig, 'messages'>
> & {
  messages?: Partial<OgeOverlayMessages>;
};

/** Merges a config input over the defaults (messages merged one level deep). */
export function resolveOverlayConfig(
  input: OgeOverlayConfigInput | undefined,
  base: OgeOverlayConfig = OGE_DEFAULT_OVERLAY_CONFIG,
): OgeOverlayConfig {
  const { messages, ...rest } = input ?? {};
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}
