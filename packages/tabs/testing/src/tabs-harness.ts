import {
  ComponentHarness,
  HarnessPredicate,
  TestKey,
  type BaseHarnessFilters,
  type TestElement,
} from '@angular/cdk/testing';

/** Filters for {@link OgeTabsHarness.with}. */
export interface OgeTabsHarnessFilters extends BaseHarnessFilters {
  /** Only components with a tab whose label matches. */
  tab?: string | RegExp;
  /** Only components whose selected tab's label matches. */
  selectedTab?: string | RegExp;
}

/** A tab by label (exact text or pattern) or by 0-based index. */
export type OgeTabQuery = string | RegExp | number;

/** Trimmed, whitespace-collapsed text — what a reader sees. */
const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The component's own strip — never a nested tab component's. */
const TABS = ':scope > oge-tab-strip .oge-tab[role="tab"]';
const PANEL =
  ':scope > .oge-tab-panel-content > [role="tabpanel"]:not([hidden])';

/**
 * Harness for `oge-tab-panel` and the stand-alone `oge-tabs` strip — tab
 * labels, the selected tab, selecting by label and closing closable tabs.
 *
 * ```ts
 * const tabs = await loader.getHarness(OgeTabsHarness.with({ tab: 'Billing' }));
 * await tabs.selectTab('Billing');
 * expect(await tabs.getSelectedTabLabel()).toBe('Billing');
 * expect(await tabs.getPanelText()).toContain('Invoices');
 * await tabs.closeTab('Billing');
 * ```
 */
export class OgeTabsHarness extends ComponentHarness {
  static hostSelector = 'oge-tab-panel, oge-tabs';

  static with(
    options: OgeTabsHarnessFilters = {},
  ): HarnessPredicate<OgeTabsHarness> {
    return new HarnessPredicate(OgeTabsHarness, options)
      .addOption('tab', options.tab, async (harness, tab) => {
        for (const label of await harness.getTabLabels()) {
          if (await HarnessPredicate.stringMatches(label, tab)) return true;
        }
        return false;
      })
      .addOption('selectedTab', options.selectedTab, (harness, tab) =>
        HarnessPredicate.stringMatches(harness.getSelectedTabLabel(), tab),
      );
  }

  private readonly tabs = this.locatorForAll(TABS);
  private readonly panel = this.locatorForOptional(PANEL);

  /** Labels of every tab, in order. */
  async getTabLabels(): Promise<string[]> {
    const tabs = await this.tabs();
    return Promise.all(tabs.map((tab) => this.labelOf(tab)));
  }

  /** Label of the selected tab, or `null` when none is selected. */
  async getSelectedTabLabel(): Promise<string | null> {
    const index = await this.getSelectedIndex();
    return index < 0 ? null : (await this.getTabLabels())[index];
  }

  /** 0-based index of the selected tab, `-1` when none is selected. */
  async getSelectedIndex(): Promise<number> {
    const tabs = await this.tabs();
    for (let i = 0; i < tabs.length; i++) {
      if ((await tabs[i].getAttribute('aria-selected')) === 'true') return i;
    }
    return -1;
  }

  /** Clicks a tab — selects it unless it is disabled. */
  async selectTab(tab: OgeTabQuery): Promise<void> {
    return (await this.tab(tab)).click();
  }

  /** Whether a tab is disabled (`aria-disabled="true"`). */
  async isTabDisabled(tab: OgeTabQuery): Promise<boolean> {
    return (
      (await (await this.tab(tab)).getAttribute('aria-disabled')) === 'true'
    );
  }

  /** Whether a tab shows its close (✕) affordance. */
  async isTabClosable(tab: OgeTabQuery): Promise<boolean> {
    return (await this.closeIcon(tab)) !== null;
  }

  /**
   * Closes a closable tab by clicking its ✕ (the close guard and the
   * `tabClosing` / `tabClosed` events run as for a user).
   */
  async closeTab(tab: OgeTabQuery): Promise<void> {
    const close = await this.closeIcon(tab);
    if (!close)
      throw Error(`OgeTabsHarness: tab ${String(tab)} is not closable`);
    return close.click();
  }

  /**
   * Presses a key on a tab — the strip's keyboard model (arrows, Home / End,
   * Delete on a closable tab).
   */
  async pressKey(tab: OgeTabQuery, key: TestKey): Promise<void> {
    const element = await this.tab(tab);
    await element.focus();
    return element.sendKeys(key);
  }

  /** Text of the visible panel (`oge-tab-panel` only; `''` otherwise). */
  async getPanelText(): Promise<string> {
    const panel = await this.panel();
    return panel ? clean(await panel.text()) : '';
  }

  private async tab(query: OgeTabQuery): Promise<TestElement> {
    const tabs = await this.tabs();
    if (typeof query === 'number') {
      const tab = tabs[query];
      if (!tab) throw Error(`OgeTabsHarness: no tab at index ${query}`);
      return tab;
    }
    for (const tab of tabs) {
      if (await HarnessPredicate.stringMatches(this.labelOf(tab), query)) {
        return tab;
      }
    }
    const labels = await this.getTabLabels();
    throw Error(
      `OgeTabsHarness: no tab matching ${String(query)} (tabs: ${labels.join(', ')})`,
    );
  }

  private async closeIcon(query: OgeTabQuery): Promise<TestElement | null> {
    const id = await (await this.tab(query)).getAttribute('data-tab-id');
    return this.locatorForOptional(
      `${TABS}[data-tab-id="${id}"] .oge-tab-close`,
    )();
  }

  /** The tab's text without its badge and dirty marker. */
  private async labelOf(tab: TestElement): Promise<string> {
    return clean(
      await tab.text({ exclude: '.oge-tab-badge, .oge-tab-dirty-dot' }),
    );
  }
}
