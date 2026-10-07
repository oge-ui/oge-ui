import {
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';
import {
  OgeInputHarnessBase,
  ogeCleanText,
  type OgeInputHarnessFilters,
} from './input-harness';

/** Filter for {@link OgeSelectBoxHarness.getOptions}. */
export interface OgeSelectOptionFilter {
  /** Only options whose text matches. */
  text?: string | RegExp;
}

/**
 * Harness for `oge-select-box` — the WAI-ARIA combobox + listbox.
 *
 * The listbox is found through the combobox's `aria-controls`, from the
 * document root, so the harness works wherever the popup renders.
 *
 * ```ts
 * const city = await loader.getHarness(OgeSelectBoxHarness.with({ label: 'City' }));
 * await city.selectOption('Oslo');
 * expect(await city.getValue()).toBe('Oslo');
 * expect(await city.isOpen()).toBe(false);
 * ```
 */
export class OgeSelectBoxHarness extends OgeInputHarnessBase {
  static hostSelector = 'oge-select-box';

  static with(
    options: OgeInputHarnessFilters = {},
  ): HarnessPredicate<OgeSelectBoxHarness> {
    return OgeInputHarnessBase.inputPredicate(OgeSelectBoxHarness, options);
  }

  /** Whether the popup is open (`aria-expanded="true"`). */
  async isOpen(): Promise<boolean> {
    return (
      (await (await this.native()).getAttribute('aria-expanded')) === 'true'
    );
  }

  /** Opens the popup with a click on the field (no-op when open). */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await (await this.native()).click();
  }

  /** Closes the popup with Escape (no-op when closed). */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await (await this.native()).sendKeys(TestKey.ESCAPE);
  }

  /** Texts of the listed options — opens the popup first. */
  async getOptions(filter: OgeSelectOptionFilter = {}): Promise<string[]> {
    const options = await this.optionElements(filter);
    return Promise.all(options.map(async ({ text }) => text));
  }

  /**
   * Opens the popup and clicks the first option whose text matches; the
   * popup closes as it does for a user.
   */
  async selectOption(text: string | RegExp): Promise<void> {
    const [match] = await this.optionElements({ text });
    if (!match) {
      const all = await this.getOptions();
      throw Error(
        `OgeSelectBoxHarness: no option matching ${String(text)} (options: ${all.join(', ')})`,
      );
    }
    await match.element.click();
  }

  /** Text of the selected option in the open list, or `null` when none is. */
  async getSelectedOptionText(): Promise<string | null> {
    for (const { element, text } of await this.optionElements({})) {
      if ((await element.getAttribute('aria-selected')) === 'true') return text;
    }
    return null;
  }

  /** Types into the search field (`searchEnabled`), without committing. */
  async search(text: string): Promise<void> {
    const native = await this.native();
    await native.clear();
    await native.sendKeys(text);
  }

  private async optionElements(
    filter: OgeSelectOptionFilter,
  ): Promise<{ element: TestElement; text: string }[]> {
    await this.open();
    const listId = await (await this.native()).getAttribute('aria-controls');
    if (!listId) throw Error('OgeSelectBoxHarness: the popup did not open');
    const elements = await this.documentRootLocatorFactory().locatorForAll(
      `[id="${listId}"] [role="option"]`,
    )();
    const options = await Promise.all(
      elements.map(async (element) => ({
        element,
        text: ogeCleanText(await element.text()),
      })),
    );
    if (filter.text === undefined) return options;
    const matches: { element: TestElement; text: string }[] = [];
    for (const option of options) {
      if (await HarnessPredicate.stringMatches(option.text, filter.text)) {
        matches.push(option);
      }
    }
    return matches;
  }
}
