import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/tabs/src/lib/testing/** — the React
 * Testing Library counterpart of `OgeTabsHarness`, with the same member names
 * (`docs-tools:parity` compares them). Reads are synchronous; actions fire
 * act-wrapped events, so an async close guard is asserted with
 * `await waitFor(…)`.
 */
export const OGE_REACT_TABS_TESTING_API: ApiSections = {
  properties: [
    {
      title: 'Queries object',
      entries: [
        {
          name: 'element',
          type: 'HTMLElement',
          description:
            'The component’s root element (<code>.oge-tab-panel</code> / <code>.oge-tabs</code>).',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Finding the tabs',
      entries: [
        {
          name: 'getTabs(container?: HTMLElement, filters?: OgeTabsQueryFilters)',
          type: 'OgeTabsQueries',
          description:
            'The one <code>&lt;OgeTabPanel&gt;</code> / <code>&lt;OgeTabs&gt;</code> in (or being) the container (default <code>document.body</code>) matching <code>tab</code> (a tab label it must have) and <code>selectedTab</code>; throws on none or several. Import from <code>&#64;oge-ui/react-tabs/testing</code>; <code>&#64;testing-library/dom</code> is an optional peer only this entry needs.',
        },
        {
          name: 'getAllTabs(container?: HTMLElement, filters?: OgeTabsQueryFilters)',
          type: 'OgeTabsQueries[]',
          description: 'Every tab component in the container that matches.',
        },
        {
          name: 'selectTab(name: string | RegExp, container?: HTMLElement)',
          type: 'void',
          description:
            'Shortcut: clicks the tab with this label in the one tab component that has it.',
        },
      ],
    },
    {
      title: 'Tabs',
      entries: [
        {
          name: 'getTabLabels()',
          type: 'string[]',
          description:
            'Labels of every tab, in order — badges and dirty markers excluded.',
        },
        {
          name: 'getSelectedTabLabel()',
          type: 'string | null',
          description:
            'Label of the selected tab, <code>null</code> when none is.',
        },
        {
          name: 'getSelectedIndex()',
          type: 'number',
          description:
            '0-based index of the selected tab, <code>-1</code> when none is.',
        },
        {
          name: 'selectTab(tab: OgeTabQuery)',
          type: 'void',
          description:
            'Clicks a tab — by exact label, RegExp or 0-based index; a disabled tab stays unselected.',
        },
        {
          name: 'isTabDisabled(tab: OgeTabQuery)',
          type: 'boolean',
          description:
            'Whether a tab is disabled (<code>aria-disabled="true"</code>).',
        },
        {
          name: 'pressKey(tab: OgeTabQuery, key: string)',
          type: 'void',
          description:
            "Focuses a tab and presses a key on it (<code>'ArrowRight'</code>, <code>'Home'</code>, <code>'Delete'</code>…) — the strip’s keyboard model.",
        },
      ],
    },
    {
      title: 'Closing',
      entries: [
        {
          name: 'isTabClosable(tab: OgeTabQuery)',
          type: 'boolean',
          description: 'Whether a tab shows its close (✕) affordance.',
        },
        {
          name: 'closeTab(tab: OgeTabQuery)',
          type: 'void',
          description:
            'Clicks the tab’s ✕ — the close guard and the closing / closed callbacks run as for a user; throws for a tab that is not closable.',
        },
      ],
    },
    {
      title: 'Panel',
      entries: [
        {
          name: 'getPanelText()',
          type: 'string',
          description:
            "Text of the visible panel (tab panel only; <code>''</code> for a stand-alone strip).",
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeTabsQueries',
          type: 'interface',
          description:
            'What <code>getTabs()</code> returns — the members above.',
        },
        {
          name: 'OgeTabsQueryFilters',
          type: '{ tab?, selectedTab?: string | RegExp }',
          description:
            'Filters of <code>getTabs()</code> / <code>getAllTabs()</code>.',
        },
        {
          name: 'OgeTabQuery',
          type: 'string | RegExp | number',
          description: 'A tab by exact label, pattern or 0-based index.',
        },
      ],
    },
  ],
};
