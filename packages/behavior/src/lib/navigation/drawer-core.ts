import type { OgeDrawerLayoutMode } from '@oge-ui/core';

/**
 * The framework-free half of the drawer (ADR 0001): its vocabulary, the event
 * payloads, the message catalog and the config merge rule. The mode
 * resolution itself (`compactBelow` downgrades, modality derivation) already
 * lives in `@oge-ui/core`'s `drawer-mode` and is shared through it.
 */

/**
 * How the drawer sits next to its content: `'overlay'` floats over it,
 * `'push'` shifts it aside without resizing it, `'side'` shrinks it so both
 * share the row.
 *
 * Modality is **derived from this**, never configured separately: `'overlay'`
 * and `'push'` displace or cover the content and are therefore modal, while
 * `'side'` is part of the layout and is therefore a persistent landmark. An
 * independent `modal` flag is exactly what lets a drawer claim
 * `role="complementary"` and `aria-modal="true"` at the same time.
 */
export type OgeDrawerMode = OgeDrawerLayoutMode;

// The mode decision itself is core arithmetic; re-exported here so a render
// layer needs only this package to build a drawer.
export {
  resolveDrawerMode,
  type OgeDrawerModeRequest,
  type OgeDrawerModeResult,
} from '@oge-ui/core';

/**
 * Edge the drawer is attached to. Logical, so `'start'` and `'end'` mirror in
 * RTL on their own — there is no `rtlEnabled` flag anywhere in this suite.
 */
export type OgeDrawerPosition = 'start' | 'end' | 'top' | 'bottom';

/**
 * Landmark role of a **persistent** (`mode: 'side'`) drawer. `'navigation'`
 * for a group of navigation links, `'complementary'` for supporting content
 * that still makes sense on its own, `'region'` as the labelled fallback.
 * Ignored while the drawer is modal, which is always `role="dialog"`.
 */
export type OgeDrawerLandmark = 'navigation' | 'complementary' | 'region';

/** Where focus goes when a modal drawer opens. */
export type OgeDrawerAutoFocus =
  'first-tabbable' | 'panel' | 'none' | (string & {});

/** Why the drawer closed. */
export type OgeDrawerCloseReason =
  'api' | 'escape' | 'backdrop' | 'outside' | 'compact';

/** Cancelable pre-event for the drawer opening. */
export interface OgeDrawerOpeningEvent {
  cancel: boolean;
}

/** Cancelable pre-event for the drawer closing. */
export interface OgeDrawerClosingEvent {
  cancel: boolean;
  reason: OgeDrawerCloseReason;
}

/** The drawer finished closing. */
export interface OgeDrawerClosedEvent {
  reason: OgeDrawerCloseReason;
}

/** The resolved layout mode changed, usually because the container resized. */
export interface OgeDrawerModeChangedEvent {
  /** The mode actually rendering now. */
  mode: OgeDrawerMode;
  /** The mode the application asked for. */
  requestedMode: OgeDrawerMode;
  /** `true` when `compactBelow` forced the downgrade to `'overlay'`. */
  compact: boolean;
}

// --- config ----------------------------------------------------------------

/** Every user-facing string the drawer renders, including aria labels. */
export interface OgeDrawerMessages {
  /** Accessible name of the panel when the application supplies none. */
  drawer: string;
  /** Label and tooltip of the built-in close button. */
  close: string;
}

export const OGE_DEFAULT_DRAWER_MESSAGES: OgeDrawerMessages = {
  drawer: 'Drawer',
  close: 'Close drawer',
};

export interface OgeDrawerConfig {
  messages: OgeDrawerMessages;
  /** Default for the `mode` input. */
  mode?: OgeDrawerMode;
  /** Default for the `position` input. */
  position?: OgeDrawerPosition;
  /** Default for the `size` input. */
  size?: number | string;
}

export const OGE_DEFAULT_DRAWER_CONFIG: OgeDrawerConfig = {
  messages: OGE_DEFAULT_DRAWER_MESSAGES,
};

export type OgeDrawerConfigInput = Partial<
  Omit<OgeDrawerConfig, 'messages'>
> & {
  messages?: Partial<OgeDrawerMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeDrawerConfig(
  input: OgeDrawerConfigInput | undefined,
): OgeDrawerConfig {
  return {
    ...OGE_DEFAULT_DRAWER_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_DRAWER_MESSAGES, ...input?.messages },
  };
}
