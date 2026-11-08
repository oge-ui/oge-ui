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
 *
 * Only the shell header's own controls count. A page's comboboxes need not
 * carry an id — an open adaptive sheet's search field has none — and
 * waiting on them held every audit of such a page for the full timeout,
 * which ate a slow WebKit run's whole test budget.
 */
export async function settleDocsHeader(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const header = document.querySelector('app-root > header');
        if (!header) return true;
        return (
          !header.querySelector(
            '.app-theme-placeholder, .app-version-placeholder',
          ) &&
          [...header.querySelectorAll('[role="combobox"]')].every(
            (el) =>
              el.id !== '' &&
              el.hasAttribute('aria-expanded') &&
              (el.hasAttribute('aria-label') ||
                el.hasAttribute('aria-labelledby') ||
                (el as HTMLInputElement).labels?.length),
          )
        );
      },
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}

/**
 * Waits for every finite CSS animation and transition on the page to finish.
 * An element that is still fading in (the search palette's 120 ms entrance,
 * a menu's scale-in) is audited at partial opacity otherwise, and axe then
 * reports `color-contrast` on every text node inside it — a slow WebKit run
 * hit that window night after night. Infinite animations (spinners) are
 * skipped, and the wait gives up after 5 s so a stuck one cannot hang a test.
 */
export async function settleAnimations(page: Page): Promise<void> {
  await page
    .evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect?.getComputedTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished.catch(() => undefined)),
        ),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]),
    )
    .catch(() => undefined);
}

/**
 * `@axe-core/playwright`'s builder, settling the docs header and any running
 * entrance animation before every audit. Specs import this instead of the
 * package so no audit can race the deferred header or a fade-in.
 */
export default class AxeBuilder extends Base {
  private readonly auditedPage: Page;

  constructor(options: ConstructorParameters<typeof Base>[0]) {
    super(options);
    this.auditedPage = options.page;
  }

  override async analyze(): ReturnType<Base['analyze']> {
    await settleDocsHeader(this.auditedPage);
    await settleAnimations(this.auditedPage);
    return super.analyze();
  }
}
