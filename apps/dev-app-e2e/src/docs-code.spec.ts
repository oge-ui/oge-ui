import { test, expect } from '@playwright/test';

test('served code tabs render highlighted source with exact text fidelity', async ({
  page,
}) => {
  await page.goto('/components/data-grid/sorting');
  await expect(page.locator('.oge-row').first()).toBeVisible();

  await page.getByRole('button', { name: 'Code', exact: true }).click();
  const code = page.locator('.code-pre code').first();
  await expect(code).toBeVisible();

  // token spans exist (syntax highlighting is live)
  expect(await code.locator('span[class^="tok-"]').count()).toBeGreaterThan(5);

  // text fidelity: tricky substrings survive char-for-char
  await expect(code).toContainText(
    '[paging]="{ pageSize: 15, pageSizes: [15, 25, 50] }"',
  );
  await expect(code).toContainText(
    '[sorting]="{ mode: \'multi\', allowUnsorting: true }"',
  );

  // no private-use placeholder characters may ever reach the DOM,
  // and line numbers match the rendered line count
  const text = await code.evaluate((el) => el.textContent ?? '');
  expect(/[\uE000-\uF8FF]/.test(text)).toBe(false);
  const lines = text.split('\n').length;
  await expect(page.locator('.line-numbers div').first()).toHaveText('1');
  expect(await page.locator('.line-numbers div').count()).toBe(lines);
});
