import { expect, test } from '@playwright/test';

/** The routed demo: the trail is computed from the URL, tabs-routed style. */

test('deep link renders the full trail with the last crumb current', async ({
  page,
}) => {
  await page.goto('/components/breadcrumb/routed/reports/monthly');
  const nav = page
    .locator('app-breadcrumb-routed nav.oge-breadcrumb-nav')
    .first();
  const crumbs = nav.locator('.oge-breadcrumb-item');
  await expect(crumbs).toHaveCount(3); // Routed demo / reports / monthly
  await expect(crumbs.last()).toContainText('monthly');
  await expect(crumbs.last()).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('app-breadcrumb-routed-monthly')).toBeVisible();
});

test('navigating deeper grows the trail; clicking a crumb walks back', async ({
  page,
}) => {
  await page.goto('/components/breadcrumb/routed');
  await expect(page).toHaveURL(/\/routed\/reports$/); // bare URL redirects
  const nav = page
    .locator('app-breadcrumb-routed nav.oge-breadcrumb-nav')
    .first();
  await expect(nav.locator('.oge-breadcrumb-item')).toHaveCount(2);

  await page.getByRole('link', { name: 'Monthly' }).click();
  await expect(page).toHaveURL(/\/reports\/monthly$/);
  await expect(nav.locator('.oge-breadcrumb-item')).toHaveCount(3);

  // Crumbs are real links the router intercepts.
  await nav.locator('.oge-breadcrumb-item', { hasText: 'reports' }).click();
  await expect(page).toHaveURL(/\/routed\/reports$/);
  await expect(nav.locator('.oge-breadcrumb-item')).toHaveCount(2);

  await page.goBack();
  await expect(page).toHaveURL(/\/reports\/monthly$/);
  await expect(nav.locator('.oge-breadcrumb-item')).toHaveCount(3);
});
