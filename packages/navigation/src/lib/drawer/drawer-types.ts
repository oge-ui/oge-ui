import type { OgeDrawerLayoutMode } from '@oge-ui/core';

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
