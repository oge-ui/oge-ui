import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

async function rectOf(locator: Locator) {
  const rect = await locator.boundingBox();
  expect(rect).not.toBeNull();
  return rect ?? { x: 0, y: 0, width: 0, height: 0 };
}

/** iPhone 12–15 class viewport — below the 600px adaptive breakpoint. */
const MOBILE = { width: 390, height: 844 };

const FRAMEWORKS = [
  { name: 'Angular', suffix: '' },
  { name: 'React', suffix: '?framework=react' },
] as const;

async function openAdaptiveDemo(page: Page, suffix: string) {
  await page.setViewportSize(MOBILE);
  await page.goto(`/components/inputs/select-box${suffix}`);
  const demo = page.locator('[data-demo="adaptive"]');
  await demo.scrollIntoViewIfNeeded();
  await expect(demo).toBeVisible();
  return demo;
}

for (const fw of FRAMEWORKS) {
  test.describe(`adaptive popups — ${fw.name}`, () => {
    test('select box: bottom sheet with a search field, commit and focus restore', async ({
      page,
    }) => {
      const demo = await openAdaptiveDemo(page, fw.suffix);
      const field = demo
        .locator('.oge-select-box', { hasText: 'City' })
        .locator('.oge-input-native');
      await field.click();

      const sheet = page.getByRole('dialog', { name: 'City' });
      await expect(sheet).toBeVisible();
      // a full-width sheet pinned to the bottom edge
      const box = await rectOf(sheet);
      expect(box.width).toBeGreaterThanOrEqual(MOBILE.width - 2);
      expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(
        MOBILE.height - 2,
      );
      await expect(sheet.getByRole('button', { name: 'Close' })).toBeVisible();

      const search = sheet.getByRole('combobox', { name: 'Search' });
      await expect(search).toBeFocused();
      // 16px text: no iOS focus zoom
      expect(
        await search.evaluate((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
      await search.fill('lis');
      await expect(sheet.getByRole('option')).toHaveCount(1);
      await search.press('Enter');

      await expect(sheet).toBeHidden();
      await expect(field).toHaveValue('Lisbon');
      await expect(field).toBeFocused();
    });

    test('select box: Escape and the close button dismiss; axe is clean while open', async ({
      page,
    }) => {
      const demo = await openAdaptiveDemo(page, fw.suffix);
      const field = demo
        .locator('.oge-select-box', { hasText: 'City' })
        .locator('.oge-input-native');
      await field.click();
      const sheet = page.getByRole('dialog', { name: 'City' });
      await expect(sheet).toBeVisible();

      const results = await new AxeBuilder({ page })
        .include('.oge-popup-adaptive')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(field).toBeFocused();

      await field.click();
      await expect(sheet).toBeVisible();
      await sheet.getByRole('button', { name: 'Close' }).click();
      await expect(sheet).toBeHidden();
    });

    test('tag box: picks keep the sheet open, Done closes it', async ({
      page,
    }) => {
      const demo = await openAdaptiveDemo(page, fw.suffix);
      const tagBox = demo.locator('.oge-tag-box', { hasText: 'Skills' });
      await tagBox.locator('.oge-input-native').click();
      const sheet = page.getByRole('dialog', { name: 'Skills' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('option', { name: 'Signals' }).click();
      await sheet.getByRole('option', { name: 'Vitest' }).click();
      await expect(sheet).toBeVisible();
      await sheet.getByRole('button', { name: 'Done' }).click();
      await expect(sheet).toBeHidden();
      await expect(tagBox.locator('.oge-tag')).toHaveCount(2);
    });

    test('date box: a full-screen dialog that picks a day', async ({
      page,
    }) => {
      const demo = await openAdaptiveDemo(page, fw.suffix);
      const field = demo
        .locator('.oge-date-box', { hasText: 'Due date' })
        .locator('.oge-input-native');
      await field.click();
      const dialog = page.getByRole('dialog', { name: 'Due date' });
      await expect(dialog).toBeVisible();
      const box = await rectOf(dialog);
      expect(box.width).toBeGreaterThanOrEqual(MOBILE.width - 2);
      expect(box.height).toBeGreaterThanOrEqual(MOBILE.height - 2);
      // 44px touch targets in the day grid
      const day = dialog
        .locator('.oge-calendar-cell:not(.oge-calendar-cell-other)')
        .nth(10);
      expect((await rectOf(day)).height).toBeGreaterThanOrEqual(43.5);
      await day.click();
      await expect(dialog).toBeHidden();
      await expect(field).not.toHaveValue('');
    });
  });

  test.describe(`grid adaptive detail — ${fw.name}`, () => {
    test('hidden columns stay reachable through the row toggle', async ({
      page,
    }) => {
      await page.setViewportSize(MOBILE);
      await page.goto(`/components/data-grid/columns${fw.suffix}`);
      const demo = page.locator('[data-demo="adaptive-grid"]');
      await demo.scrollIntoViewIfNeeded();
      const row = demo.locator('.oge-row').first();
      await expect(row).toBeVisible();
      // Salary (priority 0) is hidden on a 390px page
      await expect(
        demo.locator('.oge-header-caption', { hasText: 'Salary' }),
      ).toHaveCount(0);
      const toggle = row.getByRole('button', { name: 'Show hidden columns' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const detail = row.locator('.oge-adaptive-detail');
      await expect(detail).toBeVisible();
      await expect(detail.locator('dt', { hasText: 'Salary' })).toBeVisible();
      await expect(detail.locator('dd').last()).toHaveText(
        /^\s*\$[\d,]+\.\d\d\s*$/,
      );

      const results = await new AxeBuilder({ page })
        .include('[data-demo="adaptive-grid"]')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);

      // keyboard: the toggle is a real button
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(detail).toBeHidden();
    });
  });
}
