/**
 * Writing direction for script-computed geometry and arrow-key maps.
 *
 * Layout itself mirrors through CSS logical properties; this helper is for the
 * places a script has to know the direction — mirrored arrow keys, pointer
 * `deltaX` maths, absolutely positioned SVG, anchored panel sides. Every
 * component resolves direction here rather than reading
 * `getComputedStyle(el).direction` on its own, so both render layers agree on
 * the same rule. (`charts-engine` and `bpmn-engine` keep local copies: they are
 * dependency-free by design.)
 */

/** A resolved writing direction. */
export type OgeDirection = 'ltr' | 'rtl';

/**
 * An explicit direction override: `true`/`'rtl'` forces RTL, `false`/`'ltr'`
 * forces LTR, `null`/`undefined` means "follow the document".
 */
export type OgeDirectionInput = boolean | OgeDirection | null | undefined;

function attributeRtl(element: Element): boolean {
  const owner =
    typeof element.closest === 'function' ? element.closest('[dir]') : null;
  return owner?.getAttribute('dir')?.trim().toLowerCase() === 'rtl';
}

/**
 * `true` when `element` lays out right-to-left. Reads the computed
 * `direction` (catches CSS-only RTL), falling back to the nearest `dir`
 * attribute (engines that do not resolve inherited `direction`, e.g. jsdom).
 * SSR-safe: without an element or a `getComputedStyle` it answers from the
 * attribute, or `false`.
 */
export function ogeIsRtl(
  element: Element | null | undefined,
  explicit?: OgeDirectionInput,
): boolean {
  return ogeResolveDirection(element, explicit) === 'rtl';
}

/**
 * The direction a component should use: an explicit override (an
 * `rtlEnabled` input / prop) wins, otherwise the document direction of
 * `element` (see {@link ogeIsRtl}).
 */
export function ogeResolveDirection(
  element: Element | null | undefined,
  explicit?: OgeDirectionInput,
): OgeDirection {
  if (explicit === true || explicit === 'rtl') return 'rtl';
  if (explicit === false || explicit === 'ltr') return 'ltr';
  if (element === null || element === undefined) return 'ltr';
  try {
    const view = element.ownerDocument?.defaultView;
    const style = view?.getComputedStyle?.(element);
    if (style?.direction === 'rtl') return 'rtl';
  } catch {
    // detached nodes in some engines — fall through to the attribute
  }
  return attributeRtl(element) ? 'rtl' : 'ltr';
}

/**
 * Calls `callback` whenever the resolved direction of `element` changes
 * because a `dir` attribute changed on it or on any ancestor (the closest
 * `[dir]`, `<html dir>`). Returns the disconnect function. SSR-safe: without
 * a `MutationObserver` it returns a no-op.
 */
export function observeDirection(
  element: Element | null | undefined,
  callback: (direction: OgeDirection) => void,
): () => void {
  if (
    element === null ||
    element === undefined ||
    typeof MutationObserver === 'undefined'
  ) {
    return () => undefined;
  }
  const root = element.ownerDocument?.documentElement;
  if (!root) return () => undefined;
  let current = ogeResolveDirection(element);
  const observer = new MutationObserver((records) => {
    const relevant = records.some(
      (record) =>
        record.target === element ||
        (record.target instanceof Node && record.target.contains(element)),
    );
    if (!relevant) return;
    const next = ogeResolveDirection(element);
    if (next === current) return;
    current = next;
    callback(next);
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['dir'],
    subtree: true,
  });
  return () => observer.disconnect();
}
