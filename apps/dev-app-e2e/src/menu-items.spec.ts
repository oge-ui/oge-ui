import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * Checkbox, radio and header rows of the canonical menu item (WAI-ARIA APG
 * menu pattern), exercised through the menubar page's "Radio & checkbox
 * items" demo in both render layers: roles and `aria-checked`, the radio
 * group rule, Space keeping the menu open, headers labelling a `role="group"`
 * and being skipped by the keyboard.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const DEMO = 'app-demo-card:has(#radio-checkbox-items)';

for (const layer of LAYERS) {
  test.describe(`menu checkbox / radio / header rows (${layer.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/menubar${layer.query}`);
      const demo = page.locator(DEMO);
      await demo.scrollIntoViewIfNeeded();
      await expect(demo.locator('[role="menubar"]')).toBeVisible();
    });

    test('renders menuitemradio / menuitemcheckbox rows and labelled groups', async ({
      page,
    }) => {
      const demo = page.locator(DEMO);
      await demo.locator('[role="menuitem"]', { hasText: 'View' }).click();
      const menu = page.locator('.oge-menu-list').first();
      await expect(menu).toBeVisible();

      await expect(menu.locator('[role="menuitemradio"]')).toHaveCount(3);
      await expect(menu.locator('[role="menuitemcheckbox"]')).toHaveCount(3);
      await expect(
        menu.getByRole('menuitemradio', { name: 'Grid' }),
      ).toHaveAttribute('aria-checked', 'true');
      await expect(
        menu.getByRole('menuitemcheckbox', { name: 'Hidden files' }),
      ).toHaveAttribute('aria-checked', 'false');

      // each header labels its section as a group; it is not a menu item
      const layout = menu.getByRole('group', { name: 'Layout' });
      await expect(layout.locator('[role="menuitemradio"]')).toHaveCount(3);
      await expect(
        menu
          .getByRole('group', { name: 'Show' })
          .locator('[role="menuitemcheckbox"]'),
      ).toHaveCount(3);
      await expect(menu.locator('.oge-menu-header')).toHaveCount(2);
      await expect(
        menu.locator('.oge-menu-header').first(),
      ).not.toHaveAttribute('tabindex', /.*/);

      const results = await new AxeBuilder({ page })
        .include('.oge-popup')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test('the keyboard skips headers, Space toggles without closing', async ({
      page,
    }) => {
      const demo = page.locator(DEMO);
      const view = demo.locator('[role="menuitem"]', { hasText: 'View' });
      await view.focus();
      await page.keyboard.press('ArrowDown');
      const menu = page.locator('.oge-menu-list').first();
      await expect(menu).toBeFocused();
      const active = async () => {
        const id = await menu.getAttribute('aria-activedescendant');
        return id
          ? ((await page.locator(`[id="${id}"]`).textContent()) ?? '').trim()
          : null;
      };
      // the "Layout" header is skipped — the first row is Grid
      await expect.poll(active).toBe('Grid');
      await page.keyboard.press('ArrowDown');
      await expect.poll(active).toBe('List');

      // Space checks the radio and keeps the menu open (APG)
      await page.keyboard.press(' ');
      await expect(menu).toBeVisible();
      await expect(
        menu.getByRole('menuitemradio', { name: 'List' }),
      ).toHaveAttribute('aria-checked', 'true');
      await expect(
        menu.getByRole('menuitemradio', { name: 'Grid' }),
      ).toHaveAttribute('aria-checked', 'false');
      await expect.poll(active).toBe('List');

      // ArrowDown crosses the separator and the "Show" header
      await page.keyboard.press('ArrowDown'); // Details
      await page.keyboard.press('ArrowDown'); // Status bar
      await expect.poll(active).toBe('Status bar');
      await page.keyboard.press(' ');
      await expect(
        menu.getByRole('menuitemcheckbox', { name: 'Status bar' }),
      ).toHaveAttribute('aria-checked', 'false');

      // type-ahead never lands on a header ("S" → Status bar, not "Show")
      await page.keyboard.press('Home');
      await page.keyboard.press('s');
      await expect.poll(active).toBe('Status bar');

      // Enter toggles and closes
      await page.keyboard.press('ArrowDown'); // Hidden files
      await page.keyboard.press('Enter');
      await expect(page.locator('.oge-menu-list')).toHaveCount(0);
      await expect(
        demo.locator('[data-testid="menubar-check-state"]'),
      ).toContainText('List · Hidden files');
    });

    test('a keepOpen row stays open on a click', async ({ page }) => {
      const demo = page.locator(DEMO);
      await demo.locator('[role="menuitem"]', { hasText: 'View' }).click();
      const menu = page.locator('.oge-menu-list').first();
      const wrap = menu.getByRole('menuitemcheckbox', { name: 'Word wrap' });
      await wrap.click();
      await expect(menu).toBeVisible();
      await expect(wrap).toHaveAttribute('aria-checked', 'true');
      // a plain checkbox row closes on a click
      await menu
        .getByRole('menuitemcheckbox', { name: 'Hidden files' })
        .click();
      await expect(page.locator('.oge-menu-list')).toHaveCount(0);
    });
  });
}
