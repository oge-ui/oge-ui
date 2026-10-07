import { render, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { OgeTabPanel } from '../tab-panel';
import { OgeTabs } from '../tabs';
import type { OgeTabItem } from '../tabs-types';
import { getAllTabs, getTabs, selectTab } from './tabs-queries';

function Screen() {
  const [items, setItems] = useState<readonly OgeTabItem[]>([
    { key: 'general', text: 'General', closable: true },
    { key: 'billing', text: 'Billing', closable: true },
    { key: 'team', text: 'Team', closable: true },
  ]);
  return (
    <StrictMode>
      <div id="settings">
        <OgeTabPanel
          items={items}
          onTabClosed={(event) =>
            setItems((all) => all.filter((item) => item.key !== event.key))
          }
        />
      </div>
      <div id="views">
        <OgeTabs
          items={[
            { text: 'Day' },
            { text: 'Week', badge: 3 },
            { text: 'Month', disabled: true },
          ]}
        />
      </div>
      <div id="docs">
        <OgeTabPanel
          tabs={[
            { text: 'Intro', content: <p>Welcome aboard</p> },
            { text: 'API', content: <p>Every member</p> },
          ]}
        />
      </div>
    </StrictMode>
  );
}

const scope = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`#${id}`) as HTMLElement;

describe('getTabs', () => {
  it('finds every tab component and filters them', () => {
    const { container } = render(<Screen />);
    expect(getAllTabs(container)).toHaveLength(3);
    expect(() => getTabs(container)).toThrow(/found 3/);
    expect(getTabs(container, { tab: 'Week' }).getTabLabels()).toEqual([
      'Day',
      'Week',
      'Month',
    ]);
    expect(getAllTabs(container, { selectedTab: 'General' })).toHaveLength(1);
  });

  it('selects by label, index and keyboard', async () => {
    const { container } = render(<Screen />);
    const tabs = getTabs(scope(container, 'settings'));
    expect(tabs.getSelectedTabLabel()).toBe('General');
    tabs.selectTab('Billing');
    await waitFor(() => expect(tabs.getSelectedIndex()).toBe(1));
    tabs.selectTab(2);
    await waitFor(() => expect(tabs.getSelectedTabLabel()).toBe('Team'));
    tabs.pressKey('Team', 'Home');
    await waitFor(() => expect(tabs.getSelectedTabLabel()).toBe('General'));
  });

  it('reads the visible panel', async () => {
    const { container } = render(<Screen />);
    const docs = getTabs(scope(container, 'docs'));
    expect(docs.getPanelText()).toBe('Welcome aboard');
    selectTab('API', container);
    await waitFor(() => expect(docs.getPanelText()).toBe('Every member'));
  });

  it('reports disabled tabs and leaves them unselected', async () => {
    const { container } = render(<Screen />);
    const views = getTabs(scope(container, 'views'));
    expect(views.isTabDisabled('Month')).toBe(true);
    views.selectTab('Month');
    expect(views.getSelectedTabLabel()).toBe('Day');
    views.selectTab(/^We/);
    await waitFor(() => expect(views.getSelectedTabLabel()).toBe('Week'));
  });

  it('closes closable tabs', async () => {
    const { container } = render(<Screen />);
    const tabs = getTabs(scope(container, 'settings'));
    const views = getTabs(scope(container, 'views'));
    expect(tabs.isTabClosable('Billing')).toBe(true);
    expect(views.isTabClosable('Day')).toBe(false);
    tabs.closeTab('Billing');
    await waitFor(() =>
      expect(tabs.getTabLabels()).toEqual(['General', 'Team']),
    );
    expect(() => views.closeTab('Day')).toThrow(/not closable/);
  });
});
