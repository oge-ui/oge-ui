/** Applies a skip/take window; returns the input untouched when no window is set. */
export function applyPaging<T>(rows: readonly T[], skip?: number, take?: number): readonly T[] {
  if (skip == null && take == null) return rows;
  const start = Math.max(0, skip ?? 0);
  if (start === 0 && (take == null || take >= rows.length)) return rows;
  return rows.slice(start, take == null ? undefined : start + take);
}
