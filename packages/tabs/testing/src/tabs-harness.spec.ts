import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestKey, type HarnessLoader } from '@angular/cdk/testing';
import { OgeTab } from '../../src/lib/tab';
import { OgeTabPanel } from '../../src/lib/tab-panel';
import { OgeTabs } from '../../src/lib/tabs';
import type { OgeTabClosedEvent, OgeTabItem } from '../../src/lib/tabs-types';
import { OgeTabsHarness } from './tabs-harness';

@Component({
  imports: [OgeTabPanel, OgeTab, OgeTabs],
  template: `
    <oge-tab-panel
      id="settings"
      [items]="items()"
      [closable]="true"
      [(selectedIndex)]="index"
      (tabClosed)="onClosed($event)"
    />
    <oge-tabs id="views">
      <oge-tab text="Day" />
      <oge-tab text="Week" badge="3" />
      <oge-tab text="Month" [disabled]="true" />
    </oge-tabs>
    <oge-tab-panel id="docs">
      <oge-tab text="Intro"><p>Welcome aboard</p></oge-tab>
      <oge-tab text="API"><p>Every member</p></oge-tab>
    </oge-tab-panel>
  `,
})
class Host {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'general', text: 'General' },
    { key: 'billing', text: 'Billing' },
    { key: 'team', text: 'Team' },
  ]);
  readonly index = signal(0);

  onClosed(event: OgeTabClosedEvent): void {
    this.items.set(this.items().filter((item) => item.key !== event.key));
  }
}

function setup(): { host: Host; loader: HarnessLoader } {
  const fixture = TestBed.createComponent(Host);
  return {
    host: fixture.componentInstance,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
}

describe('OgeTabsHarness', () => {
  it('finds every tab component and filters them', async () => {
    const { loader } = setup();
    expect(await loader.getAllHarnesses(OgeTabsHarness)).toHaveLength(3);
    const views = await loader.getHarness(OgeTabsHarness.with({ tab: 'Week' }));
    expect(await views.getTabLabels()).toEqual(['Day', 'Week', 'Month']);
    expect(
      await loader.getAllHarnesses(
        OgeTabsHarness.with({ selectedTab: 'General' }),
      ),
    ).toHaveLength(1);
  });

  it('selects by label and index and reads the panel', async () => {
    const { host, loader } = setup();
    const tabs = await loader.getHarness(
      OgeTabsHarness.with({ selector: '#settings' }),
    );
    expect(await tabs.getSelectedTabLabel()).toBe('General');
    await tabs.selectTab('Billing');
    expect(host.index()).toBe(1);
    expect(await tabs.getSelectedIndex()).toBe(1);
    await tabs.selectTab(2);
    expect(await tabs.getSelectedTabLabel()).toBe('Team');
    await tabs.pressKey('Team', TestKey.HOME);
    expect(await tabs.getSelectedTabLabel()).toBe('General');
  });

  it('reads the visible panel', async () => {
    const { loader } = setup();
    const docs = await loader.getHarness(
      OgeTabsHarness.with({ selector: '#docs' }),
    );
    expect(await docs.getPanelText()).toBe('Welcome aboard');
    await docs.selectTab('API');
    expect(await docs.getPanelText()).toBe('Every member');
  });

  it('reports disabled tabs and leaves them unselected', async () => {
    const { loader } = setup();
    const views = await loader.getHarness(
      OgeTabsHarness.with({ selector: '#views' }),
    );
    expect(await views.isTabDisabled('Month')).toBe(true);
    await views.selectTab('Month');
    expect(await views.getSelectedTabLabel()).toBe('Day');
    await views.selectTab(/^We/);
    expect(await views.getSelectedTabLabel()).toBe('Week');
  });

  it('closes closable tabs', async () => {
    const { loader } = setup();
    const tabs = await loader.getHarness(
      OgeTabsHarness.with({ selector: '#settings' }),
    );
    const views = await loader.getHarness(
      OgeTabsHarness.with({ selector: '#views' }),
    );
    expect(await tabs.isTabClosable('Billing')).toBe(true);
    expect(await views.isTabClosable('Day')).toBe(false);
    await tabs.closeTab('Billing');
    expect(await tabs.getTabLabels()).toEqual(['General', 'Team']);
    await expect(views.closeTab('Day')).rejects.toThrow(/not closable/);
  });
});
