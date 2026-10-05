/**
 * Multi-selection of appointments (Ctrl/⌘-click toggles, Shift-click
 * extends, a plain click replaces; Ctrl+Space / Shift+Space from the
 * keyboard). The selection is a list of item **sources** — the two-way
 * `selectedAppointments` — so every occurrence of a selected series reads
 * as selected, and a source the store no longer holds drops out.
 */
import type { SchedulerSelectGesture } from './keyboard';
import type { SchedulerAppointment } from './scheduler-model';

/**
 * The selection after a gesture on `appointment`. `order` is the view's
 * chronological chip order (the range axis); `anchor` the source of the
 * last plain / toggled pick.
 */
export function nextSchedulerSelection<T>(
  current: readonly T[],
  appointment: SchedulerAppointment<T>,
  gesture: SchedulerSelectGesture,
  order: readonly SchedulerAppointment<T>[],
  anchor: T | null,
): readonly T[] {
  const source = appointment.source;
  if (gesture === 'replace') return [source];
  if (gesture === 'toggle') {
    return current.includes(source)
      ? current.filter((entry) => entry !== source)
      : [...current, source];
  }
  const from =
    anchor === null ? -1 : order.findIndex((entry) => entry.source === anchor);
  const to = order.findIndex((entry) => entry.key === appointment.key);
  if (from === -1 || to === -1) {
    return current.includes(source) ? current : [...current, source];
  }
  const [low, high] = from <= to ? [from, to] : [to, from];
  const range = order.slice(low, high + 1).map((entry) => entry.source);
  const merged = [...current];
  for (const entry of range) if (!merged.includes(entry)) merged.push(entry);
  return merged;
}

/** Drops selected sources the store no longer holds (after a delete / reload). */
export function pruneSchedulerSelection<T>(
  selection: readonly T[],
  store: readonly T[],
): readonly T[] {
  const kept = selection.filter((entry) => store.includes(entry));
  return kept.length === selection.length ? selection : kept;
}
