import { InjectionToken, type Provider } from '@angular/core';

/**
 * Every user-facing string in the tree view — override globally via
 * `provideOgeTreeViewConfig({ messages: {...} })` or per component via
 * `[messages]`.
 */
export interface OgeTreeViewMessages {
  /** Label of the "select all" row. */
  selectAll: string;
  /** Placeholder of the built-in search box. */
  searchPlaceholder: string;
  /** Accessible name of the built-in search box. */
  searchLabel: string;
  /** Accessible name of the search box's clear button. */
  clearSearch: string;
  /** Announced while a node's lazy children are loading. */
  loadingChildren: string;
  /** Shown in place of a node's children when `loadChildren` rejected. */
  childrenLoadFailed: string;
  /** Shown when the tree has no nodes at all. */
  noData: string;
  /** Shown when a search matched nothing. */
  noSearchResults: string;
}

export const OGE_DEFAULT_TREE_VIEW_MESSAGES: OgeTreeViewMessages = {
  selectAll: 'Select all',
  searchPlaceholder: 'Search…',
  searchLabel: 'Search the tree',
  clearSearch: 'Clear search',
  loadingChildren: 'Loading…',
  childrenLoadFailed: 'Could not load these items.',
  noData: 'No items to display',
  noSearchResults: 'No matching items',
};

/** Application-wide defaults for the tree view. */
export interface OgeTreeViewConfig {
  messages: OgeTreeViewMessages;
  /** Default row height used by `virtualScroll` (px). */
  itemHeight?: number;
  /** Default for the `expandEvent` input. */
  expandEvent?: 'click' | 'dblclick';
}

export const OGE_DEFAULT_TREE_VIEW_CONFIG: OgeTreeViewConfig = {
  messages: OGE_DEFAULT_TREE_VIEW_MESSAGES,
};

export const OGE_TREE_VIEW_CONFIG = new InjectionToken<OgeTreeViewConfig>(
  'OGE_TREE_VIEW_CONFIG',
  {
    factory: () => OGE_DEFAULT_TREE_VIEW_CONFIG,
  },
);

export type OgeTreeViewConfigInput = Partial<
  Omit<OgeTreeViewConfig, 'messages'>
> & {
  messages?: Partial<OgeTreeViewMessages>;
};

/**
 * Application- or component-scoped tree view defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeTreeViewConfig({
 *     messages: { searchPlaceholder: 'Ara…', selectAll: 'Tümünü seç' },
 *   }),
 * ]
 * ```
 */
export function provideOgeTreeViewConfig(
  config: OgeTreeViewConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_TREE_VIEW_CONFIG,
    useValue: {
      ...OGE_DEFAULT_TREE_VIEW_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_TREE_VIEW_MESSAGES, ...messages },
    } satisfies OgeTreeViewConfig,
  };
}
