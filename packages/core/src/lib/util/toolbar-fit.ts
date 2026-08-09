/**
 * Whether an item may move into a toolbar's overflow menu: `'auto'` when it
 * yields as soon as it stops fitting, `'always'` when it lives in the menu
 * regardless of room, `'never'` when it stays on the toolbar even if that
 * makes the row overflow.
 */
export type OgeToolbarOverflowPolicy = 'auto' | 'always' | 'never';

/** One measured toolbar entry: its main-axis size and its overflow policy. */
export interface OgeToolbarFitItem {
  /** Measured main-axis size in pixels, excluding the row gap. */
  readonly size: number;
  readonly policy: OgeToolbarOverflowPolicy;
  /**
   * How hard this entry holds its place on the bar; higher survives longer.
   * Defaults to `0`, and with every entry on the default the order is exactly
   * the reference behavior — the last entry yields first.
   */
  readonly priority?: number;
}

/** Inputs of {@link fitToolbarItems}. */
export interface OgeToolbarFitOptions {
  /** Available main-axis size of the toolbar, in pixels. */
  readonly containerSize: number;
  /** Items in visual order — the order they would render on the toolbar. */
  readonly items: readonly OgeToolbarFitItem[];
  /** Main-axis size the overflow button occupies once it is shown. */
  readonly menuButtonSize: number;
  /** Gap between two adjacent rendered entries, in pixels. */
  readonly gap?: number;
}

/** Which items stay on the toolbar and which move into the overflow menu. */
export interface OgeToolbarFitResult {
  /** Indices staying on the toolbar, ascending. */
  readonly inline: readonly number[];
  /** Indices moving into the overflow menu, ascending. */
  readonly inMenu: readonly number[];
  /** Whether the overflow button has anything to open. */
  readonly menuVisible: boolean;
}

/**
 * Decides which toolbar entries fit and which collapse into the overflow menu.
 *
 * `'auto'` entries yield from the **end** of the visual order first, which is
 * what every reference toolbar with an overflow menu does — the trailing
 * `'after'` group gives way before the leading `'before'` group. `'never'`
 * entries always keep their place, so a row of them can legitimately overflow;
 * `'always'` entries never occupy the row at all.
 *
 * An optional per-item `priority` overrides that positional order: the lowest
 * priority yields first whatever its position, so "Save last, Help first" is
 * expressible without reordering the bar. Equal priorities fall back to
 * end-first, which is why the default (`0` everywhere) reproduces the
 * reference behavior exactly.
 *
 * A non-positive `containerSize` means "not measured yet" — jsdom and the
 * first render before layout both report it — and everything except the
 * `'always'` entries is reported as fitting, so an unmeasured toolbar renders
 * complete rather than collapsed.
 *
 * Pure arithmetic with no DOM access, so it is unit-testable on its own; the
 * component only feeds it measurements.
 */
export function fitToolbarItems(
  options: OgeToolbarFitOptions,
): OgeToolbarFitResult {
  const { containerSize, items, menuButtonSize, gap = 0 } = options;

  const forced: number[] = [];
  const pinned: number[] = [];
  const flexible: number[] = [];
  items.forEach((item, index) => {
    if (item.policy === 'always') forced.push(index);
    else if (item.policy === 'never') pinned.push(index);
    else flexible.push(index);
  });

  if (containerSize <= 0) {
    return result([...pinned, ...flexible], forced);
  }

  const rowSize = (indices: readonly number[], withMenu: boolean): number => {
    const count = indices.length + (withMenu ? 1 : 0);
    if (count === 0) return 0;
    const sum = indices.reduce((total, i) => total + items[i].size, 0);
    return sum + (withMenu ? menuButtonSize : 0) + gap * (count - 1);
  };

  // Nothing is forced into the menu and the untrimmed row fits: no button.
  const everything = [...pinned, ...flexible].sort(ascending);
  if (forced.length === 0 && rowSize(everything, false) <= containerSize) {
    return result(everything, []);
  }

  // The button is on screen from here, so it costs room of its own. Drop
  // flexible entries in yield order — lowest priority first, and among equals
  // the one furthest along the visual order — until the row fits.
  const yieldOrder = [...flexible].sort((a, b) => {
    const byPriority = priorityOf(items[a]) - priorityOf(items[b]);
    return byPriority !== 0 ? byPriority : b - a;
  });
  const kept = new Set(flexible);
  const overflowed: number[] = [];
  for (const index of yieldOrder) {
    const inline = [...pinned, ...kept].sort(ascending);
    if (rowSize(inline, true) <= containerSize) break;
    kept.delete(index);
    overflowed.push(index);
  }
  return result([...pinned, ...kept], [...forced, ...overflowed]);
}

function ascending(a: number, b: number): number {
  return a - b;
}

function priorityOf(item: OgeToolbarFitItem): number {
  return item.priority ?? 0;
}

function result(
  inline: readonly number[],
  inMenu: readonly number[],
): OgeToolbarFitResult {
  return {
    inline: [...inline].sort(ascending),
    inMenu: [...inMenu].sort(ascending),
    menuVisible: inMenu.length > 0,
  };
}
