import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The docs shell's "Skip to content" link (WCAG 2.4.1), in both framework
 * modes: it is the first Tab stop, it shows while focused, Enter moves focus
 * to the main region without leaving the page, and the shell passes axe.
 */
test.use({ locale: 'en-US', timezoneId: 'UTC' });

for (const layer of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const) {
  test(`${layer.name}: the first Tab focuses the skip link and Enter moves to main`, async ({
    page,
  }) => {
    await page.goto(`/components/tabs${layer.query}`);
    const main = page.locator('main#main-content');
    await expect(main).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('.oge-tab').first()).toBeVisible();
    // the client app is live: the header's theme select is an idle @defer
    await expect(
      page.locator('oge-select-box.app-theme-select'),
    ).toBeAttached();

    const skip = page.getByRole('link', { name: 'Skip to content' });
    // off-screen until focused
    await expect
      .poll(async () => (await skip.boundingBox())?.y ?? 0)
      .toBeLessThan(0);

    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect
      .poll(async () => (await skip.boundingBox())?.y ?? -1)
      .toBeGreaterThanOrEqual(0);
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(main).toBeFocused();
    // focus moved in place: same page, no router navigation
    await expect(page).toHaveURL(/\/components\/tabs/);
    // the next Tab continues inside the main region
    await page.keyboard.press('Tab');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getElementById('main-content')
              ?.contains(document.activeElement) ?? false,
        ),
      )
      .toBe(true);
  });
}

test('the shell with the focused skip link passes axe', async ({ page }) => {
  await page.goto('/components/tabs');
  await expect(page.locator('.oge-tab').first()).toBeVisible();
  // the client app is live: the header's theme select is an idle @defer
  await expect(page.locator('oge-select-box.app-theme-select')).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  const results = await new AxeBuilder({ page })
    .include('.app-skip-link')
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
