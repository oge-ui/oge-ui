import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/tabs/testing/src/** — keep in sync with the
 * source TSDoc when the harness changes. The React counterpart
 * (`react-tabs/react-tabs-testing-api-data.ts`) uses the same member names;
 * `docs-tools:parity` compares the two.
 */

/** The same members as the React table, apart from the return types. */
const tabsTestingMembers = (
  wrap: (type: string) => string,
  keyType: string,
): readonly ApiGroup[] => [
  {
    title: 'Tabs',
    entries: [
      {
        name: 'getTabLabels()',
        type: wrap('string[]'),
        description:
          'Labels of every tab, in order — badges and dirty markers excluded.',
      },
      {
        name: 'getSelectedTabLabel()',
        type: wrap('string | null'),
        description:
          'Label of the selected tab, <code>null</code> when none is.',
      },
      {
        name: 'getSelectedIndex()',
        type: wrap('number'),
        description:
          '0-based index of the selected tab, <code>-1</code> when none is.',
      },
      {
        name: 'selectTab(tab: OgeTabQuery)',
        type: wrap('void'),
        description:
          'Clicks a tab — by exact label, RegExp or 0-based index; a disabled tab stays unselected.',
      },
      {
        name: 'isTabDisabled(tab: OgeTabQuery)',
        type: wrap('boolean'),
        description:
          'Whether a tab is disabled (<code>aria-disabled="true"</code>).',
      },
      {
        name: `pressKey(tab: OgeTabQuery, key: ${keyType})`,
        type: wrap('void'),
        description:
          'Focuses a tab and presses a key on it — the strip’s keyboard model (arrows, Home / End, Delete on a closable tab).',
      },
    ],
  },
  {
    title: 'Closing',
    entries: [
      {
        name: 'isTabClosable(tab: OgeTabQuery)',
        type: wrap('boolean'),
        description: 'Whether a tab shows its close (✕) affordance.',
      },
      {
        name: 'closeTab(tab: OgeTabQuery)',
        type: wrap('void'),
        description:
          'Clicks the tab’s ✕ — the close guard and the closing / closed events run as for a user; throws for a tab that is not closable.',
      },
    ],
  },
  {
    title: 'Panel',
    entries: [
      {
        name: 'getPanelText()',
        type: wrap('string'),
        description:
          "Text of the visible panel (tab panel only; <code>''</code> for a stand-alone strip).",
      },
    ],
  },
];

export const OGE_TABS_HARNESS_API: ApiSections = {
  properties: [
    {
      title: 'Harness',
      entries: [
        {
          name: 'hostSelector',
          type: "'oge-tab-panel, oge-tabs'",
          description:
            'Static. The host selector the CDK loader matches — both tab components. Import from <code>&#64;oge-ui/tabs/testing</code>; <code>&#64;angular/cdk</code> is an optional peer only this entry needs.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Finding the tabs',
      entries: [
        {
          name: 'with(filters?: OgeTabsHarnessFilters)',
          type: 'HarnessPredicate<OgeTabsHarness>',
          description:
            'Static. Predicate for <code>loader.getHarness()</code>: <code>selector</code>, <code>ancestor</code>, <code>tab</code> (a tab label it must have) and <code>selectedTab</code>, each a string or RegExp.',
        },
      ],
    },
    ...tabsTestingMembers((type) => `Promise<${type}>`, 'TestKey'),
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeTabsHarnessFilters',
          type: 'BaseHarnessFilters & { tab?, selectedTab?: string | RegExp }',
          description: 'Options of <code>OgeTabsHarness.with()</code>.',
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
