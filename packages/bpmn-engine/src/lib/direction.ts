/**
 * Writing direction of the editor chrome — a local twin of `@oge-ui/behavior`'s
 * `ogeIsRtl` / `observeDirection`, kept here because `bpmn-engine` is
 * dependency-free by design. Keep the two in step.
 *
 * Only the chrome mirrors (rail and properties panel sides, their separators,
 * the context pad's side of the shape). The canvas itself stays LTR: BPMN DI
 * coordinates are absolute, so a diagram drawn in an RTL page is the same
 * diagram, and the arrow-key nudges move shapes in diagram space.
 */

/** `true` when `element` lays out right-to-left (computed `direction`, then the nearest `dir`). */
export function bpmnIsRtl(element: Element | null | undefined): boolean {
  if (element === null || element === undefined) return false;
  try {
    const view = element.ownerDocument?.defaultView;
    if (view?.getComputedStyle?.(element).direction === 'rtl') return true;
  } catch {
    // detached nodes in some engines — fall through to the attribute
  }
  const owner =
    typeof element.closest === 'function' ? element.closest('[dir]') : null;
  return owner?.getAttribute('dir')?.trim().toLowerCase() === 'rtl';
}

/**
 * Calls `callback` when a `dir` attribute on `element` or an ancestor changes
 * its direction. Returns the disconnect function (a no-op when the
 * element's document has no window, e.g. during server rendering).
 */
export function observeBpmnDirection(
  element: Element | null | undefined,
  callback: (rtl: boolean) => void,
): () => void {
  if (element === null || element === undefined) return () => undefined;
  // the element's own window's observer (none on a server DOM) — see the
  // twin in @oge-ui/behavior for why not the global one
  const doc = element.ownerDocument;
  const Observer = doc?.defaultView?.MutationObserver;
  const root = doc?.documentElement;
  if (Observer === undefined || !root) return () => undefined;
  let current = bpmnIsRtl(element);
  const observer = new Observer((records) => {
    if (
      !records.some((r) => r.target === element || r.target.contains(element))
    ) {
      return;
    }
    const next = bpmnIsRtl(element);
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
