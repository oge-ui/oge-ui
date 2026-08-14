'use client';

import { useCallback, useRef, useState } from 'react';
import {
  applyTabOrder,
  canSelectTab,
  reorderTabIds,
  resolveTabIndex,
  tabItemDescriptor,
  type OgeTabClosedEvent,
  type OgeTabClosingEvent,
  type OgeTabDescriptorCore,
  type OgeTabItem,
  type OgeTabReorderedEvent,
  type OgeTabReorderingEvent,
  type OgeTabSelectionChangedEvent,
  type OgeTabSelectionChangingEvent,
  type OgeTabsMessages,
} from '@oge-ui/behavior';
import { useOgeTabsConfig } from './tabs-config';
import type { OgeReactTabDescriptor, OgeTabsSharedProps } from './tabs-types';

/**
 * The React face of the Angular `OgeTabsBase`: merges the `tabs` children
 * with the `items` prop into descriptors, reconciles the
 * `selectedIndex`/`selectedKey` controlled pairs, and runs the cancelable
 * selection / close / reorder pipelines over `@oge-ui/behavior`'s decision
 * functions — the same answers the Angular component gets.
 */
export function useOgeTabs(props: OgeTabsSharedProps) {
  const config = useOgeTabsConfig();
  const messages: OgeTabsMessages = { ...config.messages, ...props.messages };

  const reactId = useRef<string>(undefined);
  reactId.current ??= `oge-tabs-${Math.trunc(performance.now() * 1000) % 1e9}`;

  // --- descriptors ---------------------------------------------------------

  /** Display order (descriptor ids) accumulated by drag reorders. */
  const [tabOrder, setTabOrder] = useState<readonly string[]>([]);

  const defaultClosable = props.closable ?? false;
  const descriptors: readonly OgeReactTabDescriptor[] = applyTabOrder(
    [
      ...(props.tabs ?? [])
        .filter((tab) => tab.visible !== false)
        .map((tab, index) => ({
          ...tabItemDescriptor(tab, index, defaultClosable),
          id: tab.key ?? `c${index}`,
          content: tab.content,
          renderHeader: tab.renderHeader,
        })),
      ...(props.items ?? [])
        .filter((item) => item.visible !== false)
        .map((item, index) => ({
          ...tabItemDescriptor(item, index, defaultClosable),
          content: undefined,
          renderHeader: props.renderTabHeader,
        })),
    ],
    tabOrder,
  );

  // --- selection (controlled/uncontrolled pairs) ---------------------------

  const [uncontrolledIndex, setUncontrolledIndex] = useState(
    props.defaultSelectedIndex ?? 0,
  );
  const controlledIndex =
    props.selectedIndex ??
    (props.selectedKey !== undefined
      ? descriptors.findIndex((d) => d.key === props.selectedKey)
      : undefined);
  const rawIndex = controlledIndex ?? uncontrolledIndex;
  // Keep the index in range when tabs are removed — the Angular clamp effect.
  const selectedIndex =
    descriptors.length > 0 && rawIndex > descriptors.length - 1
      ? descriptors.length - 1
      : rawIndex;

  const latest = useRef({ props, descriptors, selectedIndex, messages });
  latest.current = { props, descriptors, selectedIndex, messages };

  const setSelected = (index: number): void => {
    const p = latest.current.props;
    if (p.selectedIndex === undefined && p.selectedKey === undefined) {
      setUncontrolledIndex(index);
    }
    p.onSelectedIndexChange?.(index);
    p.onSelectedKeyChange?.(latest.current.descriptors[index]?.key);
  };

  // --- close pipeline ------------------------------------------------------

  const [closePendingIds, setClosePendingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  /** Guards a stale async close from finalizing after the tabs changed. */
  const closeSeq = useRef(0);

  const setClosePending = (id: string, pending: boolean): void => {
    setClosePendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const finalizeClose = (d: OgeTabDescriptorCore): void => {
    const index = latest.current.descriptors.findIndex(
      (entry) => entry.id === d.id,
    );
    if (index === -1) return;
    const closed: OgeTabClosedEvent = { index, key: d.key, item: d.item };
    latest.current.props.onTabClosed?.(closed);
    closedFocusRef.current?.(index);
  };

  /** Set by the strip so the owner can hand focus on after a close (APG). */
  const closedFocusRef = useRef<((index: number) => void) | null>(null);

  const requestClose = (index: number, event?: Event): void => {
    const d = latest.current.descriptors[index];
    if (!d || closePendingIds.has(d.id)) return;
    const closing: OgeTabClosingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    latest.current.props.onTabClosing?.(closing);
    if (closing.cancel) return;
    const guard = d.closeGuard;
    if (!guard) {
      finalizeClose(d);
      return;
    }
    let result: boolean | Promise<boolean>;
    try {
      result = guard();
    } catch {
      return; // a throwing guard vetoes the close
    }
    if (typeof result === 'boolean') {
      if (result) finalizeClose(d);
      return;
    }
    const runId = ++closeSeq.current;
    setClosePending(d.id, true);
    result.then(
      (allowed) => {
        setClosePending(d.id, false);
        if (runId === closeSeq.current && allowed) finalizeClose(d);
      },
      () => setClosePending(d.id, false), // a rejection counts as a veto
    );
  };

  // --- selection pipeline --------------------------------------------------

  const requestSelect = (index: number, event?: Event): void => {
    const { descriptors: ds, selectedIndex: from, props: p } = latest.current;
    if (!canSelectTab(ds, index, from, p.disabled ?? false)) return;
    const target = ds[index];
    const changing: OgeTabSelectionChangingEvent = {
      fromIndex: from,
      toIndex: index,
      fromKey: ds[from]?.key,
      toKey: target.key,
      item: target.item,
      event,
      cancel: false,
    };
    p.onSelectionChanging?.(changing);
    if (changing.cancel) return;
    setSelected(index);
    const changed: OgeTabSelectionChangedEvent = {
      index,
      key: target.key,
      previousIndex: from,
      previousKey: ds[from]?.key,
      item: target.item,
      event,
    };
    p.onSelectionChanged?.(changed);
  };

  // --- reorder pipeline ----------------------------------------------------

  const requestReorder = (fromIndex: number, toIndex: number): void => {
    const { descriptors: ds, props: p } = latest.current;
    const to = Math.max(0, Math.min(toIndex, ds.length - 1));
    const moved = ds[fromIndex];
    if (!moved || fromIndex === to) return;
    const reordering: OgeTabReorderingEvent = {
      fromIndex,
      toIndex: to,
      key: moved.key,
      cancel: false,
    };
    p.onTabReordering?.(reordering);
    if (reordering.cancel) return;
    const selectedId = ds[latest.current.selectedIndex]?.id;
    const ids = reorderTabIds(ds, fromIndex, to);
    setTabOrder(ids);
    if (selectedId !== undefined) {
      const nextIndex = ids.indexOf(selectedId);
      if (nextIndex !== -1) setSelected(nextIndex);
    }
    const reordered: OgeTabReorderedEvent = {
      fromIndex,
      toIndex: to,
      key: moved.key,
    };
    p.onTabReordered?.(reordered);
  };

  // --- public helpers ------------------------------------------------------

  const closeTab = useCallback((target: number | string): void => {
    const index = resolveTabIndex(latest.current.descriptors, target);
    if (index !== -1) requestClose(index);
    // requestClose reads everything through `latest`
  }, []);

  const onTabClick = (index: number, event: MouseEvent | KeyboardEvent) => {
    const d = latest.current.descriptors[index];
    if (!d) return;
    latest.current.props.onTabClick?.({
      index,
      key: d.key,
      item: d.item,
      event,
    });
    requestSelect(index, event);
  };

  return {
    id: reactId.current,
    messages,
    descriptors,
    selectedIndex,
    closePendingIds,
    closedFocusRef,
    onTabClick,
    requestSelect,
    requestClose,
    requestReorder,
    closeTab,
  };
}

/** Item-shaped tabs re-exported for the components' prop types. */
export type { OgeTabItem };
