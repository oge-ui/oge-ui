import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * G4a depth: masked date entry, the 12h/seconds time picker with Today/Now,
 * date range presets + time ranges, and number-box live formatting / wheel —
 * in both render layers (the React view is the same route with
 * `?framework=react`; the demos mirror each other section for section).
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, heading: string) =>
  page.locator('app-demo-card', {
    has: page.getByRole('heading', { name: heading, exact: true }),
  });

for (const layer of LAYERS) {
  test.describe(`date & number depth (${layer.name})`, () => {
    test('masked date entry fills locale segments and commits on blur', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/date-box${layer.query}`);
      const demo = card(page, 'Masked entry');
      const input = demo
        .locator('.oge-date-box', { hasText: 'Invoice date' })
        .locator('.oge-input-native');
      await input.focus();
      await expect(input).toHaveValue('dd.mm.yyyy');
      await page.keyboard.type('24032026');
      await expect(input).toHaveValue('24.03.2026');
      await page.keyboard.press('ArrowLeft'); // year → month segment
      await page.keyboard.press('ArrowUp'); // month 03 → 04
      await expect(input).toHaveValue('24.04.2026');
      await page.keyboard.press('Tab');
      await expect(demo.getByTestId('mask-date-value')).toHaveText(
        'Fri Apr 24 2026',
      );
    });

    test('12-hour time columns with seconds, AM/PM and a Now button', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/date-box${layer.query}`);
      const field = card(page, 'Clock, seconds & shortcuts').locator(
        '.oge-date-box',
        { hasText: 'Departure' },
      );
      await field.locator('.oge-input-dropdown').click();
      const panel = page.locator('.oge-date-box-panel');
      await expect(panel).toBeVisible();
      const columns = panel.locator('.oge-date-box-col');
      await expect(columns).toHaveCount(4);
      await expect(columns.nth(3)).toHaveAttribute('aria-label', 'AM/PM');
      await columns
        .nth(3)
        .locator('.oge-date-box-time', { hasText: 'AM' })
        .click();
      await expect(field.locator('.oge-input-native')).toHaveValue(
        /6:45:00\sAM/,
      );
      await expect(panel.locator('.oge-date-box-now')).toBeVisible();
      await expect(panel.locator('.oge-date-box-today')).toHaveCount(0);
    });

    test('range presets commit and read pressed; time ranges need no calendar', async ({
      page,
    }) => {
      await page.goto(`/components/inputs/date-box${layer.query}`);
      const demo = card(page, 'Range presets & time ranges');
      const report = demo.locator('.oge-date-range-box', {
        hasText: 'Report period',
      });
      await report.locator('.oge-input-dropdown').click();
      const panel = page.locator('.oge-date-box-panel');
      const group = panel.getByRole('group', { name: 'Quick ranges' });
      await expect(group).toBeVisible();
      await group.getByRole('button', { name: 'Last 7 days' }).click();
      await expect(panel).toBeHidden();
      await expect(demo.getByTestId('preset-range-value')).not.toHaveText(/—/);
      await report.locator('.oge-input-dropdown').click();
      await expect(
        panel.getByRole('button', { name: 'Last 7 days' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Escape');

      const hours = demo.locator('.oge-date-range-box', {
        hasText: 'Opening hours',
      });
      await hours.locator('.oge-input-dropdown').click();
      await expect(panel).toBeVisible();
      await expect(panel.locator('.oge-calendar')).toHaveCount(0);
      await expect(panel.locator('.oge-date-range-time-col')).toHaveCount(2);
    });

    test('has no axe violations with the preset picker open', async ({
      page,
    }) => {
      test.slow();
      await page.goto(`/components/inputs/date-box${layer.query}`);
      await card(page, 'Range presets & time ranges')
        .locator('.oge-date-range-box', { hasText: 'Report period' })
        .locator('.oge-input-dropdown')
        .click();
      await expect(page.locator('.oge-date-range-presets')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('.oge-popup')
        .include('.oge-input')
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });

    test('number box groups live, caps decimals and steps on the wheel', async ({
      page,
    }) => {
      await page.goto(`/components/inputs${layer.query}`);
      const demo = card(page, 'Number entry');
      const budget = demo
        .locator('.oge-number-box', { hasText: 'Budget' })
        .locator('.oge-input-native');
      await budget.focus();
      await expect(budget).toHaveValue('1,234,567.5');
      await budget.selectText();
      await page.keyboard.type('9876543.219');
      await expect(budget).toHaveValue('9,876,543.21');
      await page.keyboard.press('Tab');
      await expect(budget).toHaveValue('€9,876,543.21');
      await expect(demo.getByTestId('number-live-value')).toHaveText(
        '9876543.21',
      );

      const quantity = demo
        .locator('.oge-number-box', { hasText: 'Quantity' })
        .locator('.oge-input-native');
      // not focused: the wheel belongs to the page (the Tab above may have
      // landed on this field — blur it first)
      await quantity.evaluate((el) => (el as HTMLElement).blur());
      await quantity.hover();
      await page.mouse.wheel(0, -100);
      await expect(demo.getByTestId('number-wheel-value')).toHaveText('10');
      await quantity.focus();
      await quantity.hover();
      await page.mouse.wheel(0, -100);
      await expect(demo.getByTestId('number-wheel-value')).toHaveText('11');
    });
  });
}
