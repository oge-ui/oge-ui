/**
 * How a drawer sits next to the content it belongs to: `'overlay'` floats over
 * it, `'push'` shifts it aside without resizing it, `'side'` shrinks it so both
 * share the row.
 */
export type OgeDrawerLayoutMode = 'overlay' | 'push' | 'side';

/** Inputs of {@link resolveDrawerMode}. */
export interface OgeDrawerModeRequest {
  /** The mode the application asked for. */
  readonly requestedMode: OgeDrawerLayoutMode;
  /**
   * Measured inline size of the drawer's own container, in pixels. A
   * non-positive value means "not measured yet".
   */
  readonly containerSize: number;
  /**
   * Below this container size the drawer stops taking room from the content
   * and becomes an overlay. `undefined` disables the behavior entirely.
   */
  readonly compactBelow?: number;
}

/** What {@link resolveDrawerMode} decided, and why. */
export interface OgeDrawerModeResult {
  /** The mode to actually render. */
  readonly mode: OgeDrawerLayoutMode;
  /** `true` when the requested mode was downgraded because room ran out. */
  readonly compact: boolean;
}

/**
 * Decides whether a drawer keeps the mode it was given or collapses to an
 * overlay because its container got too narrow.
 *
 * The reference drawers answer this by watching the **window** width. This one
 * is handed the **container's** inline size instead, so a drawer nested in a
 * dialog, a split pane or a preview card adapts to the room it actually has —
 * the same rule the forms package follows with its `@container` queries. It
 * cannot be a CSS container query itself, because switching to `'overlay'`
 * changes modality (focus trap, Escape, `inert`), which is component state
 * rather than styling.
 *
 * A non-positive `containerSize` means "not measured yet" — jsdom and the first
 * render before layout both report it — and the requested mode is returned
 * unchanged, so an unmeasured drawer renders the way it was configured.
 *
 * `'overlay'` is already the compact shape, so it is never downgraded and never
 * reports `compact: true`.
 *
 * Pure arithmetic with no DOM access, so it is unit-testable on its own; the
 * component only feeds it measurements.
 */
export function resolveDrawerMode(
  request: OgeDrawerModeRequest,
): OgeDrawerModeResult {
  const { requestedMode, containerSize, compactBelow } = request;
  if (
    compactBelow === undefined ||
    containerSize <= 0 ||
    requestedMode === 'overlay' ||
    containerSize >= compactBelow
  ) {
    return { mode: requestedMode, compact: false };
  }
  return { mode: 'overlay', compact: true };
}
