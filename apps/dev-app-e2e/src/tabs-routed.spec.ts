import { test, expect } from '@playwright/test';

test('routed tabs deep-link, navigate and follow browser Back', async ({
  page,
}) => {
  await page.goto('/components/tabs/routed/members');
  const strip = page.locator('.oge-tabs').first();
  await expect(strip.getByRole('tab', { name: /Members/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await strip.getByRole('tab', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/components\/tabs\/routed\/settings$/);
  await expect(page.getByText('browser Back/Forward')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/components\/tabs\/routed\/members$/);
  await expect(strip.getByRole('tab', { name: /Members/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('the bare routed URL redirects to the first tab', async ({ page }) => {
  await page.goto('/components/tabs/routed');
  await expect(page).toHaveURL(/\/components\/tabs\/routed\/overview$/);
  await expect(
    page.locator('.oge-tabs').first().getByRole('tab', { name: 'Overview' }),
  ).toHaveAttribute('aria-selected', 'true');
});
