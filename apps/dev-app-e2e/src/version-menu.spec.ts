import { test, expect } from '@playwright/test';

test('the version menu opens the same page on an archived version', async ({
  page,
}) => {
  // The archive is a separate deployment; answer it locally so the test
  // checks the URL the menu builds, not the network.
  await page.route('https://v0-13.ogeui.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>archived</h1>' }),
  );
  await page.goto('/components/data-grid?tab=api');

  const menu = page.getByRole('combobox', { name: 'Documentation version' });
  await expect(menu).toHaveValue(/\(latest\)/);
  await menu.click();
  await page.getByRole('option', { name: '0.13' }).click();

  await expect(page).toHaveURL(
    'https://v0-13.ogeui.com/components/data-grid?tab=api',
  );
});
