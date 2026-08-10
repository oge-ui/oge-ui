/** Inputs of {@link resolveMenubarCompact}. */
export interface OgeMenubarCompactRequest {
  /**
   * Measured inline size of the menubar's own container, in pixels. A
   * non-positive value means "not measured yet".
   */
  readonly containerSize: number;
  /**
   * Below this container size the whole bar collapses into a hamburger button
   * opening the full item tree. `undefined` disables the behavior entirely.
   */
  readonly compactBelow?: number;
}

/** What {@link resolveMenubarCompact} decided. */
export interface OgeMenubarCompactResult {
  /** `true` when the bar should render as a hamburger button. */
  readonly compact: boolean;
}

/**
 * Decides whether a menubar keeps its bar of top-level items or collapses to a
 * hamburger because its container got too narrow.
 *
 * The reference menus answer this against the **window** width (PrimeNG's
 * `breakpoint` media query) or the widget's own overflow (DevExtreme's
 * `adaptivityEnabled`). This one is handed the **container's** inline size,
 * the same rule the drawer's `compactBelow` follows: a menubar nested in a
 * dialog or a split pane adapts to the room it actually has. It cannot be a
 * CSS container query because compact mode swaps the DOM structure and the
 * interaction model (bar → single popup tree), which is component state
 * rather than styling.
 *
 * A non-positive `containerSize` means "not measured yet" — jsdom and the
 * first render before layout both report it — and the bar renders the way it
 * was configured.
 *
 * Pure arithmetic with no DOM access, so it is unit-testable on its own; the
 * component only feeds it measurements.
 */
export function resolveMenubarCompact(
  request: OgeMenubarCompactRequest,
): OgeMenubarCompactResult {
  const { containerSize, compactBelow } = request;
  return {
    compact:
      compactBelow !== undefined &&
      containerSize > 0 &&
      containerSize < compactBelow,
  };
}
