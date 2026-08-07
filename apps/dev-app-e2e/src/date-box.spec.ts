import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('date editors page', () => {
  test('calendar selects a day; date box parses text and picks from the popup', async ({
    page,
  }) => {
    await page.goto('/components/inputs/date-box');

    // standalone calendar: click a day, the bound value updates
    const calendar = page.locator('oge-calendar').first();
    await calendar
      .locator('.oge-calendar-cell:not(.oge-calendar-cell-other)', {
        hasText: '20',
      })
      .first()
      .click();
    await expect(page.getByText('value:')).toContainText('Aug 20 2026');

    // date box: typed text commits on Enter (en-US default locale is fine)
    const dateBox = page.locator('oge-date-box', { hasText: 'Start date' });
    const input = dateBox.locator('.oge-input-native');
    await input.fill('8/6/2026');
    await input.press('Enter');
    await expect(input).toHaveValue(/8\/6\/(20)?26/);

    // popup pick: focus hands off to the calendar dialog, Esc restores
    await dateBox.locator('.oge-input-dropdown').click();
    const dialog = page.locator('.oge-date-box-panel');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-focus-target]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(input).toBeFocused();
  });

  test('has no axe violations with an open date picker', async ({ page }) => {
    test.slow();
    await page.goto('/components/inputs/date-box');
    const dateBox = page.locator('oge-date-box', { hasText: 'Start date' });
    await dateBox.locator('.oge-input-dropdown').click();
    await expect(page.locator('.oge-date-box-panel')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('.oge-calendar')
      .include('.oge-input')
      .include('.oge-popup')
      .disableRules(['color-contrast'])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
