'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  measureChartElement,
  observeChartSize,
  type OgeChartSize,
} from '@oge-ui/charts-engine';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * `'use client'` components are still **server-rendered** — the directive
 * only marks the hydration boundary — and React warns on every server render
 * that uses `useLayoutEffect`. The effect cannot run there anyway (no DOM to
 * measure), so downgrading to `useEffect` is the canonical shim.
 */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Structural equality two levels deep: arrays element by element, plain
 * objects key by key, everything else (functions, Dates, data rows) by
 * identity. Enough for option objects written inline in JSX —
 * `argumentAxis={{ grid: true }}`, `series={[{ … }]}` — without walking a
 * data set.
 */
function stableEqual(a: unknown, b: unknown, depth: number): boolean {
  if (Object.is(a, b)) return true;
  if (depth === 0) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((entry, index) => stableEqual(entry, b[index], depth - 1))
    );
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => stableEqual(a[key], b[key], depth - 1))
    );
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Keeps the previous reference while `value` is structurally unchanged, so
 * inline JSX options do not invalidate the engine's memoized stages on every
 * render (a pointer move would otherwise rebuild a 50k-point scene). Angular
 * templates get this for free: literal objects there are pure and cached.
 */
export function useStable<T>(value: T, depth = 3): T {
  const ref = useRef(value);
  if (!stableEqual(ref.current, value, depth)) ref.current = value;
  return ref.current;
}

/**
 * The controlled/uncontrolled pair behind every `value` + `defaultValue` +
 * `onValueChange` prop trio: controlled while `value !== undefined`.
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
): [T, (next: T) => void] {
  const [inner, setInner] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const latest = useRef({ controlled, onChange });
  latest.current = { controlled, onChange };
  const set = useCallback((next: T) => {
    if (!latest.current.controlled) setInner(next);
    latest.current.onChange?.(next);
  }, []);
  return [current, set];
}

/**
 * The container's px size, measured on mount and on every resize
 * (rAF-coalesced by the engine's observer). Starts at `initial` — the same
 * default the Angular component paints its first frame with.
 */
export function useChartSize(
  element: RefObject<Element | null>,
  initial: OgeChartSize,
): [OgeChartSize, () => void] {
  const [size, setSize] = useState(initial);
  const apply = useCallback((next: OgeChartSize) => {
    setSize((previous) =>
      previous.width === next.width && previous.height === next.height
        ? previous
        : next,
    );
  }, []);
  useIsomorphicLayoutEffect(() => {
    const node = element.current;
    if (node === null) return undefined;
    // StrictMode runs cleanup → mount again: the observer is disconnected
    // and re-created, never left dead.
    return observeChartSize(node, apply);
  }, [element, apply]);
  const refresh = useCallback(() => {
    const node = element.current;
    if (node === null) return;
    const measured = measureChartElement(node);
    if (measured !== null) apply(measured);
  }, [element, apply]);
  return [size, refresh];
}

/** `useId()` made safe inside `url(#…)` references. */
export function svgSafeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Joins class names, skipping falsy ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
