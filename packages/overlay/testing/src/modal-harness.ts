import {
  ContentContainerComponentHarness,
  HarnessPredicate,
  TestKey,
  type BaseHarnessFilters,
  type HarnessLoader,
  type TestElement,
} from '@angular/cdk/testing';

/** Filters for {@link OgeModalHarness.with}. */
export interface OgeModalHarnessFilters extends BaseHarnessFilters {
  /** Only modals whose title (or `aria-label`) matches. */
  title?: string | RegExp;
  /** Only open (`true`) or closed (`false`) modals. */
  open?: boolean;
}

/** Trimmed, whitespace-collapsed text — what a reader sees. */
const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Harness for `oge-modal` — the declarative modal and every modal
 * `OgeModalService` opens (alert / confirm / prompt dialogs included).
 *
 * The service renders its modals into `document.body`, outside the
 * fixture: find those with
 * `TestbedHarnessEnvironment.documentRootLoader(fixture)`.
 *
 * ```ts
 * const root = TestbedHarnessEnvironment.documentRootLoader(fixture);
 * const dialog = await root.getHarness(OgeModalHarness.with({ title: 'Delete row?' }));
 * expect(await dialog.getButtonTexts()).toEqual(['Cancel', 'Delete']);
 * await dialog.clickButton('Delete');
 * expect(await dialog.isOpen()).toBe(false);
 * ```
 *
 * It is a content container: `getHarness()` on it searches the modal's
 * panel, so the editors inside a modal form are one call away.
 */
export class OgeModalHarness extends ContentContainerComponentHarness<string> {
  static hostSelector = 'oge-modal';

  static with(
    options: OgeModalHarnessFilters = {},
  ): HarnessPredicate<OgeModalHarness> {
    return new HarnessPredicate(OgeModalHarness, options)
      .addOption('title', options.title, (harness, title) =>
        HarnessPredicate.stringMatches(harness.getTitle(), title),
      )
      .addOption(
        'open',
        options.open,
        async (harness, open) => (await harness.isOpen()) === open,
      );
  }

  private readonly panel = this.locatorForOptional('.oge-modal');
  private readonly layer = this.locatorForOptional('.oge-modal-layer');
  private readonly titleEl = this.locatorForOptional('.oge-modal-title');
  private readonly body = this.locatorForOptional('.oge-modal-body');
  private readonly closeButton = this.locatorForOptional('.oge-modal-close');
  private readonly actionButtons = this.locatorForAll(
    '.oge-modal-footer button, .oge-modal-body .oge-dialog-actions button',
  );

  /** Whether the modal is open (its panel is rendered). */
  async isOpen(): Promise<boolean> {
    return (await this.panel()) !== null;
  }

  /** The title — the heading's text, or the `aria-label` without one. */
  async getTitle(): Promise<string> {
    const title = await this.titleEl();
    const text = title ? clean(await title.text()) : '';
    if (text) return text;
    const panel = await this.panel();
    return (await panel?.getAttribute('aria-label')) ?? '';
  }

  /** The panel's role: `'dialog'` or `'alertdialog'` (`null` while closed). */
  async getRole(): Promise<string | null> {
    return (await (await this.panel())?.getAttribute('role')) ?? null;
  }

  /** Whether the modal reports `aria-busy`. */
  async isBusy(): Promise<boolean> {
    return (await (await this.panel())?.getAttribute('aria-busy')) === 'true';
  }

  /** Text of the modal body (the projected content). */
  async getContentText(): Promise<string> {
    const body = await this.body();
    return body ? clean(await body.text()) : '';
  }

  /**
   * Labels of the action buttons — the footer's, or a confirm / alert /
   * prompt dialog's — their text, or `aria-label` when empty.
   */
  async getButtonTexts(): Promise<string[]> {
    const buttons = await this.actionButtons();
    return Promise.all(buttons.map((button) => this.buttonLabel(button)));
  }

  /** Clicks the action button whose label matches. */
  async clickButton(label: string | RegExp): Promise<void> {
    const buttons = await this.actionButtons();
    for (const button of buttons) {
      if (
        await HarnessPredicate.stringMatches(this.buttonLabel(button), label)
      ) {
        return button.click();
      }
    }
    const labels = await this.getButtonTexts();
    throw Error(
      `OgeModalHarness: no action button matching ${String(label)} (buttons: ${labels.join(', ')})`,
    );
  }

  /** Clicks the header's close (✕) button — the full close pipeline runs. */
  async close(): Promise<void> {
    const button = await this.closeButton();
    if (!button) throw Error('OgeModalHarness: the modal has no close button');
    return button.click();
  }

  /** Presses Escape inside the modal (`closeOnEscape`). */
  async pressEscape(): Promise<void> {
    const panel = await this.panel();
    if (!panel) throw Error('OgeModalHarness: the modal is not open');
    return panel.sendKeys(TestKey.ESCAPE);
  }

  /** Presses on the backdrop, outside the panel (`closeOnBackdropClick`). */
  async clickBackdrop(): Promise<void> {
    const layer = await this.layer();
    if (!layer) throw Error('OgeModalHarness: the modal is not open');
    // the modal arms the backdrop close on pointerdown; jsdom has no
    // PointerEvent, so the CDK click alone would not send one
    await layer.dispatchEvent('pointerdown');
    return layer.click();
  }

  /** `getHarness()` & co. search the open panel. */
  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    if (!(await this.isOpen())) {
      throw Error('OgeModalHarness: the modal is not open');
    }
    return this.locatorFactory.harnessLoaderFor('.oge-modal');
  }

  private async buttonLabel(button: TestElement): Promise<string> {
    const text = clean(await button.text());
    return text || ((await button.getAttribute('aria-label')) ?? '');
  }
}
