/**
 * The framework-free half of the action sheet (W8d): the vocabulary, the
 * menu keyboard map and the modal machine both render layers run.
 *
 * Semantics: the sheet is a modal `role="dialog"` (`aria-modal`, labelled by
 * its title) pinned to the bottom edge. Its actions are an APG **menu** — a
 * `role="menu"` of `menuitem` buttons with one tab stop, ↑/↓ (wrapping,
 * skipping disabled actions), Home / End — and the Cancel button is a plain
 * button outside the menu, so Tab moves between exactly two stops while the
 * focus trap keeps it inside the sheet. Escape, a backdrop tap and a swipe
 * down on the handle close it; the topmost surface on the shared overlay
 * stack takes the Escape, so a sheet opened over a modal closes first.
 *
 * The machine owns the modal behaviour the house overlays share — the
 * ref-counted body scroll lock, `inertModalBackground`, the Tab trap, the
 * Escape stack and focus restore — through the same primitives `oge-modal`
 * and the adaptive popup sheet use, and the swipe runs on
 * `beginPointerGesture`.
 */
import { edgeEnabledIndex, stepEnabledIndex } from '@oge-ui/core';
import { prefersReducedMotion } from '../a11y/motion';
import { beginPointerGesture } from '../gesture/pointer-gesture';
import type { OgePointerGestureInput } from '../gesture/pointer-gesture';
import { OGE_SHEET_SWIPE_DISMISS } from './adaptive';
import { getTabbableElements, trapTabKey } from './focus-trap';
import { inertModalBackground, isModalFocusOrphaned } from './modal-core';
import { isTopOverlay, pushOverlay, removeOverlay } from './overlay-stack';
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock';

/** One action of the sheet. */
export interface OgeActionSheetItem {
  /** Stable identity for the render loop and the result; the index is used without one. */
  key?: string | number;
  /** The action's label — its accessible name. */
  text: string;
  /** Secondary line under the label (read as part of the name). */
  description?: string;
  /** SVG path data (`d`, 24×24 viewBox, stroked) of a leading icon. */
  icon?: string;
  /** Marks a destructive action (danger colour; say it in the text as well). */
  destructive?: boolean;
  /** Disabled actions stay visible and focusable but do nothing. */
  disabled?: boolean;
  /** `bottom` actions render after a divider (e.g. secondary actions). */
  group?: 'top' | 'bottom';
}

/** Why the sheet closed. */
export type OgeActionSheetCloseReason =
  'action' | 'cancel' | 'escape' | 'backdrop' | 'swipe' | 'api';

/** The sheet is about to open; set `cancel` to keep it closed. */
export interface OgeActionSheetOpeningEvent {
  cancel: boolean;
}

/** The sheet is about to close; set `cancel` to keep it open. */
export interface OgeActionSheetClosingEvent {
  readonly reason: OgeActionSheetCloseReason;
  /** The chosen action, for `reason: 'action'`. */
  readonly item: OgeActionSheetItem | null;
  cancel: boolean;
}

/** The sheet closed. */
export interface OgeActionSheetClosedEvent {
  readonly reason: OgeActionSheetCloseReason;
  /** The chosen action, for `reason: 'action'`; `null` otherwise. */
  readonly item: OgeActionSheetItem | null;
}

/** An action was activated (click, Enter or Space). */
export interface OgeActionSheetItemClickEvent {
  readonly item: OgeActionSheetItem;
  readonly index: number;
  readonly event: Event;
  /** Set `true` to keep the sheet open after this action. */
  keepOpen: boolean;
}

/** What `open()` resolves with: the chosen action, or `null` when dismissed. */
export type OgeActionSheetResult = OgeActionSheetItem | null;

/** The actions in render order: `top` (default) first, then `bottom`. */
export function ogeActionSheetOrder(
  items: readonly OgeActionSheetItem[],
): OgeActionSheetItem[] {
  return [
    ...items.filter((item) => item.group !== 'bottom'),
    ...items.filter((item) => item.group === 'bottom'),
  ];
}

/** Index of the first `bottom` action in render order (`-1` = none) — the divider goes before it. */
export function ogeActionSheetDividerIndex(
  ordered: readonly OgeActionSheetItem[],
): number {
  const first = ordered.findIndex((item) => item.group === 'bottom');
  return first > 0 ? first : -1;
}

/** What a key does in the action menu. */
export type OgeActionSheetKeyIntent =
  { kind: 'focus'; index: number } | { kind: 'activate'; index: number } | null;

/**
 * The APG menu keyboard over the actions: ↑/↓ move and wrap past disabled
 * actions, Home / End jump to the first / last enabled one, Enter / Space
 * activate the focused action. Disabled actions are focusable (so they are
 * discoverable) but never activate.
 */
export function ogeActionSheetKeyIntent(
  key: string,
  current: number,
  items: readonly OgeActionSheetItem[],
): OgeActionSheetKeyIntent {
  const disabled = (i: number) => !!items[i]?.disabled;
  const count = items.length;
  let target: number | null = null;
  switch (key) {
    case 'ArrowDown':
      target = stepEnabledIndex(count, current, 1, disabled);
      break;
    case 'ArrowUp':
      target = stepEnabledIndex(
        count,
        current < 0 ? count : current,
        -1,
        disabled,
      );
      break;
    case 'Home':
      target = edgeEnabledIndex(count, 1, disabled);
      break;
    case 'End':
      target = edgeEnabledIndex(count, -1, disabled);
      break;
    case 'Enter':
    case ' ':
    case 'Spacebar':
      return current >= 0 && current < count && !disabled(current)
        ? { kind: 'activate', index: current }
        : null;
    default:
      return null;
  }
  return target === null ? null : { kind: 'focus', index: target };
}

/** The roving tab stop of the menu: the last focused action, else the first enabled one. */
export function ogeActionSheetTabStop(
  items: readonly OgeActionSheetItem[],
  focused: number,
): number {
  if (focused >= 0 && focused < items.length) return focused;
  const first = edgeEnabledIndex(items.length, 1, (i) => !!items[i]?.disabled);
  return first ?? 0;
}

export interface OgeActionSheetCoreOptions {
  /** The layer element (backdrop + sheet) while open. */
  layer: () => HTMLElement | null;
  /** The sheet surface inside the layer. */
  sheet: () => HTMLElement | null;
  /** Called for every user dismissal (Escape, backdrop, swipe). */
  onDismiss: (reason: 'escape' | 'backdrop' | 'swipe') => void;
}

/** Attribute the render layers put on the element that takes focus on open. */
export const OGE_ACTION_SHEET_FOCUS_ATTR = 'data-oge-action-sheet-focus';

/**
 * The modal half of an action sheet. `activate()` once the sheet is rendered,
 * `deactivate()` when it goes; both are idempotent. While active it holds the
 * scroll lock, inerts the background, joins the overlay Escape stack, traps
 * Tab, dismisses on a backdrop press and on a swipe down from the handle or
 * header, and restores focus to the element focused before it opened.
 */
export class OgeActionSheetCore {
  private active: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private releaseInert: (() => void) | null = null;
  private swipe: { cancel(): void } | null = null;

  constructor(private readonly options: OgeActionSheetCoreOptions) {}

  /** Whether the sheet is currently active. */
  isActive(): boolean {
    return this.active !== null;
  }

  /** Applies the modal behaviour to the rendered layer. */
  activate(): void {
    if (typeof document === 'undefined') return;
    const layer = this.options.layer();
    if (!layer || this.active === layer) return;
    if (this.active) this.deactivate();
    this.active = layer;
    const focused = document.activeElement;
    this.previousFocus =
      focused instanceof HTMLElement && focused !== document.body
        ? focused
        : null;
    pushOverlay(this);
    // focus moves in before the background goes inert (inerting the focused
    // trigger would blur it with no related target)
    this.initialFocusTarget()?.focus({ preventScroll: true });
    lockBodyScroll();
    this.releaseInert = inertModalBackground(layer);
    layer.addEventListener('keydown', this.onKeyDown);
    layer.addEventListener('pointerdown', this.onPointerDown);
  }

  /** Releases everything `activate()` took; restores focus when orphaned. */
  deactivate(): void {
    const layer = this.active;
    if (!layer) return;
    this.active = null;
    this.swipe?.cancel();
    this.swipe = null;
    layer.removeEventListener('keydown', this.onKeyDown);
    layer.removeEventListener('pointerdown', this.onPointerDown);
    removeOverlay(this);
    this.releaseInert?.();
    this.releaseInert = null;
    unlockBodyScroll();
    const previous = this.previousFocus;
    this.previousFocus = null;
    if (isModalFocusOrphaned(layer) && previous?.isConnected) {
      previous.focus({ preventScroll: true });
    }
  }

  /** Alias of `deactivate()` for owner teardown hooks. */
  destroy(): void {
    this.deactivate();
  }

  private initialFocusTarget(): HTMLElement | null {
    const sheet = this.options.sheet();
    if (!sheet) return null;
    return (
      sheet.querySelector<HTMLElement>(`[${OGE_ACTION_SHEET_FOCUS_ATTR}]`) ??
      getTabbableElements(sheet)[0] ??
      sheet
    );
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return;
    if (event.key === 'Escape') {
      if (!isTopOverlay(this)) return;
      event.preventDefault();
      event.stopPropagation();
      this.options.onDismiss('escape');
      return;
    }
    if (event.key === 'Tab') {
      const sheet = this.options.sheet();
      if (sheet) trapTabKey(event, sheet, sheet);
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const layer = this.active;
    if (!layer) return;
    const target = event.target as Element | null;
    if (target === layer) {
      // the layer itself is the backdrop: the sheet is its child
      event.preventDefault();
      this.options.onDismiss('backdrop');
      return;
    }
    const grip = target?.closest?.(
      '.oge-action-sheet-handle, .oge-action-sheet-header',
    );
    const sheet = this.options.sheet();
    if (!grip || !sheet || !layer.contains(grip) || this.swipe) return;
    if (target?.closest?.('button, a, input')) return;
    this.swipe = beginOgeActionSheetSwipe(event, {
      sheet,
      onFinish: (dismiss) => {
        this.swipe = null;
        if (dismiss) this.options.onDismiss('swipe');
      },
    });
  };
}

export interface OgeActionSheetSwipeOptions {
  /** The sheet surface the swipe translates. */
  sheet: HTMLElement;
  /** Called once: `true` when the drag passed the dismiss distance. */
  onFinish: (dismiss: boolean) => void;
}

/** Whether a vertical drag of `deltaY` px dismisses the sheet. */
export function ogeActionSheetSwipeDismisses(deltaY: number): boolean {
  return deltaY >= OGE_SHEET_SWIPE_DISMISS;
}

/**
 * Starts a swipe-down from `pointerdown` on the handle / header: the sheet
 * follows the pointer downwards (never up past its resting place), and a
 * release past {@link OGE_SHEET_SWIPE_DISMISS} px dismisses it. Runs on the
 * shared `beginPointerGesture` (pointer capture, Escape / `pointercancel`
 * cancel); the handle declares `touch-action: none`, so touch drags at once.
 */
export function beginOgeActionSheetSwipe(
  event: OgePointerGestureInput & { readonly button?: number },
  options: OgeActionSheetSwipeOptions,
): { cancel(): void } | null {
  if (event.button !== undefined && event.button !== 0) return null;
  const { sheet } = options;
  let deltaY = 0;
  const reset = () => {
    sheet.style.translate = '';
    sheet.classList.remove('oge-action-sheet-dragging');
  };
  return beginPointerGesture(event, {
    source: sheet,
    touchAction: false,
    onMove(_dx, dy) {
      deltaY = Math.max(0, dy);
      sheet.classList.add('oge-action-sheet-dragging');
      if (!prefersReducedMotion()) sheet.style.translate = `0 ${deltaY}px`;
    },
    onFinish(commit) {
      reset();
      options.onFinish(commit && ogeActionSheetSwipeDismisses(deltaY));
    },
  });
}
