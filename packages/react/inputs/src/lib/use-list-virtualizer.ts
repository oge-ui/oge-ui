'use client';

import { useReducer, useRef, type RefObject } from 'react';
import {
  OGE_SELECT_OPTION_HEIGHT,
  OgeListVirtualizerCore,
  type OgeVirtualScrollOptions,
} from '@oge-ui/behavior';
import { createBumpAdapter } from './rx-adapter';

/** CSS default of `.oge-select-list { max-height }` — the virtual viewport budget. */
export const DEFAULT_LIST_MAX_HEIGHT = 320;

export interface UseListVirtualizerInput {
  /** The `virtualScroll` prop value. */
  virtualScroll: boolean | OgeVirtualScrollOptions;
  size: 'sm' | 'md' | 'lg';
  dropdownMaxHeight: number | undefined;
  itemCount: () => number;
  listEl: RefObject<HTMLDivElement | null>;
}

/**
 * React seam over `@oge-ui/behavior`'s `OgeListVirtualizerCore` — the same
 * fixed-row window model the Angular dropdown editors run, shared by the
 * select box, tag box and autocomplete.
 */
export function useListVirtualizer(input: UseListVirtualizerInput) {
  const latest = useRef(input);
  latest.current = input;

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const coreRef = useRef<OgeListVirtualizerCore>(undefined);
  coreRef.current ??= new OgeListVirtualizerCore(
    {
      itemCount: () => latest.current.itemCount(),
      itemHeight: () => {
        const options = latest.current.virtualScroll;
        const explicit =
          typeof options === 'object' ? options.itemHeight : undefined;
        return explicit ?? OGE_SELECT_OPTION_HEIGHT[latest.current.size];
      },
      overscan: () => {
        const options = latest.current.virtualScroll;
        return (
          (typeof options === 'object' ? options.overscan : undefined) ?? 4
        );
      },
      viewportHeight: () =>
        latest.current.dropdownMaxHeight ?? DEFAULT_LIST_MAX_HEIGHT,
      scrollContainer: () => latest.current.listEl.current,
    },
    createBumpAdapter(bump),
  );
  const core = coreRef.current;

  const active = input.virtualScroll !== false;
  return {
    active,
    window: core.window,
    onScroll: (event: React.UIEvent) => {
      if (active) core.onScroll(event.nativeEvent);
    },
    scrollToIndex: (index: number) => core.scrollToIndex(index),
    reset: () => core.reset(),
  };
}
