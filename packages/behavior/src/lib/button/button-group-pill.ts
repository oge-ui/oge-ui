import type { OgeIndicatorGlide } from '../motion/indicator-glide';

/** Class of the transient selection pill of a single-select button group. */
export const OGE_BUTTON_GROUP_PILL_CLASS = 'oge-button-group-pill';

/** Segments whose selected look is a darker solid fill, not the accent tint. */
const SOLID_SEGMENT =
  '.oge-button-colored:not(.oge-button-outlined):not(.oge-button-text-mode)';

/**
 * Slides a single-select button group's selection pill from the native
 * button that was selected to the one that is now (both layers call it after
 * the render that moved the selection, with a `createOgeIndicatorGlide(root,
 * { shape: 'box', className: OGE_BUTTON_GROUP_PILL_CLASS })`). The pill takes
 * the target segment's corner radii, so the segmented ends stay rounded.
 * Returns whether a glide started: never for the first selection, a removed
 * origin, a solid-severity target (the tint would not match its fill) or
 * with motion off — the CSS selection then simply moves.
 */
export function glideButtonGroupPill(
  glide: OgeIndicatorGlide,
  root: HTMLElement,
  previous: HTMLElement | null,
  target: HTMLElement | null,
): boolean {
  if (!previous || !target || previous === target || !previous.isConnected)
    return false;
  if (target.closest(SOLID_SEGMENT)) {
    glide.cancel();
    return false;
  }
  let radius = '';
  try {
    radius = getComputedStyle(target).borderRadius;
  } catch {
    radius = '';
  }
  if (!glide.move(previous, target)) return false;
  const pill = root.querySelector<HTMLElement>(
    `:scope > .${OGE_BUTTON_GROUP_PILL_CLASS}`,
  );
  if (pill && radius) pill.style.borderRadius = radius;
  return true;
}
