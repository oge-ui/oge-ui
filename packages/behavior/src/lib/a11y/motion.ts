/**
 * Motion preferences for script-driven movement (smooth scrolling, JS
 * animations). CSS motion is handled in the stylesheets
 * (`@media (prefers-reduced-motion: reduce)`); anything a script animates
 * must ask here first so both render layers honour the same setting.
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `true` when the user asked the OS for reduced motion. SSR-safe: without a
 * `window`/`matchMedia` (server render, bare jsdom) it answers `false`.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return false;
  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches === true;
  } catch {
    return false;
  }
}

/**
 * The `behavior` for `scrollIntoView()` / `scrollBy()` / `scrollTo()`:
 * `'smooth'` normally, `'auto'` (an instant jump) under reduced motion.
 */
export function motionScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
