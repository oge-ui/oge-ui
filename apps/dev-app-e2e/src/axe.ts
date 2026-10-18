import Base from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Waits until the docs header's deferred controls are complete. The version
 * menu and theme select are `@defer (on idle)`: a deferred view reaches the
 * DOM a tick before its first change detection, so a select can briefly lack
 * its bound `id` / `aria-label` — and axe gathers asynchronously, so it can
 * audit one in that window (`label`, `aria-required-attr`). Pages without the
 * header settle at once; a header that never settles is left for axe to
 * report.
 */
export async function settleDocsHeader(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () =>
        !document.querySelector(
          '.app-theme-placeholder, .app-version-placeholder',
        ) &&
        [...document.querySelectorAll('[role="combobox"]')].every(
          (el) =>
            el.id !== '' &&
            el.hasAttribute('aria-expanded') &&
            (el.hasAttribute('aria-label') ||
              el.hasAttribute('aria-labelledby') ||
              (el as HTMLInputElement).labels?.length),
        ),
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}

/**
 * `@axe-core/playwright`'s builder, settling the docs header before every
 * audit. Specs import this instead of the package so no audit can race the
 * deferred header.
 */
export default class AxeBuilder extends Base {
  private readonly auditedPage: Page;

  constructor(options: ConstructorParameters<typeof Base>[0]) {
    super(options);
    this.auditedPage = options.page;
  }

  override async analyze(): ReturnType<Base['analyze']> {
    await settleDocsHeader(this.auditedPage);
    return super.analyze();
  }
}
