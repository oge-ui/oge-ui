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
  /** Primary button of the `confirm()` / `alert()` / `prompt()` dialog helpers. */
  dialogOk?: string;
  /** Cancel button of the `confirm()` / `prompt()` dialog helpers. */
  dialogCancel?: string;
  /** Default title of a `confirm()` dialog opened without one. */
  dialogConfirmTitle?: string;
  /** Default title of an `alert()` dialog opened without one. */
  dialogAlertTitle?: string;
  /** Default title of a `prompt()` dialog opened without one. */
  dialogPromptTitle?: string;
  /** Error shown when a `required` prompt is submitted empty. */
  dialogRequired?: string;
  /** Aria label of a window's minimize button. */
  windowMinimize?: string;
  /** Announced after a keyboard move; `{x}` / `{y}` are the new position in px. */
  windowMoved?: string;
  /** Announced after a keyboard resize; `{width}` / `{height}` are the new size in px. */
  windowResized?: string;
  /**
   * Aria label of a popover's close (✕) button. Optional so catalogs written
   * before the popover still type-check; `resolveOverlayConfig` fills it
   * from English.
   */
  popoverClose?: string;
}

export const OGE_DEFAULT_OVERLAY_MESSAGES: OgeOverlayMessages = {
  modalClose: 'Close',
  modalMaximize: 'Maximize',
  modalRestore: 'Restore',
  toastClose: 'Close',
  toastRegionLabel: 'Notifications',
  toastCountBadge: '×{count}',
  dialogOk: 'OK',
  dialogCancel: 'Cancel',
  dialogConfirmTitle: 'Confirm',
  dialogAlertTitle: 'Notice',
  dialogPromptTitle: 'Enter a value',
  dialogRequired: 'This field is required.',
  windowMinimize: 'Minimize',
  windowMoved: 'Window moved to {x}, {y}',
  windowResized: 'Window resized to {width} by {height}',
  popoverClose: 'Close',
};

/**
 * Reads an optional message key, falling back to the English default — the
 * keys added after 1.1 are optional so existing catalogs keep type-checking.
 */
export function ogeOverlayMessage(
  messages: Partial<OgeOverlayMessages> | undefined,
  key: keyof OgeOverlayMessages,
): string {
  return messages?.[key] ?? OGE_DEFAULT_OVERLAY_MESSAGES[key] ?? '';
}

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
