import { fireEvent, getConfig } from '@testing-library/dom';

/** Filters for {@link getTabs} / {@link getAllTabs}. */
export interface OgeTabsQueryFilters {
  /** Only components with a tab whose label matches. */
  tab?: string | RegExp;
  /** Only components whose selected tab's label matches. */
  selectedTab?: string | RegExp;
}

/** A tab by label (exact text or pattern) or by 0-based index. */
export type OgeTabQuery = string | RegExp | number;

/**
 * Typed queries and actions over one `<OgeTabPanel>` or stand-alone
 * `<OgeTabs>` — the React counterpart of `OgeTabsHarness` from
 * `@oge-ui/tabs/testing`, with the same member names. Reads are synchronous;
 * actions fire events through Testing Library (act-wrapped once
 * `@testing-library/react` is loaded). An async close guard settles later:
 * assert with `await waitFor(…)`.
 */
export interface OgeTabsQueries {
  /** The component's root element (`.oge-tab-panel` / `.oge-tabs`). */
  readonly element: HTMLElement;
  /** Labels of every tab, in order (badges and dirty markers excluded). */
  getTabLabels(): string[];
  /** Label of the selected tab, or `null` when none is selected. */
  getSelectedTabLabel(): string | null;
  /** 0-based index of the selected tab, `-1` when none is selected. */
  getSelectedIndex(): number;
  /** Clicks a tab — selects it unless it is disabled. */
  selectTab(tab: OgeTabQuery): void;
  /** Whether a tab is disabled (`aria-disabled="true"`). */
  isTabDisabled(tab: OgeTabQuery): boolean;
  /** Whether a tab shows its close (✕) affordance. */
  isTabClosable(tab: OgeTabQuery): boolean;
  /** Closes a closable tab by clicking its ✕. */
  closeTab(tab: OgeTabQuery): void;
  /** Focuses a tab and presses a key on it (`'ArrowRight'`, `'Home'`, `'Delete'`…). */
  pressKey(tab: OgeTabQuery, key: string): void;
  /** Text of the visible panel (`<OgeTabPanel>` only; `''` otherwise). */
  getPanelText(): string;
}

const ROOTS = '.oge-tab-panel, .oge-tabs';
const TABS = ':scope > .oge-tab-strip .oge-tab[role="tab"]';
const PANEL =
  ':scope > .oge-tab-panel-content > [role="tabpanel"]:not([hidden])';

const clean = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

const matches = (text: string, pattern: string | RegExp): boolean =>
  typeof pattern === 'string' ? text === pattern : pattern.test(text);

/** The tab's text without its badge and dirty marker. */
function labelOf(tab: HTMLElement): string {
  const copy = tab.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll('.oge-tab-badge, .oge-tab-dirty-dot')
    .forEach((node) => node.remove());
  return clean(copy.textContent);
}

function createTabsQueries(root: HTMLElement): OgeTabsQueries {
  const tabs = () => Array.from(root.querySelectorAll<HTMLElement>(TABS));
  const tab = (query: OgeTabQuery): HTMLElement => {
    const list = tabs();
    const found =
      typeof query === 'number'
        ? list[query]
        : list.find((t) => matches(labelOf(t), query));
    if (!found) {
      throw new Error(
        `getTabs: no tab matching ${String(query)} (tabs: ${list.map(labelOf).join(', ')})`,
      );
    }
    return found;
  };
  const selectedIndex = () =>
    tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');
  return {
    element: root,
    getTabLabels: () => tabs().map(labelOf),
    getSelectedTabLabel() {
      const index = selectedIndex();
      return index < 0 ? null : labelOf(tabs()[index]);
    },
    getSelectedIndex: selectedIndex,
    selectTab: (query) => {
      fireEvent.click(tab(query));
    },
    isTabDisabled: (query) =>
      tab(query).getAttribute('aria-disabled') === 'true',
    isTabClosable: (query) =>
      tab(query).querySelector('.oge-tab-close') !== null,
    closeTab(query) {
      const close = tab(query).querySelector('.oge-tab-close');
      if (!close) {
        throw new Error(`getTabs: tab ${String(query)} is not closable`);
      }
      fireEvent.click(close);
    },
    pressKey(query, key) {
      const target = tab(query);
      getConfig().eventWrapper(() => target.focus());
      fireEvent.keyDown(target, { key, code: key });
    },
    getPanelText: () => clean(root.querySelector(PANEL)?.textContent),
  };
}

/** Every tab component in (or being) the container, optionally filtered. */
export function getAllTabs(
  container: HTMLElement = document.body,
  filters: OgeTabsQueryFilters = {},
): OgeTabsQueries[] {
  const roots = container.matches(ROOTS)
    ? [container]
    : Array.from(container.querySelectorAll<HTMLElement>(ROOTS));
  return roots.map(createTabsQueries).filter((tabs) => {
    if (
      filters.tab !== undefined &&
      !tabs
        .getTabLabels()
        .some((label) => matches(label, filters.tab as string | RegExp))
    ) {
      return false;
    }
    if (filters.selectedTab !== undefined) {
      const selected = tabs.getSelectedTabLabel();
      if (selected === null || !matches(selected, filters.selectedTab)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * The one `<OgeTabPanel>` / `<OgeTabs>` in the container that matches the
 * filters; throws when there is none or more than one.
 *
 * ```tsx
 * const { container } = render(<Settings />);
 * const tabs = getTabs(container, { tab: 'Billing' });
 * tabs.selectTab('Billing');
 * expect(tabs.getSelectedTabLabel()).toBe('Billing');
 * expect(tabs.getPanelText()).toContain('Invoices');
 * ```
 */
export function getTabs(
  container: HTMLElement = document.body,
  filters: OgeTabsQueryFilters = {},
): OgeTabsQueries {
  const all = getAllTabs(container, filters);
  if (all.length !== 1) {
    throw new Error(
      `getTabs: expected one tab component, found ${all.length} — narrow the container or pass a tab filter`,
    );
  }
  return all[0];
}

/**
 * Shortcut: clicks the tab with this label in the one tab component that has
 * such a tab.
 *
 * ```tsx
 * selectTab('Billing');
 * ```
 */
export function selectTab(
  name: string | RegExp,
  container: HTMLElement = document.body,
): void {
  getTabs(container, { tab: name }).selectTab(name);
}
