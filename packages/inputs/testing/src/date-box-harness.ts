import { HarnessPredicate, TestKey } from '@angular/cdk/testing';
import {
  OgeInputHarnessBase,
  ogeCleanText,
  type OgeInputHarnessFilters,
} from './input-harness';

/**
 * Harness for `oge-date-box` — a combobox whose popup is a date (and time)
 * picker dialog.
 *
 * ```ts
 * const due = await loader.getHarness(OgeDateBoxHarness.with({ label: 'Due' }));
 * await due.setValue('3/14/2026');          // typed + Enter, in the box's locale
 * await due.open();
 * await due.selectDay(20);                  // a day of the month on show
 * expect(await due.isOpen()).toBe(false);
 * ```
 *
 * Typed text is parsed in the box's locale — pin `locale` in specs.
 */
export class OgeDateBoxHarness extends OgeInputHarnessBase {
  static hostSelector = 'oge-date-box';

  static with(
    options: OgeInputHarnessFilters = {},
  ): HarnessPredicate<OgeDateBoxHarness> {
    return OgeInputHarnessBase.inputPredicate(OgeDateBoxHarness, options);
  }

  /** Whether the picker is open (`aria-expanded="true"`). */
  async isOpen(): Promise<boolean> {
    return (
      (await (await this.native()).getAttribute('aria-expanded')) === 'true'
    );
  }

  /** Opens the picker with a click on the field (no-op when open). */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await (await this.native()).click();
  }

  /** Closes the picker with Escape (no-op when closed). */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await (await this.native()).sendKeys(TestKey.ESCAPE);
  }

  /**
   * Types a date and commits it with Enter — unparseable text reverts to the
   * previous value, as it does for a user.
   */
  override async setValue(text: string): Promise<void> {
    const native = await this.native();
    await native.clear();
    if (text !== '') await native.sendKeys(text);
    await native.sendKeys(TestKey.ENTER);
  }

  /** The heading of the month on show in the open picker (`"March 2026"`). */
  async getCalendarTitle(): Promise<string> {
    const title = await this.documentRootLocatorFactory().locatorFor(
      `${await this.panelSelector()} .oge-calendar-view-label`,
    )();
    return ogeCleanText(await title.text());
  }

  /** Shows the next month (opens the picker first). */
  async nextMonth(): Promise<void> {
    const [, next] = await this.documentRootLocatorFactory().locatorForAll(
      `${await this.panelSelector()} .oge-calendar-nav`,
    )();
    await next.click();
  }

  /** Shows the previous month (opens the picker first). */
  async previousMonth(): Promise<void> {
    const [previous] = await this.documentRootLocatorFactory().locatorForAll(
      `${await this.panelSelector()} .oge-calendar-nav`,
    )();
    await previous.click();
  }

  /**
   * Opens the picker and clicks a day of the month on show (days of the
   * adjacent months are skipped). A date-only box commits and closes; a
   * date-time box keeps the picker open for the time.
   */
  async selectDay(day: number): Promise<void> {
    const cells = await this.documentRootLocatorFactory().locatorForAll(
      `${await this.panelSelector()} .oge-calendar-cell[role="gridcell"]:not(.oge-calendar-cell-other)`,
    )();
    for (const cell of cells) {
      if (ogeCleanText(await cell.text()) === String(day)) {
        if (await cell.getProperty<boolean>('disabled')) {
          throw Error(`OgeDateBoxHarness: day ${day} is disabled`);
        }
        return cell.click();
      }
    }
    throw Error(`OgeDateBoxHarness: no day ${day} in the month on show`);
  }

  /** Selector of the open popup, from the combobox's `aria-controls`. */
  private async panelSelector(): Promise<string> {
    await this.open();
    const id = await (await this.native()).getAttribute('aria-controls');
    if (!id) throw Error('OgeDateBoxHarness: the picker did not open');
    return `[id="${id}"]`;
  }
}
