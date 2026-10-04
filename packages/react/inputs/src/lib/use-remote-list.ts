'use client';

import { useEffect, useReducer, useRef } from 'react';
import {
  OgeRemoteListCore,
  isNearScrollEnd,
  type OgeListDataSource,
  type OgeListPageLoadedEvent,
} from '@oge-ui/behavior';
import { createBumpAdapter } from './rx-adapter';
import { useOgeInputsConfig } from './inputs-config';

export interface UseRemoteListInput<TItem> {
  dataSource: OgeListDataSource<TItem> | undefined;
  pageSize: number | undefined;
  searchTimeout: number | undefined;
  minSearchLength: number;
  showDataBeforeSearch: boolean;
  valueOf: (item: TItem) => unknown;
  onPageLoaded?: (event: OgeListPageLoadedEvent<TItem>) => void;
}

/**
 * React seam over `@oge-ui/behavior`'s `OgeRemoteListCore` — the same paged,
 * debounced, abortable, per-search cached `dataSource` machine the Angular
 * list editors run. Inert (`core.active === false`) while no source is bound.
 */
export function useRemoteList<TItem>(input: UseRemoteListInput<TItem>) {
  const config = useOgeInputsConfig();
  const latest = useRef(input);
  latest.current = input;

  const [, bump] = useReducer((n: number) => n + 1, 0);
  const coreRef = useRef<OgeRemoteListCore<TItem>>(undefined);
  coreRef.current ??= new OgeRemoteListCore<TItem>(
    {
      source: () => latest.current.dataSource,
      pageSize: () => latest.current.pageSize ?? config.dataPageSize,
      searchTimeout: () =>
        latest.current.searchTimeout ?? config.searchTimeoutMs,
      minSearchLength: () => latest.current.minSearchLength,
      showDataBeforeSearch: () => latest.current.showDataBeforeSearch,
      valueOf: (item) => latest.current.valueOf(item),
      onPageLoaded: (event) => latest.current.onPageLoaded?.(event),
    },
    createBumpAdapter(bump),
  );
  const core = coreRef.current;

  // a new source owns other rows: forget the old pages
  const armedSource = useRef(input.dataSource);
  useEffect(() => {
    if (armedSource.current === input.dataSource) return;
    armedSource.current = input.dataSource;
    core.syncSource();
  });
  useEffect(() => () => core.destroy(), [core]);

  return {
    core,
    active: input.dataSource != null,
    /** Non-virtual lists: a scroll near the bottom asks for the next page. */
    onScroll(element: HTMLElement): void {
      if (core.active && isNearScrollEnd(element)) core.loadMore();
    },
  };
}

/**
 * A non-virtual page too short to scroll asks for the next one itself —
 * measured after the rows render (a list without a scrollbar never scrolls).
 */
export function fillShortList<TItem>(
  element: HTMLElement | null,
  core: OgeRemoteListCore<TItem>,
): void {
  if (!element || element.clientHeight === 0 || !core.active) return;
  if (isNearScrollEnd(element)) core.loadMore();
}
