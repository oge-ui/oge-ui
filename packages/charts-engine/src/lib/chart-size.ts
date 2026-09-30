/**
 * Container measuring for the charts: an immediate measure, then a
 * `ResizeObserver` coalesced to one measure per animation frame. Shared by
 * every chart in both render layers (they draw into a px-sized viewBox).
 */

export interface OgeChartSize {
  readonly width: number;
  readonly height: number;
}

/** The element's rounded size, or `null` while it has none (hidden, jsdom). */
export function measureChartElement(element: Element): OgeChartSize | null {
  const rect = element.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  }
  return null;
}

/**
 * Measures `element` now and on every resize; returns the disconnect.
 * Without `ResizeObserver` (jsdom, old engines) only the first measure runs.
 */
export function observeChartSize(
  element: Element,
  onSize: (size: OgeChartSize) => void,
): () => void {
  const measure = (): void => {
    const size = measureChartElement(element);
    if (size !== null) onSize(size);
  };
  measure();
  if (typeof ResizeObserver === 'undefined') return () => undefined;
  let frame = false;
  let disposed = false;
  const observer = new ResizeObserver(() => {
    if (frame) return;
    frame = true;
    requestAnimationFrame(() => {
      frame = false;
      if (!disposed) measure();
    });
  });
  observer.observe(element);
  return () => {
    disposed = true;
    observer.disconnect();
  };
}
