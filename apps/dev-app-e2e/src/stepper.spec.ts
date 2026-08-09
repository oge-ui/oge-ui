import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The ARIA decision is the point of this component, and it is the part jsdom
 * cannot prove end to end. The step-flow arithmetic is unit-tested separately.
 */
test('the stepper is a list of buttons with aria-current, never a tablist', async ({
  page,
}) => {
  await page.goto('/components/stepper');
  const stepper = page.locator('app-demo-card:has(#commands) oge-stepper');

  await expect(stepper.locator('.oge-stepper-list')).toHaveRole('list');
  await expect(stepper.locator('[role="tablist"]')).toHaveCount(0);
  await expect(stepper.locator('[role="tab"]')).toHaveCount(0);
  await expect(stepper.locator('[aria-selected]')).toHaveCount(0);
  // exactly one current step
  await expect(stepper.locator('[aria-current="step"]')).toHaveCount(1);
});

test('the built-in bar advances and becomes Finish on the last step', async ({
  page,
}) => {
  await page.goto('/components/stepper');
  const card = page.locator('app-demo-card:has(#commands)');
  const next = card.locator('.oge-stepper-nav-next');
  const headers = card.locator('.oge-stepper-header');

  await next.scrollIntoViewIfNeeded();
  await expect(headers.nth(0)).toHaveAttribute('aria-current', 'step');

  await next.click();
  await expect(headers.nth(1)).toHaveAttribute('aria-current', 'step');
  await next.click();
  await expect(headers.nth(2)).toHaveAttribute('aria-current', 'step');
  await expect(next).toHaveText('Finish');
});

test('linear refuses a move and says why', async ({ page }) => {
  await page.goto('/components/stepper');
  const card = page.locator('app-demo-card:has(#linear-flow)');
  const headers = card.locator('.oge-stepper-header');

  await headers.first().scrollIntoViewIfNeeded();
  // step 1 is incomplete, so step 3 is out of reach and says so
  await expect(headers.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await headers.nth(2).click({ force: true });
  await expect(headers.nth(0)).toHaveAttribute('aria-current', 'step');
  await expect(card.locator('p').last()).toContainText('linear');

  // completing step 1 opens the NEXT step only — step 3 still waits on step 2
  await card.getByRole('checkbox', { name: 'Account is complete' }).check();
  await expect(headers.nth(1)).not.toHaveAttribute('aria-disabled', /.*/);
  await expect(headers.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await headers.nth(1).click();
  await expect(headers.nth(1)).toHaveAttribute('aria-current', 'step');
});

test('the form wrapper derives step completion from the form errors', async ({
  page,
}) => {
  await page.goto('/components/stepper');
  const card = page.locator('app-demo-card:has(#inside-a-form)');
  const next = card.locator('.oge-stepper-nav-next');
  const headers = card.locator('.oge-stepper-header');

  await next.scrollIntoViewIfNeeded();
  // the required e-mail is empty, so linear holds the user on step 1
  await next.click();
  await expect(headers.nth(0)).toHaveAttribute('aria-current', 'step');

  await card.getByLabel('E-mail').fill('a@b.co');
  await next.click();
  await expect(headers.nth(1)).toHaveAttribute('aria-current', 'step');
});

test('stepper page has no axe violations (light and dark)', async ({
  page,
}) => {
  await page.goto('/components/stepper');
  // the route is lazy: wait for a real stepper before handing axe an include
  await expect(page.locator('oge-stepper').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-stepper')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});
