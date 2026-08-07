import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('toggle controls page', () => {
  test('check box, switch and radio group toggle with correct aria state', async ({
    page,
  }) => {
    await page.goto('/components/inputs/toggle-controls');

    // check box: click toggles; tri-state demo starts indeterminate (mixed)
    const agree = page.locator('oge-check-box', { hasText: 'I agree' });
    await agree.click();
    await expect(agree.locator('.oge-check-box-input')).toBeChecked();
    const triState = page.locator('oge-check-box', { hasText: 'Select all' });
    await expect(triState.locator('.oge-check-box-input')).toHaveJSProperty(
      'indeterminate',
      true,
    );
    await triState.click(); // null → true
    await expect(triState.locator('.oge-check-box-input')).toBeChecked();

    // switch: role=switch flips aria-checked and shows the ON text
    const notify = page.locator('oge-switch .oge-switch-button').first();
    await expect(notify).toHaveAttribute('aria-checked', 'true');
    await notify.click();
    await expect(notify).toHaveAttribute('aria-checked', 'false');

    // radio group: arrows move focus and selection, skipping disabled
    const group = page.locator('oge-radio-group', { hasText: 'Starter' });
    await group.locator('.oge-radio', { hasText: 'Team' }).click();
    await expect(page.getByText('plan:')).toContainText('team');
    await group.locator('.oge-radio', { hasText: 'Team' }).press('ArrowDown');
    // "Scale (sold out)" is disabled → lands on Enterprise
    await expect(page.getByText('plan:')).toContainText('enterprise');
  });

  test('has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/components/inputs/toggle-controls');
    await expect(page.locator('.oge-radio-group').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('.oge-check-box')
      .include('.oge-switch')
      .include('.oge-radio-group')
      .disableRules(['color-contrast'])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
