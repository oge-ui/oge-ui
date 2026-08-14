'use client';

import { useReducer, useRef, type RefObject, type UIEvent } from 'react';
import { OgeListVirtualizerCore } from '@oge-ui/behavior';
import { createBumpAdapter } from './rx-adapter';

/** Extra rows rendered outside the viewport on each side. */
const TREE_OVERSCAN = 6;

/** Rows assumed to fit before the scroll element has been measured. */
const UNMEASURED_VIEWPORT_ROWS = 12;

export interface UseTreeVirtualizerInput {
  /** The `virtualScroll` prop, already resolved to on/off. */
  active: boolean;
  /** Fixed row height in px — every row must actually be this tall. */
  itemHeight: number;
  /** Number of visible nodes (the flattened list length). */
  itemCount: () => number;
  /** The scrolling `.oge-tree-view-scroll` element. */
  scrollEl: RefObject<HTMLDivElement | null>;
}

/**
 * React seam over `@oge-ui/behavior`'s `OgeListVirtualizerCore` — the same
 * fixed-row window model the Angular tree view runs through its
 * `TreeVirtualizerModel`. The component renders `window().start..end` inside a
 * `totalHeight` spacer translated by `offsetY`, feeds `onScroll` from the
 * scroll element, and routes keyboard focus moves through `scrollToIndex`,
 * because the target row may not be in the DOM at all.
 */
export function useTreeVirtualizer(input: UseTreeVirtualizerInput) {
  const latest = useRef(input);
  latest.current = input;

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const coreRef = useRef<OgeListVirtualizerCore>(undefined);
  coreRef.current ??= new OgeListVirtualizerCore(
    {
      itemCount: () => latest.current.itemCount(),
      itemHeight: () => latest.current.itemHeight,
      overscan: () => TREE_OVERSCAN,
      viewportHeight: () =>
        latest.current.scrollEl.current?.clientHeight ||
        latest.current.itemHeight * UNMEASURED_VIEWPORT_ROWS,
      scrollContainer: () => latest.current.scrollEl.current,
    },
    createBumpAdapter(bump),
  );
  const core = coreRef.current;

  return {
    active: input.active,
    window: core.window,
    onScroll: (event: UIEvent) => {
      if (latest.current.active) core.onScroll(event.nativeEvent);
    },
    scrollToIndex: (index: number) => core.scrollToIndex(index),
    reset: () => core.reset(),
  };
}
