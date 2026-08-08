/** Direction of a keyboard navigation step: `1` forward, `-1` backward. */
export type OgeNavDirection = 1 | -1;

/**
 * Index of the next enabled entry from `start` in `direction`, skipping
 * disabled ones. Wraps around the ends unless `wrap` is `false`. Returns
 * `null` when no enabled entry exists in that direction.
 *
 * Shared by the composite widgets that move focus with arrow keys — a tab
 * strip's roving tabindex and an accordion's header navigation resolve the
 * same question against different item shapes.
 */
export function stepEnabledIndex(
  count: number,
  start: number,
  direction: OgeNavDirection,
  isDisabled: (index: number) => boolean,
  wrap = true,
): number | null {
  if (count <= 0) return null;
  for (let offset = 1; offset <= count; offset++) {
    const raw = start + direction * offset;
    if (!wrap && (raw < 0 || raw >= count)) return null;
    const index = ((raw % count) + count) % count;
    if (!isDisabled(index)) return index;
  }
  return null;
}

/**
 * Index of the first (`direction: 1`) or last (`direction: -1`) enabled entry —
 * the Home/End targets. `null` when every entry is disabled.
 */
export function edgeEnabledIndex(
  count: number,
  direction: OgeNavDirection,
  isDisabled: (index: number) => boolean,
): number | null {
  const start = direction === 1 ? 0 : count - 1;
  for (let index = start; index >= 0 && index < count; index += direction) {
    if (!isDisabled(index)) return index;
  }
  return null;
}
