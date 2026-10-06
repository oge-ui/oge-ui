/**
 * The framework-free half of the app bar (W8a): the vocabulary, the config
 * and the landmark decision.
 *
 * An app bar is chrome, not a widget: it adds no keyboard model (its
 * controls stay in the Tab order; a bar that should behave as one tab stop
 * with arrow keys is `oge-toolbar` placed inside it). What it can add is a
 * **landmark**, and only on request: `banner` / `contentinfo` must be
 * unique, top-level and are what a screen reader's landmark list jumps to,
 * so stamping one by default would produce duplicate or nested banners in
 * every app that renders a bar inside a page header, a dialog or a demo.
 */

/** Edge the bar belongs to; drives the safe-area side and the shadow side. */
export type OgeAppBarPosition = 'top' | 'bottom';

/**
 * `static` flows with the page, `sticky` sticks to its edge of the nearest
 * scroll container, `fixed` pins to the viewport edge (with
 * `env(safe-area-inset-*)` padding as a floor).
 */
export type OgeAppBarPositionMode = 'static' | 'sticky' | 'fixed';

/**
 * Surface colour: `default` is the page surface with a hairline, `primary`
 * the accent, `inverse` the dark tooltip surface, `transparent` none.
 */
export type OgeAppBarColor = 'default' | 'primary' | 'inverse' | 'transparent';

/** Density preset — 48 / 56 / 64 px rows. */
export type OgeAppBarSize = 'sm' | 'md' | 'lg';

/** Alignment of the center section's content. */
export type OgeAppBarCenterAlign = 'start' | 'center';

/**
 * Landmark the bar exposes: `banner` for the page header, `contentinfo` for
 * a page footer, `navigation` / `region` for a named secondary bar (pass an
 * `ariaLabel`), `none` (default) for plain chrome.
 */
export type OgeAppBarLandmark =
  'none' | 'banner' | 'contentinfo' | 'navigation' | 'region';

/**
 * Application-wide defaults for `oge-app-bar`. There is deliberately no
 * `messages` block: the bar renders no user-facing strings (a named landmark
 * takes the application's `ariaLabel`). The moment one appears it must move
 * into a messages interface, per the house i18n rule.
 */
export interface OgeAppBarConfig {
  /** Default for the `position` input. */
  position?: OgeAppBarPosition;
  /** Default for the `positionMode` input. */
  positionMode?: OgeAppBarPositionMode;
  /** Default for the `color` input. */
  color?: OgeAppBarColor;
  /** Default for the `size` input. */
  size?: OgeAppBarSize;
}

export const OGE_DEFAULT_APP_BAR_CONFIG: OgeAppBarConfig = {};

export type OgeAppBarConfigInput = Partial<OgeAppBarConfig>;

export function resolveOgeAppBarConfig(
  input: OgeAppBarConfigInput | undefined,
): OgeAppBarConfig {
  return { ...OGE_DEFAULT_APP_BAR_CONFIG, ...input };
}

/** The `role` attribute of a landmark choice (`null` = none). */
export function ogeAppBarRole(
  landmark: OgeAppBarLandmark | null | undefined,
): Exclude<OgeAppBarLandmark, 'none'> | null {
  return !landmark || landmark === 'none' ? null : landmark;
}

/**
 * Whether the bar's `aria-label` may be written: only a landmark can carry a
 * name (`aria-label` on a role-less element is prohibited ARIA).
 */
export function ogeAppBarAcceptsLabel(
  landmark: OgeAppBarLandmark | null | undefined,
): boolean {
  return ogeAppBarRole(landmark) !== null;
}
