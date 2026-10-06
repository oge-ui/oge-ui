/**
 * The framework-free half of the floating action button and the speed dial
 * (W8a): the vocabulary, the message catalog, the dial direction, the
 * keyboard maps and the roving-focus arithmetic.
 *
 * The speed dial follows the WAI-ARIA APG **menu button** pattern: the FAB
 * is a `<button aria-haspopup="menu" aria-expanded aria-controls>`, the
 * actions are `role="menuitem"`s in a `role="menu"`, focus moves into the
 * menu when it opens (first action nearest the FAB), the arrows move along
 * the dial's axis and wrap (menus wrap), Escape closes and returns focus to
 * the FAB, Tab closes and lets focus continue.
 */
import type { OgeButtonSeverity } from './button-types';

/** Screen corner / edge the FAB is pinned to (logical: RTL mirrors). */
export type OgeFabPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

/**
 * `fixed` pins to the viewport (safe-area insets as a floor), `absolute` to
 * the nearest positioned ancestor, `static` leaves the FAB in the flow.
 */
export type OgeFabPositionMode = 'fixed' | 'absolute' | 'static';

/** Size preset — 40 / 56 / 72 px. */
export type OgeFabSize = 'sm' | 'md' | 'lg';

/** Colour of the FAB — the button severity vocabulary (default `accent`). */
export type OgeFabSeverity = OgeButtonSeverity;

/** Direction the speed dial's actions unfold in (logical for start/end). */
export type OgeSpeedDialDirection = 'up' | 'down' | 'start' | 'end';

/** `click` toggles on press; `hover` also opens on pointer hover / focus. */
export type OgeSpeedDialOpenMode = 'click' | 'hover';

/**
 * How the actions' text labels show: `hover` beside the focused / hovered
 * action, `always` beside every action while open, `none` never (the label
 * stays the accessible name).
 */
export type OgeSpeedDialLabelMode = 'hover' | 'always' | 'none';

/** One action of a speed dial. */
export interface OgeSpeedDialItem {
  /** Stable identity — `itemClick` reports it. */
  key: string | number;
  /** Label: the accessible name and the tooltip-style text. */
  label: string;
  /** SVG path data (`d`) of the action's icon. */
  icon?: string;
  /** Rendered but not operable (`aria-disabled`, skipped by the arrows). */
  disabled?: boolean;
  /** Per-action colour. */
  severity?: OgeFabSeverity;
}

/** Every user-facing string the FAB family renders, aria labels included. */
export interface OgeFabMessages {
  /** Accessible name of a speed dial whose application supplies no `label`. */
  speedDial: string;
}

export const OGE_DEFAULT_FAB_MESSAGES: OgeFabMessages = {
  speedDial: 'Actions',
};

/** Application-wide defaults for `oge-fab` and `oge-speed-dial`. */
export interface OgeFabConfig {
  messages: OgeFabMessages;
  /** Default for the `position` input (`bottom-end`). */
  position?: OgeFabPosition;
  /** Default for the `positionMode` input (`fixed`). */
  positionMode?: OgeFabPositionMode;
  /** Default for the `size` input (`md`). */
  size?: OgeFabSize;
  /** Default for the `severity` input (`accent`). */
  severity?: OgeFabSeverity;
}

export const OGE_DEFAULT_FAB_CONFIG: OgeFabConfig = {
  messages: OGE_DEFAULT_FAB_MESSAGES,
};

export type OgeFabConfigInput = Partial<Omit<OgeFabConfig, 'messages'>> & {
  messages?: Partial<OgeFabMessages>;
};

export function resolveOgeFabConfig(
  input: OgeFabConfigInput | undefined,
): OgeFabConfig {
  return {
    ...OGE_DEFAULT_FAB_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_FAB_MESSAGES, ...input?.messages },
  };
}

/** The default glyph of a speed dial's FAB: a plus (rotates to ✕ when open). */
export const OGE_FAB_PLUS_PATH = 'M12 5v14M5 12h14';

/**
 * The direction the dial unfolds: the explicit one, else away from the
 * screen edge the FAB is pinned to — up from a bottom FAB, down from a top
 * one.
 */
export function ogeSpeedDialDirection(
  position: OgeFabPosition,
  explicit?: OgeSpeedDialDirection | null,
): OgeSpeedDialDirection {
  if (explicit) return explicit;
  return position.startsWith('top') ? 'down' : 'up';
}

/** Whether the dial unfolds along the vertical axis. */
export function ogeSpeedDialVertical(
  direction: OgeSpeedDialDirection,
): boolean {
  return direction === 'up' || direction === 'down';
}

/** What a key press asks the speed dial for. */
export type OgeSpeedDialKeyIntent =
  | { type: 'open'; focus: 'first' | 'last' }
  | { type: 'move'; to: 'next' | 'prev' | 'first' | 'last' }
  | { type: 'close'; restoreFocus: boolean }
  | null;

/** The arrow key pointing in `direction` (visual; start/end mirror in RTL). */
export function ogeSpeedDialAwayKey(
  direction: OgeSpeedDialDirection,
  rtl = false,
): string {
  switch (direction) {
    case 'up':
      return 'ArrowUp';
    case 'down':
      return 'ArrowDown';
    case 'start':
      return rtl ? 'ArrowRight' : 'ArrowLeft';
    case 'end':
      return rtl ? 'ArrowLeft' : 'ArrowRight';
  }
}

/** The arrow key pointing back at the FAB. */
export function ogeSpeedDialTowardKey(
  direction: OgeSpeedDialDirection,
  rtl = false,
): string {
  const opposite: Record<OgeSpeedDialDirection, OgeSpeedDialDirection> = {
    up: 'down',
    down: 'up',
    start: 'end',
    end: 'start',
  };
  return ogeSpeedDialAwayKey(opposite[direction], rtl);
}

/**
 * Keys on the FAB itself (APG menu button): the arrow pointing along the
 * dial opens it on the first (nearest) action, the arrow back opens it on
 * the last; Escape closes an open dial. Enter / Space are the native
 * button press and need no intent.
 */
export function ogeSpeedDialToggleKey(
  key: string,
  direction: OgeSpeedDialDirection,
  opened: boolean,
  rtl = false,
): OgeSpeedDialKeyIntent {
  if (key === 'Escape')
    return opened ? { type: 'close', restoreFocus: true } : null;
  if (key === ogeSpeedDialAwayKey(direction, rtl))
    return { type: 'open', focus: 'first' };
  if (key === ogeSpeedDialTowardKey(direction, rtl))
    return { type: 'open', focus: 'last' };
  return null;
}

/**
 * Keys on an action (APG menu): along the dial axis away from the FAB is
 * `next`, back toward it `prev`; Home/End jump; Escape closes and returns
 * focus to the FAB; Tab closes and lets the focus move on.
 */
export function ogeSpeedDialItemKey(
  key: string,
  direction: OgeSpeedDialDirection,
  rtl = false,
): OgeSpeedDialKeyIntent {
  if (key === ogeSpeedDialAwayKey(direction, rtl))
    return { type: 'move', to: 'next' };
  if (key === ogeSpeedDialTowardKey(direction, rtl))
    return { type: 'move', to: 'prev' };
  switch (key) {
    case 'Home':
      return { type: 'move', to: 'first' };
    case 'End':
      return { type: 'move', to: 'last' };
    case 'Escape':
      return { type: 'close', restoreFocus: true };
    case 'Tab':
      return { type: 'close', restoreFocus: false };
    default:
      return null;
  }
}

/**
 * The next action index, skipping the ones `isDisabled` rejects. Wraps
 * around (APG menus wrap); `-1` when every action is disabled.
 */
export function ogeSpeedDialNavIndex(
  count: number,
  current: number,
  to: 'next' | 'prev' | 'first' | 'last',
  isDisabled: (index: number) => boolean = () => false,
): number {
  if (count <= 0) return -1;
  const step = to === 'next' || to === 'first' ? 1 : -1;
  let start: number;
  switch (to) {
    case 'first':
      start = 0;
      break;
    case 'last':
      start = count - 1;
      break;
    default:
      start = (((current + step) % count) + count) % count;
  }
  for (
    let n = 0, i = start;
    n < count;
    n++, i = (((i + step) % count) + count) % count
  )
    if (!isDisabled(i)) return i;
  return -1;
}

/** An action of a speed dial was activated (click, Enter or Space). */
export interface OgeSpeedDialItemClickEvent {
  item: OgeSpeedDialItem;
  index: number;
  event: Event;
}

/** A FAB was pressed. */
export interface OgeFabClickEvent {
  event: Event;
}
